#!/usr/bin/env node
/** Static structure check for the active RMUTL Shuttle frontend. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), 'utf8');
}

async function check(name, callback) {
  try {
    const result = await callback();
    checks.push({ name, passed: Boolean(result) });
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
  }
}

await check('Shuttle login, dashboard, search, detail, and bookings routes', async () => {
  const app = await read('src/App.jsx');
  return ['path="login"', 'path="schedules"', 'path="schedules/:scheduleId"', 'path="bookings"']
    .every((route) => app.includes(route));
});
await check('Shuttle login and schedule API service calls', async () => {
  const service = await read('src/services/shuttleService.js');
  return ['/api/auth/login', '/api/campuses', '/api/schedules', '/api/bookings/my'].every((path) => service.includes(path));
});
await check('Loading, empty, and error states exist', async () => {
  const files = await Promise.all([
    read('src/components/LoadingState.jsx'),
    read('src/components/EmptyState.jsx'),
    read('src/components/ErrorState.jsx'),
  ]);
  return files.every(Boolean);
});
await check('Document identifies the RMUTL Shuttle app', async () => {
  const html = await read('index.html');
  return html.includes('RMUTL Shuttle Booking');
});

for (const result of checks) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `: ${result.error}` : ''}`);
}
const passed = checks.filter(({ passed: ok }) => ok).length;
console.log(`\n${passed}/${checks.length} frontend checks passed`);
if (passed !== checks.length) process.exitCode = 1;
