// Las fechas se calculan en hora local (igual que el navegador del dashboard original,
// usado en Guatemala). Fijar la zona antes de crear cualquier Date garantiza resultados idénticos.
process.env.TZ ||= 'America/Guatemala';

const { createApp } = await import('./app.js');
const { config } = await import('./config.js');
const { store } = await import('./data/store.js');
const { initUsers } = await import('./data/users.js');

initUsers();
store.load();

createApp().listen(config.port, () => {
  console.log(`[api] Escuchando en http://localhost:${config.port}  (TZ=${process.env.TZ})`);
});
