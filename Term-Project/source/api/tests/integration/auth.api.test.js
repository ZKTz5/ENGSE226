import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadSeed } from '../../src/services/shuttleDb.js';

const app = createApp();
const credentials = { email: 'tan.khanit@rmutl.ac.th', password: 'rmutl1234' };

beforeEach(async () => loadSeed());

describe('POST /api/auth/login', () => {
  test('valid institutional credentials return a JWT and user identity', async () => {
    const response = await request(app).post('/api/auth/login').send(credentials).expect(200);
    expect(response.body.token.split('.')).toHaveLength(3);
    expect(response.body.user.email).toBe(credentials.email);
  });

  test('rejects a non-institutional email domain', async () => {
    await request(app).post('/api/auth/login')
      .send({ ...credentials, email: 'student@example.com' }).expect(400);
  });

  test('validates missing fields and rejects invalid credentials', async () => {
    await request(app).post('/api/auth/login').send({ email: credentials.email }).expect(400);
    await request(app).post('/api/auth/login')
      .send({ ...credentials, password: 'incorrect' }).expect(401);
  });
});

describe('authenticated shuttle endpoints', () => {
  test('booking endpoints require a valid JWT', async () => {
    await request(app).get('/api/bookings/my').expect(401);
    const login = await request(app).post('/api/auth/login').send(credentials).expect(200);
    await request(app).get('/api/bookings/my')
      .set('Authorization', `Bearer ${login.body.token}`).expect(200);
  });
});
