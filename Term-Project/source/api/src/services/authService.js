import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { findUserByEmail } from './shuttleDb.js';
import { verifyPassword } from '../utils/password.js';

const RMUTL_DOMAIN = '@rmutl.ac.th';

/**
 * login(email, password)
 *
 * Returns one of:
 *   { ok: true,  token, user }
 *   { ok: false, status: 400, error: 'invalid_email_domain' }
 *   { ok: false, status: 401, error: 'invalid_credentials' }
 *
 * The 401 reason is the same for "email not found" and "wrong password"
 * so that we do not leak which emails are registered.
 */
export function login(email, password) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized.endsWith(RMUTL_DOMAIN)) {
    return { ok: false, status: 400, error: 'invalid_email_domain' };
  }
  const user = findUserByEmail(normalized);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, status: 401, error: 'invalid_credentials' };
  }
  const payload = { sub: String(user.id), name: user.name, role: user.role };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return {
    ok: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
