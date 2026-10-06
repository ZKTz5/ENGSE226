#!/usr/bin/env node
/** Isolated smoke checks for the RMUTL vehicle-request API. */
process.env.DB_FILE = ':memory:';
const [{ createApp }, { loadSeed }] = await Promise.all([
  import('../src/app.js'), import('../src/services/shuttleDb.js'),
]);
await loadSeed();
const { default: request } = await import('supertest');
const app = createApp();
const checks = [
  ['two service locations and Jed Yod home base', async () => {
    const { body } = await request(app).get('/api/locations').expect(200);
    return body.map(({ name }) => name).join('|') === 'Jed Yod|Doi Saket'
      && body.filter(({ isHomeBase }) => isHomeBase).map(({ name }) => name)[0] === 'Jed Yod';
  }],
  ['vehicle requests require authentication', async () => {
    await request(app).get('/api/vehicle-requests/my').expect(401);
    return true;
  }],
  ['administrative review requires authentication', async () => {
    await request(app).get('/api/admin/vehicle-requests').expect(401);
    return true;
  }],
  ['health', async () => {
    const { body } = await request(app).get('/api/health').expect(200);
    return body.database.connected;
  }],
];
let passed = 0;
for (const [name, check] of checks) {
  try {
    if (!(await check())) throw new Error('unexpected response');
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) { console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(`\n${passed}/${checks.length} vehicle request API checks passed`);
if (passed !== checks.length) process.exitCode = 1;
