import fs from 'node:fs';
import sql from 'mssql';
import { config } from '../config.js';
import { assertReadOnly } from './readonly.js';

/**
 * Pool de conexiones a SQL Server (on-premise) — SOLO LECTURA, TLS obligatorio.
 *
 *  - Cifrado de transporte siempre activo (`encrypt: true | 'strict'`).
 *  - Validación del certificado del servidor (salvo DB_TRUST_SERVER_CERT=true en LAN de desarrollo).
 *  - Reconexión automática con backoff exponencial + jitter.
 *  - Health-check periódico (`SELECT 1`) que recrea el pool si se pierde.
 *  - Cierre ordenado (`closePool`) para SIGINT/SIGTERM.
 */

export type SqlParam = {
  type: sql.ISqlType | sql.ISqlTypeFactoryWithNoParams | (() => sql.ISqlType);
  value: unknown;
};
export type SqlParams = Record<string, SqlParam>;

export interface DbHealth {
  enabled: boolean;
  connected: boolean;
  encrypted: boolean | null;
  server: string;
  database: string;
  lastCheckAt: string | null;
  lastOkAt: string | null;
  lastError: string | null;
  latencyMs: number | null;
  pool: { size: number; available: number; pending: number; borrowed: number } | null;
}

const log = {
  info: (m: string) => console.log(`[db] ${m}`),
  warn: (m: string) => console.warn(`[db] ${m}`),
  error: (m: string, e?: unknown) => console.error(`[db] ${m}${e ? `: ${errMsg(e)}` : ''}`),
};

