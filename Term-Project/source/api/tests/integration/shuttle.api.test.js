import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getDb, loadSeed } from '../../src/services/shuttleDb.js';

const app = createApp();
const password = 'rmutl1234';

async function login(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  return response.body.token;
}

beforeEach(async () => loadSeed());

describe('RMUTL shuttle API', () => {
  test('login requires the institutional email domain and returns a JWT for a seeded user', async () => {
    const denied = await request(app).post('/api/auth/login').send({ email: 'student@example.com', password });
    expect(denied.status).toBe(400);

    const accepted = await request(app).post('/api/auth/login').send({
      email: 'tan.khanit@rmutl.ac.th', password,
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body.token.split('.')).toHaveLength(3);
  });

  test('lists campuses and filters schedules by route and travel date', async () => {
    const campuses = await request(app).get('/api/campuses').expect(200);
    expect(campuses.body.map((campus) => campus.name)).toEqual(['Doi Saket', 'Jed Yod', 'Chiang Mai']);

    const all = await request(app).get('/api/schedules').expect(200);
    expect(all.body.length).toBeGreaterThan(0);
    expect(all.body[0]).toHaveProperty('availableSeats');
    const schedule = all.body.find((item) => item.origin_id === 1 && item.destination_id === 2);
    const date = schedule.departure_time.slice(0, 10);
    const filtered = await request(app).get(`/api/schedules?originId=1&destinationId=2&date=${date}`).expect(200);
    expect(filtered.body.length).toBeGreaterThan(0);
    expect(filtered.body.every((item) => item.origin_id === 1 && item.destination_id === 2)).toBe(true);
  });

  test('protects bookings, rejects duplicates, and allows the owner to cancel', async () => {
    await request(app).post('/api/bookings').send({ scheduleId: 4 }).expect(401);
    const token = await login('tan.khanit@rmutl.ac.th');
    const headers = { Authorization: `Bearer ${token}` };

    const booking = await request(app).post('/api/bookings').set(headers).send({ scheduleId: 4 }).expect(201);
    expect(booking.body.status).toBe('confirmed');
    await request(app).post('/api/bookings').set(headers).send({ scheduleId: 4 }).expect(409);
    await request(app).delete(`/api/bookings/${booking.body.id}`).set(headers).expect(200);
    const rebooked = await request(app).post('/api/bookings').set(headers).send({ scheduleId: 4 }).expect(201);
    expect(rebooked.body.status).toBe('confirmed');
  });

  test('promotes waitlisted bookings in FIFO order when a confirmed booking is cancelled', async () => {
    getDb().prepare('UPDATE schedules SET capacity = 1, available_seats = 1 WHERE id = 4').run();
    const firstToken = await login('tan.khanit@rmutl.ac.th');
    const secondToken = await login('patchara.w@rmutl.ac.th');
    const thirdToken = await login('anon.p@rmutl.ac.th');
    const create = (token) => request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${token}`).send({ scheduleId: 4 });

    const confirmed = await create(firstToken).expect(201);
    const waitingOne = await create(secondToken).expect(201);
    const waitingTwo = await create(thirdToken).expect(201);
    expect(waitingOne.body.status).toBe('waitlisted');
    expect(waitingTwo.body.status).toBe('waitlisted');

    const cancelled = await request(app).delete(`/api/bookings/${confirmed.body.id}`)
      .set('Authorization', `Bearer ${firstToken}`).expect(200);
    expect(cancelled.body.promotedId).toBe(waitingOne.body.id);
    const mine = await request(app).get('/api/bookings/my')
      .set('Authorization', `Bearer ${secondToken}`).expect(200);
    expect(mine.body[0].status).toBe('confirmed');
  });
});
