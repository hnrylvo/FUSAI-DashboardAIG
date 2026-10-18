/**
 * Diagnóstico de conexión a SQL Server (100 % SOLO LECTURA).
 *
 *   npm run db:check                 → conectividad TCP, TLS, versión, permisos y salud del pool
 *   npm run db:check -- --discover   → además lista tablas/vistas candidatas y sus columnas
 *   npm run db:check -- --discover=cartera,credito   → filtra por palabras clave
 *
 * Todas las consultas son SELECT sobre vistas de catálogo (sys.*, INFORMATION_SCHEMA).
 */
import net from 'node:net';

process.env.TZ ||= 'America/Guatemala';
// Para descubrir esquema sin conocer aún la BD destino, se usa `master` como base de arranque.
process.env.DB_NAME ||= 'master';
process.env.DB_MAX_RETRIES ??= '0';
process.env.DATA_SOURCE = 'database';

const { config } = await import('../src/config.js');
const { db, sql } = await import('../src/db/pool.js');

const arg = process.argv.find((a) => a.startsWith('--discover'));
const keywords = arg?.includes('=')
  ? arg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
  : ['cartera', 'credit', 'prestamo', 'cliente', 'agencia', 'sucursal', 'asesor', 'gestor', 'cierre', 'saldo', 'mora', 'cuota'];

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m: string) => console.log(`    ${m}`);

function tcpProbe(host: string, port: number, timeout = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const done = (r: boolean) => {
      s.destroy();
      resolve(r);
    };
    s.setTimeout(timeout, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

async function main() {
  const c = config.db;
  console.log('\n🔌 Diagnóstico de conexión SQL Server (solo lectura)\n');
  info(`Host: ${c.host || '(DB_HOST vacío)'}  Puerto: ${c.instanceName ? `instancia ${c.instanceName}` : c.port}  BD: ${c.database}`);
  info(`Usuario: ${c.user || '(DB_USER vacío)'}  Cifrado: ${c.encrypt}  TrustServerCert: ${c.trustServerCertificate}  CA: ${c.caCertPath ?? '—'}`);
  console.log('');

  if (!c.instanceName) {
    if (await tcpProbe(c.host, c.port)) ok(`TCP ${c.host}:${c.port} alcanzable`);
    else {
      bad(`TCP ${c.host}:${c.port} NO alcanzable — revise VPN/LAN, firewall o que SQL Server escuche por TCP (ver README).`);
      process.exitCode = 1;
      return;
    }
  }

  try {
    await db.getPool();
    ok('Autenticación y handshake TLS correctos');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    bad(`Conexión fallida: ${msg.split(c.password).join('***')}`);
    if (/certificate|self[- ]signed|SSL|TLS/i.test(msg)) {
      info('→ El certificado del servidor no es de confianza. Opciones:');
      info('  1) (Recomendado) Exportar la CA/cert del servidor y definir DB_CA_CERT_PATH=./certs/sqlserver-ca.pem');
      info('  2) (Solo LAN de desarrollo) DB_TRUST_SERVER_CERT=true — sigue cifrado, pero sin validar identidad.');
    }
    if (/Login failed/i.test(msg)) info('→ Usuario/contraseña inválidos o login sin acceso a la BD indicada en DB_NAME.');
    process.exitCode = 1;
    return;
  }

  const [v] = await db.query<{ version: string; edition: string; server: string; db: string; login: string }>(
    `SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(64)) AS version,
            CAST(SERVERPROPERTY('Edition') AS nvarchar(128)) AS edition,
            @@SERVERNAME AS server, DB_NAME() AS db, SUSER_SNAME() AS login`,
  );
  ok(`SQL Server ${v.version} (${v.edition}) · servidor ${v.server} · BD ${v.db} · login ${v.login}`);

  const h = db.health();
  if (h.encrypted === true) ok('Cifrado confirmado por el servidor (sys.dm_exec_connections.encrypt_option = TRUE)');
  else if (h.encrypted === false) bad('El servidor reporta la sesión SIN cifrar');
  else info('(No se pudo leer encrypt_option — requiere VIEW SERVER STATE; el driver negoció TLS igualmente)');

  // Permisos efectivos: alertar si el login puede escribir (debería ser solo lectura).
  const perms = await db.query<{ permission_name: string }>(
    `SELECT permission_name FROM fn_my_permissions(NULL, 'DATABASE')
      WHERE permission_name IN ('INSERT','UPDATE','DELETE','ALTER','CONTROL','CREATE TABLE','EXECUTE')`,
  );
  if (perms.length) bad(`El login tiene permisos de escritura en ${v.db}: ${perms.map((p) => p.permission_name).join(', ')} — se recomienda restringirlo a db_datareader.`);
  else ok('El login no tiene permisos de escritura a nivel de base de datos');

  const dbs = await db.query<{ name: string }>(
    `SELECT name FROM sys.databases WHERE HAS_DBACCESS(name) = 1 AND database_id > 4 ORDER BY name`,
  );
  ok(`Bases de datos accesibles: ${dbs.map((d) => d.name).join(', ') || '(ninguna de usuario)'}`);

  if (arg) {
    console.log(`\n🔎 Objetos candidatos en ${v.db} (palabras clave: ${keywords.join(', ')})\n`);
    const likeClauses = keywords.map((_, i) => `LOWER(t.TABLE_NAME) LIKE @k${i}`).join(' OR ');
    const params = Object.fromEntries(
      keywords.map((k, i) => [`k${i}`, { type: sql.NVarChar(200), value: `%${k.toLowerCase()}%` }]),
    );
    const objs = await db.query<{ TABLE_SCHEMA: string; TABLE_NAME: string; TABLE_TYPE: string }>(
      `SELECT t.TABLE_SCHEMA, t.TABLE_NAME, t.TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES t
        WHERE ${likeClauses} ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME`,
      params,
    );
    if (!objs.length) info('(sin coincidencias; pruebe otra BD con DB_NAME=... o --discover=palabra1,palabra2)');
    for (const o of objs.slice(0, 80)) {
      const cols = await db.query<{ COLUMN_NAME: string; DATA_TYPE: string }>(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = @s AND TABLE_NAME = @t ORDER BY ORDINAL_POSITION`,
        { s: { type: sql.NVarChar(128), value: o.TABLE_SCHEMA }, t: { type: sql.NVarChar(128), value: o.TABLE_NAME } },
      );
      console.log(`  • ${o.TABLE_SCHEMA}.${o.TABLE_NAME} (${o.TABLE_TYPE === 'VIEW' ? 'vista' : 'tabla'})`);
      info(cols.map((cc) => `${cc.COLUMN_NAME}:${cc.DATA_TYPE}`).join(', '));
    }
    if (objs.length > 80) info(`… y ${objs.length - 80} objetos más`);
  }

  if (await db.ping()) ok(`Health-check SELECT 1 en ${db.health().latencyMs} ms`);
  console.log('');
}

try {
  await main();
} finally {
  await db.close();
}
