#!/usr/bin/env node
/** Lightweight smoke check for the RMUTL Shuttle API. */
import request from 'supertest';

// Smoke checks should never depend on or mutate a developer's persistent DB.
process.env.DB_FILE = ':memory:';
const { createApp } = await import('../src/app.js');
const { loadSeed } = await import('../src/services/shuttleDb.js');
await loadSeed();
const app = createApp();
const checks = [
  ['campuses', () => request(app).get('/api/campuses').expect(200).then(({ body }) =>
    body.length === 2 && body.map(({ name }) => name).join('|') === 'Jed Yod|Doi Saket')],
  ['schedules', () => request(app).get('/api/schedules').expect(200).then(({ body }) => body.length > 0)],
  ['filter validation', () => request(app).get('/api/schedules?originId=invalid').expect(400).then(({ body }) => body.details.length > 0)],
  ['health', () => request(app).get('/api/health').expect(200).then(({ body }) => body.database.connected)],
];

let passed = 0;
for (const [name, check] of checks) {
  try {
    if (!(await check())) throw new Error('unexpected response');
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

if (passed !== checks.length) process.exitCode = 1;
console.log(`\n${passed}/${checks.length} shuttle API checks passed`);
