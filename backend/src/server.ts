// Las fechas se calculan en hora local (igual que el navegador del dashboard original,
// usado en Guatemala). Fijar la zona antes de crear cualquier Date garantiza resultados idénticos.
process.env.TZ ||= 'America/Guatemala';

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const { createApp } = await import('./app.js');
const { config } = await import('./config.js');
const { store } = await import('./data/store.js');
const { initUsers } = await import('./data/users.js');
const { db } = await import('./db/pool.js');

initUsers();
await store.load();

const app = createApp();
let server: http.Server | https.Server;

if (config.tls.enabled && config.tls.certPath && config.tls.keyPath) {
  const options: https.ServerOptions = {
    key: fs.readFileSync(config.tls.keyPath),
    cert: fs.readFileSync(config.tls.certPath),
    ca: config.tls.caPath ? fs.readFileSync(config.tls.caPath) : undefined,
    minVersion: 'TLSv1.2',
  };
  server = https.createServer(options, app);
  server.listen(config.port, () => {
    console.log(`[api] Escuchando de forma SEGURA en https://localhost:${config.port} (TLSv1.2+ activo, TZ=${process.env.TZ})`);
  });
} else {
  server = http.createServer(app);
  server.listen(config.port, () => {
    console.log(`[api] Escuchando en http://localhost:${config.port} (TZ=${process.env.TZ})`);
  });
}

// Apagado ordenado (graceful shutdown)
const shutdown = async (signal: string) => {
  console.log(`\n[api] Señal ${signal} recibida: cerrando servidor y drenando pool de base de datos...`);
  server.close(async () => {
    await db.close().catch(() => undefined);
    console.log('[api] Servidor y conexiones cerradas correctamente.');
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

