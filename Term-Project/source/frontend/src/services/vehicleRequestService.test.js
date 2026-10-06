import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createVehicleRequest, getLocations, getMyVehicleRequests, getVehicleRequest, cancelVehicleRequest, getAdminVehicleRequests, getAdminVehicleRequest, getAdminResetAvailability, resetAdminRequestData, getAdminVehicles, approveVehicleRequest, rejectVehicleRequest, completeVehicleRequest } from './vehicleRequestService.js';
import { ApiError, setApiAuthToken } from './apiClient.js';

function response(body, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => body }; }
const requestData = { origin: 'Jed Yod', destination: 'Doi Saket', tripType: 'ONE_WAY', departureAt: '2026-10-07T10:00:00.000Z', returnAt: null, passengerCount: 2, purpose: 'Academic transport', note: null };

describe('vehicleRequestService', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => { setApiAuthToken(''); vi.unstubAllGlobals(); });

  test('loads allowed service locations', async () => {
    fetch.mockResolvedValue(response([{ value: 'Jed Yod', name: 'Jed Yod' }, { value: 'Doi Saket', name: 'Doi Saket' }]));
    await expect(getLocations()).resolves.toHaveLength(2);
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3001/api/locations');
  });

  test('creates, lists, reads, and cancels requests using the vehicle request API', async () => {
    const pending = { id: 21, ...requestData, status: 'PENDING' };
    fetch.mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response([pending]))
      .mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response({ ...pending, status: 'CANCELLED' }));
    await expect(createVehicleRequest(requestData)).resolves.toMatchObject({ status: 'PENDING' });
    await expect(getMyVehicleRequests()).resolves.toEqual([pending]);
    await expect(getVehicleRequest(21)).resolves.toEqual(pending);
    await expect(cancelVehicleRequest(21)).resolves.toMatchObject({ status: 'CANCELLED' });
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method ?? 'GET'])).toEqual([
      ['http://localhost:3001/api/vehicle-requests', 'POST'],
      ['http://localhost:3001/api/vehicle-requests/my', 'GET'],
      ['http://localhost:3001/api/vehicle-requests/21', 'GET'],
      ['http://localhost:3001/api/vehicle-requests/21/cancel', 'PATCH'],
    ]);
    expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify(requestData));
  });

  test('admin request actions use protected API paths and bearer token', async () => {
    setApiAuthToken('signed.jwt.token');
    fetch.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 2, status: 'APPROVED' })).mockResolvedValueOnce(response({ id: 3, status: 'REJECTED' }))
      .mockResolvedValueOnce(response({ id: 2, status: 'COMPLETED' }));
    await getAdminVehicleRequests('PENDING');
    await getAdminVehicles();
    await approveVehicleRequest(2, 6);
    await rejectVehicleRequest(3, 'No vehicle');
    await completeVehicleRequest(2);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3001/api/admin/vehicle-requests?status=PENDING',
      'http://localhost:3001/api/admin/vehicles',
      'http://localhost:3001/api/admin/vehicle-requests/2/approve',
      'http://localhost:3001/api/admin/vehicle-requests/3/reject',
      'http://localhost:3001/api/admin/vehicle-requests/2/complete',
    ]);
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer signed.jwt.token')).toBe(true);
    expect(fetch.mock.calls[2][1].body).toBe(JSON.stringify({ assignedVehicleId: 6 }));
  });

  test('admin detail and explicit reset confirmation use protected endpoints', async () => {
    setApiAuthToken('signed.jwt.token');
    fetch.mockResolvedValueOnce(response({ id: 12, requester: { id: 8, name: 'Requester', email: 'user@live.rmutl.ac.th' } }))
      .mockResolvedValueOnce(response({ enabled: true })).mockResolvedValueOnce(response({ deletedRequestCount: 4 }));
    await expect(getAdminVehicleRequest(12)).resolves.toMatchObject({ requester: { email: 'user@live.rmutl.ac.th' } });
    await expect(getAdminResetAvailability()).resolves.toEqual({ enabled: true });
    await expect(resetAdminRequestData('RESET')).resolves.toEqual({ deletedRequestCount: 4 });
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method ?? 'GET'])).toEqual([
      ['http://localhost:3001/api/admin/vehicle-requests/12', 'GET'],
      ['http://localhost:3001/api/admin/reset-data', 'GET'],
      ['http://localhost:3001/api/admin/reset-data', 'POST'],
    ]);
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer signed.jwt.token')).toBe(true);
    expect(fetch.mock.calls[2][1].body).toBe(JSON.stringify({ confirmation: 'RESET' }));
  });

  test('preserves stable API error codes for translated messages', async () => {
    fetch.mockResolvedValue(response({ code: 'request_not_cancellable', error: 'server message' }, 409));
    await expect(createVehicleRequest(requestData)).rejects.toBeInstanceOf(ApiError);
    await expect(createVehicleRequest(requestData)).rejects.toMatchObject({ code: 'request_not_cancellable', status: 409 });
  });
});