/** Nunca registrar credenciales: se limpia cualquier eco de usuario/contraseña. */
function errMsg(e: unknown): string {
  const raw = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  let out = raw;
  if (config.db.password) out = out.split(config.db.password).join('***');
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildConfig(): sql.config {
  const c = config.db;
  const missing = (['host', 'user', 'password', 'database'] as const).filter((k) => !c[k]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno de BD: ${missing.map((k) => `DB_${k === 'database' ? 'NAME' : k.toUpperCase()}`).join(', ')}`);
  }
  const ca = c.caCertPath ? fs.readFileSync(c.caCertPath) : undefined;
  return {
    server: c.host,
    port: c.instanceName ? undefined : c.port,
    database: c.database,
    user: c.user,
    password: c.password,
    connectionTimeout: c.connectTimeoutMs,
    requestTimeout: c.requestTimeoutMs,
    pool: { ...c.pool, acquireTimeoutMillis: c.connectTimeoutMs },
    options: {
      instanceName: c.instanceName,
      encrypt: c.encrypt as boolean, // true | 'strict' (tedious acepta ambos)
      trustServerCertificate: c.trustServerCertificate,
      serverName: c.serverName,
      appName: c.appName,
      readOnlyIntent: c.readOnlyIntent,
      enableArithAbort: true,
      abortTransactionOnError: true,
      useUTC: false, // las fechas de cierre se interpretan en hora local (TZ=America/Guatemala)
      cryptoCredentialsDetails: {
        minVersion: 'TLSv1.2',
        ...(ca ? { ca } : {}),
      },
    },
  };
}

class Database {
  private pool: sql.ConnectionPool | null = null;
  private connecting: Promise<sql.ConnectionPool> | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private closing = false;
  private state: Omit<DbHealth, 'pool' | 'enabled' | 'server' | 'database'> = {
    connected: false,
    encrypted: null,
    lastCheckAt: null,
    lastOkAt: null,
    lastError: null,
    latencyMs: null,
  };

  get enabled() {
    return config.dataSource === 'database';
  }

  /** Obtiene (o crea) el pool conectado, con reintentos y backoff exponencial. */
  async getPool(): Promise<sql.ConnectionPool> {
    if (this.closing) throw new Error('El pool de BD se está cerrando.');
    if (this.pool?.connected) return this.pool;
    if (this.connecting) return this.connecting;
    this.connecting = this.connectWithRetry().finally(() => (this.connecting = null));
    return this.connecting;
  }

  private async connectWithRetry(): Promise<sql.ConnectionPool> {
    const cfg = buildConfig();
    const { maxRetries, retryBaseMs } = config.db;
    let attempt = 0;
    for (;;) {
      attempt++;
      const pool = new sql.ConnectionPool(cfg);
      pool.on('error', (e) => {
        this.state.connected = false;
        this.state.lastError = errMsg(e);
        log.error('Error en el pool', e);
      });
      try {
        await pool.connect();
        await this.disposeCurrent();
        this.pool = pool;
        this.state.connected = true;
        this.state.lastError = null;
        log.info(`Conectado a ${cfg.server}${cfg.port ? `:${cfg.port}` : ''}/${cfg.database} (TLS ${config.db.encrypt === 'strict' ? 'strict/TDS8' : 'on'}, pool ${config.db.pool.min}-${config.db.pool.max}, intento ${attempt})`);
        await this.verifyEncryption();
        return pool;
      } catch (e) {
        this.state.connected = false;
        this.state.lastError = errMsg(e);
        await pool.close().catch(() => undefined);
        if (attempt > maxRetries || this.closing) {
          log.error(`No se pudo conectar tras ${attempt} intento(s)`, e);
          throw e;
        }
        const delay = Math.min(30_000, retryBaseMs * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
        log.warn(`Conexión fallida (intento ${attempt}/${maxRetries + 1}): ${errMsg(e)} — reintento en ${delay} ms`);
        await sleep(delay);
      }
    }
  }

  /** Confirma desde el propio servidor que la sesión viaja cifrada. */
  private async verifyEncryption() {
    try {
      const r = await this.query<{ encrypt_option: string }>(
        'SELECT encrypt_option FROM sys.dm_exec_connections WHERE session_id = @@SPID',
      );
      const enc = r[0]?.encrypt_option;
      this.state.encrypted = enc === undefined ? null : String(enc).toUpperCase() === 'TRUE';
      if (this.state.encrypted === false) log.warn('¡La conexión NO está cifrada según el servidor!');
      else if (this.state.encrypted) log.info('Cifrado de transporte verificado (encrypt_option = TRUE).');
    } catch {
      // Requiere VIEW SERVER STATE; si no se tiene, se confía en la negociación TLS del driver.
      this.state.encrypted = null;
    }
  }

  /**
   * Ejecuta un SELECT parametrizado. Toda consulta pasa por la guardia de solo
   * lectura; los valores SIEMPRE van como parámetros tipados (@nombre), nunca
   * concatenados.
   */
  async query<T = Record<string, unknown>>(text: string, params: SqlParams = {}): Promise<T[]> {
    assertReadOnly(text);
    const pool = await this.getPool();
    const req = pool.request();
    for (const [name, p] of Object.entries(params)) req.input(name, p.type, p.value);
    try {
      const res = await req.query<T>(text);
      return res.recordset ?? [];
    } catch (e) {
      const code = (e as { code?: string }).code;
      // Errores de conexión: marcar pool como caído para forzar reconexión en el siguiente uso.
      if (code === 'ECONNCLOSED' || code === 'ESOCKET' || code === 'ECONNRESET' || code === 'ETIMEOUT') {
        this.state.connected = false;
        await this.disposeCurrent();
      }
      log.error('Error en consulta', e);
      throw e;
    }
  }

  /** Health-check activo: `SELECT 1` con medición de latencia. */
  async ping(): Promise<boolean> {
    const t0 = Date.now();
    this.state.lastCheckAt = new Date().toISOString();
    try {
      await this.query('SELECT 1 AS ok');
      this.state.latencyMs = Date.now() - t0;
      this.state.lastOkAt = new Date().toISOString();
      this.state.connected = true;
      this.state.lastError = null;
      return true;
    } catch (e) {
      this.state.latencyMs = null;
      this.state.connected = false;
      this.state.lastError = errMsg(e);
      return false;
    }
  }

  startHealthChecks() {
    if (this.healthTimer || config.db.healthIntervalMs <= 0) return;
    this.healthTimer = setInterval(() => {
      void this.ping().then((ok) => {
        if (!ok) log.warn(`Health-check fallido: ${this.state.lastError}`);
      });
    }, config.db.healthIntervalMs);
    this.healthTimer.unref();
  }

  health(): DbHealth {
    const p = this.pool as unknown as { size?: number; available?: number; pending?: number; borrowed?: number } | null;
    return {
      enabled: this.enabled,
      server: config.db.host ? `${config.db.host}${config.db.instanceName ? `\\${config.db.instanceName}` : `:${config.db.port}`}` : '',
      database: config.db.database,
      ...this.state,
      pool: p ? { size: p.size ?? 0, available: p.available ?? 0, pending: p.pending ?? 0, borrowed: p.borrowed ?? 0 } : null,
    };
  }

  private async disposeCurrent() {
    const old = this.pool;
    this.pool = null;
    if (old) await old.close().catch(() => undefined);
  }

  /** Cierre ordenado: detiene health-checks y drena el pool. */
  async close() {
    this.closing = true;
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.healthTimer = null;
    if (this.connecting) await this.connecting.catch(() => undefined);
    await this.disposeCurrent();
    this.state.connected = false;
    log.info('Pool cerrado.');
  }
}

export const db = new Database();
export { sql };
