import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config.js';

/** Seeded development account used by shuttle API tests. */
export const TEST_USER = { email: 'tan.khanit@rmutl.ac.th', password: 'rmutl1234' };

/** เข้าสู่ระบบจริงผ่าน API แล้วคืน token */
export async function loginAsUser(app, credentials = TEST_USER) {
  const r = await request(app).post('/api/auth/login').send(credentials);
  return r.body.token;
}

/** Create a token for role-gated endpoint tests. */
export function tokenFor(role, secret = config.jwtSecret) {
  return jwt.sign({ sub: '1', name: 'ทดสอบ', role }, secret, { expiresIn: '5m' });
}
