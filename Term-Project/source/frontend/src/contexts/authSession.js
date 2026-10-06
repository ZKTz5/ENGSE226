export const ACCESS_TOKEN_KEY = 'rmutl-shuttle-access-token';
export const AUTH_USER_KEY = 'rmutl-shuttle-user';

function decodeJwtPart(part) {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = globalThis.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return JSON.parse(decoded);
}

export function validateStoredToken(token, now = Date.now()) {
  if (typeof token !== 'string') return 'invalid';
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) return 'invalid';
  try {
    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);
    if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') return 'invalid';
    if (payload.exp !== undefined && (!Number.isFinite(payload.exp) || payload.exp * 1000 <= now)) return 'expired';
    return 'valid';
  } catch {
    return 'invalid';
  }
}

export function minimalUser(user) {
  if (!user || (typeof user.id !== 'number' && typeof user.id !== 'string')
    || typeof user.name !== 'string' || typeof user.email !== 'string'
    || !['user', 'admin'].includes(user.role)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function clearStoredSession(storage = globalThis.sessionStorage) {
  try {
    storage?.removeItem(ACCESS_TOKEN_KEY);
    storage?.removeItem(AUTH_USER_KEY);
  } catch { /* storage may be unavailable */ }
}

export function persistSession(session, storage = globalThis.sessionStorage) {
  const user = minimalUser(session?.user);
  if (!storage || typeof session?.token !== 'string' || validateStoredToken(session.token) !== 'valid' || !user) {
    clearStoredSession(storage);
    return false;
  }
  try {
    storage.setItem(ACCESS_TOKEN_KEY, session.token);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return true;
  } catch {
    clearStoredSession(storage);
    return false;
  }
}

export function restoreSession(storage = globalThis.sessionStorage, now = Date.now()) {
  try {
    const token = storage?.getItem(ACCESS_TOKEN_KEY);
    const rawUser = storage?.getItem(AUTH_USER_KEY);
    if (!token && !rawUser) return { session: null, messageKey: '' };
    const tokenStatus = validateStoredToken(token, now);
    const user = rawUser ? minimalUser(JSON.parse(rawUser)) : null;
    if (tokenStatus !== 'valid' || !user) {
      clearStoredSession(storage);
      return { session: null, messageKey: tokenStatus === 'expired' ? 'auth.sessionExpired' : 'auth.sessionInvalid' };
    }
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { session: { token, user }, messageKey: '' };
  } catch {
    clearStoredSession(storage);
    return { session: null, messageKey: 'auth.sessionInvalid' };
  }
}
