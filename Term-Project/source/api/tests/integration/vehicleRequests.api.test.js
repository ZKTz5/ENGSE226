import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getDb, loadSeed } from '../../src/services/shuttleDb.js';

const app = createApp();
const password = 'rmutl1234';
const emails = {
  tan: 'tan.khanit@live.rmutl.ac.th', patchara: 'patchara.w@live.rmutl.ac.th',
  anon: 'anon.p@live.rmutl.ac.th', admin: 'admin@live.rmutl.ac.th',
};
const future = (hours = 24) => new Date(Date.now() + hours * 3_600_000).toISOString();
const requestInput = (overrides = {}) => ({
  origin: 'Jed Yod', destination: 'Doi Saket', tripType: 'ONE_WAY',
  departureAt: future(), returnAt: null, passengerCount: 2,
  purpose: 'Academic materials transport', note: null, ...overrides,
});
async function tokenFor(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return response.body.token;
}
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
beforeEach(async () => loadSeed());

describe('vehicle request API', () => {
  test('returns exactly the two service locations and Jed Yod as home base', async () => {
    const { body } = await request(app).get('/api/locations').expect(200);
    expect(body.map(({ name }) => name)).toEqual(['Jed Yod', 'Doi Saket']);
    expect(body.filter(({ isHomeBase }) => isHomeBase).map(({ name }) => name)).toEqual(['Jed Yod']);
  });

  test('creates one-way requests as PENDING and ignores client status or assignment fields', async () => {
    const token = await tokenFor(emails.tan);
    const { body } = await request(app).post('/api/vehicle-requests').set(bearer(token))
      .send({ ...requestInput(), status: 'APPROVED', assignedVehicleId: 3 }).expect(201);
    expect(body).toMatchObject({ origin: 'Jed Yod', destination: 'Doi Saket', tripType: 'ONE_WAY', status: 'PENDING' });
    expect(body).not.toHaveProperty('assignedVehicleId');
    expect(body.id).toEqual(expect.any(Number));
    expect(body).not.toHaveProperty('assignedVehicleCode');
  });

  test('creates round-trip request and retains the return time', async () => {
    const token = await tokenFor(emails.tan);
    const departureAt = future();
    const returnAt = new Date(new Date(departureAt).getTime() + 4 * 3_600_000).toISOString();
    const { body } = await request(app).post('/api/vehicle-requests').set(bearer(token))
      .send(requestInput({ tripType: 'ROUND_TRIP', departureAt, returnAt })).expect(201);
    expect(body).toMatchObject({ tripType: 'ROUND_TRIP', departureAt, returnAt, status: 'PENDING' });
  });

  test('rejects unauthenticated creation and all invalid request fields', async () => {
    await request(app).post('/api/vehicle-requests').send(requestInput()).expect(401);
    const token = await tokenFor(emails.tan);
    const cases = [
      [{ ...requestInput(), origin: 'Chiang Mai' }, 'origin_invalid'],
      [{ ...requestInput(), destination: 'Jed Yod' }, 'same_location'],
      [{ ...requestInput(), departureAt: new Date(Date.now() - 60_000).toISOString() }, 'departure_in_past'],
      [{ ...requestInput(), tripType: 'RETURN' }, 'trip_type_invalid'],
      [{ ...requestInput(), passengerCount: 0 }, 'passenger_count_invalid'],
      [{ ...requestInput(), passengerCount: -1 }, 'passenger_count_invalid'],
      [{ ...requestInput(), purpose: '  ' }, 'purpose_required'],
      [{ ...requestInput(), tripType: 'ROUND_TRIP', returnAt: null }, 'return_required'],
      [{ ...requestInput(), returnAt: new Date(Date.now() + 60_000).toISOString() }, 'return_before_departure'],
      [{ ...requestInput(), departureAt: 'nonsense' }, 'departure_invalid'],
      [{ ...requestInput(), departureAt: '2026-10-07' }, 'departure_invalid'],
    ];
    for (const [input, expected] of cases) {
      const { body } = await request(app).post('/api/vehicle-requests').set(bearer(token)).send(input).expect(400);
      expect(body.details).toContain(expected);
    }
  });

  test('lists only own requests, returns own detail, and hides another user request', async () => {
    const ownerToken = await tokenFor(emails.tan);
    const otherToken = await tokenFor(emails.patchara);
    const created = await request(app).post('/api/vehicle-requests').set(bearer(ownerToken)).send(requestInput()).expect(201);
    const ownList = await request(app).get('/api/vehicle-requests/my').set(bearer(ownerToken)).expect(200);
    expect(ownList.body.map(({ id }) => id)).toEqual([created.body.id]);
    expect((await request(app).get(`/api/vehicle-requests/${created.body.id}`).set(bearer(ownerToken)).expect(200)).body.id)
      .toBe(created.body.id);
    await request(app).get(`/api/vehicle-requests/${created.body.id}`).set(bearer(otherToken)).expect(404);
    expect((await request(app).get('/api/vehicle-requests/my').set(bearer(otherToken)).expect(200)).body).toEqual([]);
  });

  test('cancels pending request and retains the request in user history', async () => {
    const token = await tokenFor(emails.tan);
    const created = await request(app).post('/api/vehicle-requests').set(bearer(token)).send(requestInput()).expect(201);
    const cancelled = await request(app).patch(`/api/vehicle-requests/${created.body.id}/cancel`).set(bearer(token)).expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    const history = await request(app).get('/api/vehicle-requests/my').set(bearer(token)).expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].status).toBe('CANCELLED');
    await request(app).patch(`/api/vehicle-requests/${created.body.id}/cancel`).set(bearer(token)).expect(409);
  });

  test('prevents cancelling an approved request and keeps request history', async () => {
    const token = await tokenFor(emails.tan);
    const created = await request(app).post('/api/vehicle-requests').set(bearer(token)).send(requestInput()).expect(201);
    getDb().prepare("UPDATE vehicle_requests SET status = 'APPROVED' WHERE id = ?").run(created.body.id);
    await request(app).patch(`/api/vehicle-requests/${created.body.id}/cancel`).set(bearer(token)).expect(409);
    expect((await request(app).get('/api/vehicle-requests/my').set(bearer(token)).expect(200)).body[0].status).toBe('APPROVED');
  });
});
