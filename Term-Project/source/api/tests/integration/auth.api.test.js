import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadSeed } from '../../src/services/shuttleDb.js';

const app = createApp();
const credentials = { email: 'tan.khanit@live.rmutl.ac.th', password: 'rmutl1234' };
beforeEach(async () => loadSeed());

describe('POST /api/auth/login', () => {
  test('valid institutional credentials return a JWT and user identity', async () => {
    const response = await request(app).post('/api/auth/login').send(credentials).expect(200);
    expect(response.body.token.split('.')).toHaveLength(3);
    expect(response.body.user.email).toBe(credentials.email);
  });

  test('accepts case-insensitive @live.rmutl.ac.th email addresses', async () => {
    const response = await request(app).post('/api/auth/login')
      .send({ ...credentials, email: 'TAN.KHANIT@LIVE.RMUTL.AC.TH' }).expect(200);
    expect(response.body.user.email).toBe(credentials.email);
  });

  test.each([
    'student@example.com', 'student@rmutl.ac.th', 'student@sub.live.rmutl.ac.th',
    'student@live.rmutl.ac.th.attacker.example', 'student@@live.rmutl.ac.th',
  ])('rejects email outside exact institutional domain: %s', async (email) => {
    const response = await request(app).post('/api/auth/login').send({ ...credentials, email }).expect(400);
    expect(response.body.code).toBe('invalid_email_domain');
  });

  test('validates missing fields and rejects invalid credentials', async () => {
    await request(app).post('/api/auth/login').send({ email: credentials.email }).expect(400);
    await request(app).post('/api/auth/login').send({ ...credentials, password: 'incorrect' }).expect(401);
  });
});

describe('authenticated request operations', () => {
  test('request history requires JWT and accepts a valid session', async () => {
    await request(app).get('/api/vehicle-requests/my').expect(401);
    const login = await request(app).post('/api/auth/login').send(credentials).expect(200);
    await request(app).get('/api/vehicle-requests/my')
      .set('Authorization', `Bearer ${login.body.token}`).expect(200);
  });
});
