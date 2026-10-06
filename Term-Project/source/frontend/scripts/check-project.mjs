#!/usr/bin/env node
/** Static structure checks for the active request-based RMUTL Shuttle frontend. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
async function read(relativePath) { return readFile(path.join(ROOT, relativePath), 'utf8'); }
async function check(name, callback) {
  try { checks.push({ name, passed: Boolean(await callback()) }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
}
await check('request routes replace schedule and booking routes', async () => {
  const app = await read('src/App.jsx');
  return ['path="requests/new"', 'path="requests"', 'path="requests/:requestId"', 'path="admin/requests"', 'path="guide"']
    .every((route) => app.includes(route)) && !app.includes('path="schedules') && !app.includes('path="bookings');
});
await check('new request form validates, reviews, then uses live API', async () => {
  const page = await read('src/pages/NewRequestPage.jsx');
  const service = await read('src/services/vehicleRequestService.js');
  const util = await read('src/utils/vehicleRequestForm.js');
  return page.includes('validateVehicleRequestDraft(draft)') && page.includes('setReviewing(true)')
    && page.includes('await createVehicleRequest(') && page.includes('disabled={submitting}')
    && service.includes('/api/vehicle-requests') && util.includes("'Jed Yod', 'Doi Saket'");
});
await check('PENDING feedback follows API response and reports no false approval', async () => {
  const ticket = await read('src/components/RequestSubmissionTicket.jsx');
  const page = await read('src/pages/NewRequestPage.jsx');
  return page.includes('setCreated(response)') && ticket.includes('request.status')
    && ticket.includes('request.ticket.submitted') && ticket.includes("request.status === 'APPROVED'");
});
await check('My Requests, request detail, admin review list/detail, and reset action exist', async () => {
  const [mine, detail, admin, adminDetail, app, header] = await Promise.all([
    read('src/pages/MyRequestsPage.jsx'), read('src/pages/RequestDetailPage.jsx'),
    read('src/pages/AdminRequestsPage.jsx'), read('src/pages/AdminRequestDetailPage.jsx'),
    read('src/App.jsx'), read('src/components/AppHeader.jsx'),
  ]);
  return mine.includes('getMyVehicleRequests') && mine.includes('cancelVehicleRequest')
    && detail.includes('getVehicleRequest(requestId)') && detail.includes("item.status === 'PENDING'")
    && app.includes('path="admin/requests/:requestId"') && admin.includes('admin-summary-card')
    && admin.includes('item.requester?.name') && admin.includes('getAdminResetAvailability')
    && adminDetail.includes('approveVehicleRequest') && adminDetail.includes('rejectVehicleRequest') && adminDetail.includes('completeVehicleRequest')
    && header.includes("session?.user?.role === 'admin'");
});
await check('Thai default, bilingual switch, guide and loading/empty/error states remain', async () => {
  const [html, context, header, guide, app] = await Promise.all([
    read('index.html'), read('src/contexts/LanguageContext.jsx'), read('src/components/AppHeader.jsx'),
    read('src/pages/UserGuidePage.jsx'), read('src/App.jsx'),
  ]);
  const states = await Promise.all(['LoadingState.jsx', 'EmptyState.jsx', 'ErrorState.jsx'].map((name) => read(`src/components/${name}`)));
  return html.includes('<html lang="th">') && context.includes("return 'th'")
    && header.includes('toggleLanguage') && guide.includes('Array.from') && app.includes('path="guide"')
    && states.every(Boolean);
});
await check('active source contains no recurring schedule or passenger waitlist flow', async () => {
  const app = await read('src/App.jsx');
  const files = await Promise.all([
    read('src/pages/DashboardPage.jsx'), read('src/pages/NewRequestPage.jsx'),
    read('src/pages/MyRequestsPage.jsx'), read('src/pages/RequestDetailPage.jsx'),
  ]);
  return !/schedules|bookings|waitlist|availableSeats|confirmedCount/i.test(app + files.join('\n'));
});
await check('reduced motion and focus styles are present', async () => {
  const styles = await read('src/styles.css');
  return styles.includes('@media (prefers-reduced-motion: reduce)') && styles.includes(':focus-visible');
});
for (const result of checks) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `: ${result.error}` : ''}`);
const passed = checks.filter(({ passed: value }) => value).length;
console.log(`\n${passed}/${checks.length} frontend request checks passed`);
if (passed !== checks.length) process.exitCode = 1;
