import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

describe('active vehicle-request page structure', () => {
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
