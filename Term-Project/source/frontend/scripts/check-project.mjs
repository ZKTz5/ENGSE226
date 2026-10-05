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

await check('Shuttle login, dashboard, search, detail, bookings, and guide routes', async () => {
  const app = await read('src/App.jsx');
  const header = await read('src/components/AppHeader.jsx');
  return ['path="login"', 'path="schedules"', 'path="schedules/:scheduleId"', 'path="bookings"', 'path="guide"']
    .every((route) => app.includes(route))
    && header.includes('to="/guide"') && header.includes("t('nav.guide')");
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
await check('Thai is default and bilingual switch is wired without reload', async () => {
  const [html, app, header, languageContext, dictionary] = await Promise.all([
    read('index.html'), read('src/App.jsx'), read('src/components/AppHeader.jsx'),
    read('src/contexts/LanguageContext.jsx'), read('src/i18n/translations.js'),
  ]);
  return html.includes('<html lang="th">') && app.includes('<LanguageProvider>')
    && header.includes('toggleLanguage') && header.includes('ไทย') && header.includes('EN')
    && languageContext.includes("'th'") && dictionary.includes("export function translate");
});
await check('Booking feedback uses API-confirmed data and cancellation confirmation restores focus', async () => {
  const [detail, ticket, confirmation] = await Promise.all([
    read('src/pages/ScheduleDetailPage.jsx'), read('src/components/BookingTicket.jsx'),
    read('src/components/ConfirmCancellationDialog.jsx'),
  ]);
  return detail.includes('await createBooking(schedule.id)')
    && detail.includes('setBookingResult(created)')
    && ticket.includes('booking.departure_time') && ticket.includes('booking.status')
    && ticket.includes('booking.id') && !ticket.includes('waitlist_seq')
    && confirmation.includes('showModal()') && confirmation.includes('.focus(')
    && confirmation.includes('restoreFocusTarget');
});
await check('Reduced motion support is present', async () => {
  const styles = await read('src/styles.css');
  return styles.includes('@media (prefers-reduced-motion: reduce)')
    && styles.includes('animation-duration: .01ms');
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
