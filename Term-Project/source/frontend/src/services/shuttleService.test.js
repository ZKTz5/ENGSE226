import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  cancelBooking, createBooking, getCampuses, getMyBookings, getSchedule, getSchedules, login,
} from './shuttleService.js';
import { setApiAuthToken } from './apiClient.js';

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('shuttleService', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => {
    setApiAuthToken('');
    vi.unstubAllGlobals();
  });

  test('sends credentials to the real login endpoint and returns its response', async () => {
    const result = { token: 'jwt.token.value', user: { id: 1, name: 'Student' } };
    fetch.mockResolvedValue(response(result));

    await expect(login({ email: 'student@live.rmutl.ac.th', password: 'secret' })).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'student@live.rmutl.ac.th', password: 'secret' }),
    }));
  });

  test('loads campuses, schedules with validated filters, and schedule details from the API', async () => {
    fetch.mockResolvedValueOnce(response([{ id: 1, name: 'Doi Saket' }]))
      .mockResolvedValueOnce(response([{ id: 8, availableSeats: 3 }]))
      .mockResolvedValueOnce(response({ id: 8, status: 'active' }));

    await expect(getCampuses()).resolves.toEqual([{ id: 1, name: 'Doi Saket' }]);
    await expect(getSchedules({ originId: 1, destinationId: 2, date: '2026-10-07' }))
      .resolves.toEqual([{ id: 8, availableSeats: 3 }]);
    await expect(getSchedule(8)).resolves.toEqual({ id: 8, status: 'active' });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3001/api/campuses',
      'http://localhost:3001/api/schedules?originId=1&destinationId=2&date=2026-10-07',
      'http://localhost:3001/api/schedules/8',
    ]);
  });

  test('sends the in-memory JWT as a bearer token', async () => {
    setApiAuthToken('signed.jwt.token');
    fetch.mockResolvedValue(response([]));

    await getCampuses();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer signed.jwt.token');
  });

  test('loads personal bookings, creates a booking, and cancels by id', async () => {
    fetch.mockResolvedValueOnce(response([{ id: 14, status: 'confirmed' }]))
      .mockResolvedValueOnce(response({ id: 14, status: 'waitlisted' }))
      .mockResolvedValueOnce(response({ cancelledId: 14, promotedId: 19 }));

    await expect(getMyBookings()).resolves.toEqual([{ id: 14, status: 'confirmed' }]);
    await expect(createBooking(5)).resolves.toEqual({ id: 14, status: 'waitlisted' });
    await expect(cancelBooking(14)).resolves.toEqual({ cancelledId: 14, promotedId: 19 });
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method ?? 'GET'])).toEqual([
      ['http://localhost:3001/api/bookings/my', 'GET'],
      ['http://localhost:3001/api/bookings', 'POST'],
      ['http://localhost:3001/api/bookings/14', 'DELETE'],
    ]);
    expect(fetch.mock.calls[1][1].body).toBe(JSON.stringify({ scheduleId: 5 }));
  });
});
