import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

describe('active vehicle-request page structure', () => {
  test('protected routes wait for authentication restoration before redirecting', async () => {
    const [app, guard, provider, layout] = await Promise.all([
      source('../App.jsx'), source('../components/ProtectedRoute.jsx'), source('../contexts/AuthContext.jsx'), source('./AppLayout.jsx'),
    ]);
    expect(app).toContain('<ProtectedRoute><MyRequestsPage /></ProtectedRoute>');
    expect(app).toContain('<ProtectedRoute><RequestDetailPage /></ProtectedRoute>');
    expect(guard).toContain('if (!ready) return <LoadingState');
    expect(guard).toContain('<Navigate to="/login" replace');
    expect(provider).toContain('restoreSession()');
    expect(provider).toContain('setApiAuthToken(restored.session?.token ?? \'\')');
    expect(layout).toContain("navigate('/login'");
    expect(layout).toContain('messageKey');
  });

  test('logout clears auth and redirects, while request pages refetch from their API on mount', async () => {
    const [header, auth, mine, detail] = await Promise.all([
      source('../components/AppHeader.jsx'), source('../contexts/AuthContext.jsx'),
      source('./MyRequestsPage.jsx'), source('./RequestDetailPage.jsx'),
    ]);
    expect(header).toContain("navigate('/login', { replace: true })");
    expect(auth).toContain('clearStoredSession();');
    expect(auth).toContain("setApiAuthToken('')");
    expect(mine).toContain('getMyVehicleRequests()');
    expect(detail).toContain('getVehicleRequest(requestId)');
  });

  test('new request has loading/error handling, review-before-submit, and a success response panel', async () => {
    const page = await source('./NewRequestPage.jsx');
    expect(page).toContain('<LoadingState');
    expect(page).toContain('<ErrorState');
    expect(page).toContain('validateVehicleRequestDraft(draft)');
    expect(page).toContain('setReviewing(true)');
    expect(page).toContain('await createVehicleRequest(');
    expect(page).toContain('setCreated(response)');
    expect(page).toContain('<RequestSubmissionTicket request={created}');
  });

  test('My Requests and detail expose status-aware pending cancellation and retain history flow', async () => {
    const [mine, detail] = await Promise.all([source('./MyRequestsPage.jsx'), source('./RequestDetailPage.jsx')]);
    expect(mine).toContain('<EmptyState');
    expect(mine).toContain('<ErrorState');
    expect(mine).toContain('getMyVehicleRequests()');
    expect(mine).toContain('cancelVehicleRequest(pending.id)');
    expect(detail).toContain('getVehicleRequest(requestId)');
    expect(detail).toContain("item.status === 'PENDING'");
    expect(detail).toContain('cancelVehicleRequest(item.id)');
  });

  test('user guide is a user-selected route and is not wired as automatic onboarding', async () => {
    const [app, header, guide] = await Promise.all([
      source('../App.jsx'), source('../components/AppHeader.jsx'), source('./UserGuidePage.jsx'),
    ]);
    expect(app).toContain('path="guide"');
    expect(header).toContain('to="/guide"');
    expect(guide).toContain('length: 12');
    expect(app).not.toContain('Navigate to="/guide"');
    expect(app).not.toContain('path="guide" element={<Navigate');
  });
});
