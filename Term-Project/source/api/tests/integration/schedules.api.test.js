import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getDb, loadSeed } from '../../src/services/shuttleDb.js';

const app = createApp();

beforeEach(async () => loadSeed());

describe('campus and schedule API', () => {
  test('returns campuses and schedule details with available-seat counts', async () => {
    const campuses = await request(app).get('/api/campuses').expect(200);
    expect(campuses.body.map(({ name }) => name)).toEqual(['Jed Yod', 'Doi Saket']);

    const schedules = await request(app).get('/api/schedules').expect(200);
    expect(schedules.body.length).toBeGreaterThan(0);
    expect(schedules.body.every(({ origin_id, destination_id }) =>
      [1, 2].includes(origin_id) && [1, 2].includes(destination_id) && origin_id !== destination_id,
    )).toBe(true);
    expect(schedules.body[0]).toMatchObject({ capacity: 10, availableSeats: 10, confirmedCount: 0 });
    const detail = await request(app).get(`/api/schedules/${schedules.body[0].id}`).expect(200);
    expect(detail.body.id).toBe(schedules.body[0].id);
  });

  test('filters by origin, destination, and calendar date', async () => {
    const filteredSchedule = (await request(app).get('/api/schedules').expect(200)).body
      .find(({ origin_id, destination_id }) => origin_id === 1 && destination_id === 2);
    const date = filteredSchedule.departure_time.slice(0, 10);
    const response = await request(app)
      .get(`/api/schedules?originId=1&destinationId=2&date=${date}`).expect(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.every((row) => row.origin_id === 1 && row.destination_id === 2)).toBe(true);
  });

  test.each([
    'originId=0', 'originId=1.5', 'originId=abc', 'destinationId=-1',
    'date=2026-02-30', 'date=2026/10/06', 'originId=1&destinationId=1',
  ])('rejects invalid schedule filters: %s', async (query) => {
    const response = await request(app).get(`/api/schedules?${query}`).expect(400);
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  test('derives expiration from departure time and blocks booking', async () => {
    getDb().prepare("UPDATE schedules SET departure_time = datetime('now','localtime','-1 minute'), status = 'active' WHERE id = 4").run();
    const expired = await request(app).get('/api/schedules/4').expect(200);
    expect(expired.body.status).toBe('expired');

    const login = await request(app).post('/api/auth/login').send({
      email: 'tan.khanit@live.rmutl.ac.th', password: 'rmutl1234',
    }).expect(200);
    await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ scheduleId: 4 }).expect(409);
  });
});
