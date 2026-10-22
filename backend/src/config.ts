import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/** Raíz del paquete backend (funciona tanto desde src/ con tsx como desde dist/). */
export const BACKEND_ROOT = path.resolve(here, '..');

const env = process.env;
const isProd = env.NODE_ENV === 'production';

function list(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET es obligatorio en producción.');
  jwtSecret = randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET no definido: se generó uno temporal (las sesiones se invalidan al reiniciar).');
}

export const config = {
  isProd,
  port: Number(env.PORT ?? 4000),
  /** Origen público del frontend (para CORS y redirecciones OAuth). */
  frontendUrl: env.FRONTEND_URL ?? 'http://localhost:5173',
  jwtSecret,
  sessionTtlHours: Number(env.SESSION_TTL_HOURS ?? 8),
  cookieName: 'aig_session',

  /** Archivo del que se extraen los cierres semilla (seed.json canónico). */
  seedHtmlPath: path.resolve(
    BACKEND_ROOT,
    env.SEED_HTML_PATH ?? 'data/seed.json',
  ),
  /** Directorio donde se persisten los cierres cargados vía /api/upload. */
  dataDir: path.resolve(BACKEND_ROOT, env.DATA_DIR ?? './data'),
  maxUploadMb: Number(env.MAX_UPLOAD_MB ?? 25),

  /** Usuarios locales. Formato: email:bcryptHash:rol:Nombre;email2:... (ver README). */
  usersSpec: env.AUTH_USERS,

  google: {
    clientId: env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5173/api/auth/google/callback',
    /** Si se define, solo se aceptan cuentas de estos dominios (p.ej. apoyointegral.com.gt). */
    allowedDomains: list(env.GOOGLE_ALLOWED_DOMAINS),
    /** Habilita el flujo simulado cuando no hay credenciales de Google (por defecto: solo fuera de producción). */
    simulation: env.GOOGLE_SIMULATION ? env.GOOGLE_SIMULATION === 'true' : !isProd,
  },
  /** Correos con rol admin (pueden cargar cierres) al entrar con Google. */
  adminEmails: list(env.ADMIN_EMAILS),
  googleDefaultRole: (env.GOOGLE_DEFAULT_ROLE === 'admin' ? 'admin' : 'analyst') as 'admin' | 'analyst',

  /**
   * Origen de los cierres:
   *  - `file`     → semilla del HTML original + cierres cargados vía /api/upload (comportamiento histórico).
   *  - `database` → SQL Server on-premise (solo lectura). /api/upload queda deshabilitado.
   */
  dataSource: (env.DATA_SOURCE === 'database' ? 'database' : 'file') as 'file' | 'database',

  /** SQL Server. Credenciales y host SOLO desde variables de entorno (sin valores por defecto). */
  db: {
    host: env.DB_HOST ?? '',
    port: int(env.DB_PORT, 1433),
    instanceName: env.DB_INSTANCE || undefined,
    database: env.DB_NAME ?? '',
    user: env.DB_USER ?? '',
    password: env.DB_PASSWORD ?? '',
    /** `true` (TLS sobre TDS 7.x) o `strict` (TDS 8.0, SQL Server 2022+). Nunca se permite desactivar. */
    encrypt: (env.DB_ENCRYPT === 'strict' ? 'strict' : true) as true | 'strict',
    /** Solo para certificados autofirmados en LAN. En producción use DB_CA_CERT_PATH. */
    trustServerCertificate: bool(env.DB_TRUST_SERVER_CERT, false),
    caCertPath: env.DB_CA_CERT_PATH ? path.resolve(BACKEND_ROOT, env.DB_CA_CERT_PATH) : undefined,
    /** Nombre esperado en el certificado (si difiere de la IP, p.ej. srv-core.aig.local). */
    serverName: env.DB_TLS_SERVERNAME || undefined,
    appName: env.DB_APP_NAME ?? 'aig-portfolio-dashboard',
    /** ApplicationIntent=ReadOnly (enruta a réplicas de lectura en Availability Groups). */
    readOnlyIntent: bool(env.DB_READ_ONLY_INTENT, true),
    pool: {
      min: int(env.DB_POOL_MIN, 0),
      max: int(env.DB_POOL_MAX, 10),
      idleTimeoutMillis: int(env.DB_POOL_IDLE_MS, 30_000),
    },
    connectTimeoutMs: int(env.DB_CONNECT_TIMEOUT_MS, 15_000),
    requestTimeoutMs: int(env.DB_REQUEST_TIMEOUT_MS, 120_000),
    /** Reintentos de conexión con backoff exponencial. */
    maxRetries: int(env.DB_MAX_RETRIES, 5),
    retryBaseMs: int(env.DB_RETRY_BASE_MS, 1_000),
    healthIntervalMs: int(env.DB_HEALTH_INTERVAL_MS, 60_000),
    /** Cada cuántos minutos se recargan los cierres desde la BD (0 = solo al arrancar / manual). */
    refreshMinutes: int(env.DB_REFRESH_MINUTES, 15),
    /** Cuántos cierres (más recientes) se cargan en memoria para el motor de cálculo. */
    maxCierres: int(env.DB_MAX_CIERRES, 24),
    /** Objetos de BD (tabla o vista) de los que se lee. Ver README → "Mapeo de esquema". */
    objects: {
      snapshot: env.DB_OBJ_SNAPSHOT ?? 'dbo.vw_dashboard_cartera_cierre',
    },
  },

  /** HTTPS nativo del backend (opcional si hay un reverse proxy con TLS delante). */
  tls: {
    enabled: bool(env.HTTPS_ENABLED, false),
    certPath: env.TLS_CERT_PATH ? path.resolve(BACKEND_ROOT, env.TLS_CERT_PATH) : '',
    keyPath: env.TLS_KEY_PATH ? path.resolve(BACKEND_ROOT, env.TLS_KEY_PATH) : '',
    caPath: env.TLS_CA_PATH ? path.resolve(BACKEND_ROOT, env.TLS_CA_PATH) : '',
  },
} as const;

function int(v: string | undefined, def: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : def;
}

function bool(v: string | undefined, def: boolean): boolean {
  if (v === undefined || v === '') return def;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

export const googleOAuthEnabled = () => Boolean(config.google.clientId && config.google.clientSecret);
