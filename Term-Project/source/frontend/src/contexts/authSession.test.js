import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiFetch, setApiAuthToken, setUnauthorizedHandler } from '../services/apiClient.js';
import { ACCESS_TOKEN_KEY, AUTH_USER_KEY, clearStoredSession, persistSession, restoreSession } from './authSession.js';

function storageMock() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function jwt(payload = { sub: '12', exp: Math.floor(Date.now() / 1000) + 3600 }) {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signed`;
}

describe('persisted authentication session', () => {
  afterEach(() => {
    setApiAuthToken('');
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  test('a page reload restores only the access token and minimal user', () => {
    const storage = storageMock();
    const session = { token: jwt(), user: { id: 12, name: 'Tan K.', email: 'tan.khanit@live.rmutl.ac.th', role: 'user', password: 'never persist', passwordHash: 'never persist', createdAt: 'private' } };
    expect(persistSession(session, storage)).toBe(true);
    storage.setItem(AUTH_USER_KEY, JSON.stringify({ ...session.user, fullDatabaseRecord: { private: true } }));

    const restored = restoreSession(storage);
    expect(restored.session).toEqual({
      token: session.token,
      user: { id: 12, name: 'Tan K.', email: 'tan.khanit@live.rmutl.ac.th', role: 'user' },
    });
    expect([...storage.values.keys()].sort()).toEqual([ACCESS_TOKEN_KEY, AUTH_USER_KEY].sort());
    expect(JSON.stringify([...storage.values])).not.toMatch(/password|createdAt|fullDatabaseRecord/i);
  });

  test('restored token is attached to API requests and My Requests is fetched from the API', async () => {
    const storage = storageMock();
    const session = { token: jwt(), user: { id: 12, name: 'Tan K.', email: 'tan.khanit@live.rmutl.ac.th', role: 'user' } };
    persistSession(session, storage);
    const restored = restoreSession(storage); // same read performed by a fresh AuthProvider mount
    setApiAuthToken(restored.session.token);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }));

    await expect(apiFetch('/api/vehicle-requests/my')).resolves.toEqual([]);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${session.token}`);
  });

  test('expired, malformed, or rejected persisted tokens clear both keys and auth header', async () => {
    const storage = storageMock();
    storage.setItem(ACCESS_TOKEN_KEY, jwt({ sub: '12', exp: 1 }));
    storage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 12, name: 'Tan K.', email: 'tan@live.rmutl.ac.th', role: 'user' }));
    expect(restoreSession(storage).messageKey).toBe('auth.sessionExpired');
    expect(storage.values.size).toBe(0);

    storage.setItem(ACCESS_TOKEN_KEY, 'not.a.valid-token');
    storage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 12, name: 'Tan K.', email: 'tan@live.rmutl.ac.th', role: 'user' }));
    expect(restoreSession(storage).messageKey).toBe('auth.sessionInvalid');
    expect(storage.values.size).toBe(0);

    const onUnauthorized = vi.fn(() => clearStoredSession(storage));
    setApiAuthToken(jwt());
    setUnauthorizedHandler(onUnauthorized);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ code: 'invalid_token', error: 'Unauthorized' }) }));
    await expect(apiFetch('/api/vehicle-requests/my')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(storage.values.size).toBe(0);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    await apiFetch('/api/health');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  test('logout clears only the authentication keys', () => {
    const storage = storageMock();
    storage.setItem(ACCESS_TOKEN_KEY, jwt());
    storage.setItem(AUTH_USER_KEY, '{}');
    storage.setItem('unrelated', 'keep');
    clearStoredSession(storage);
    expect([...storage.values]).toEqual([['unrelated', 'keep']]);
  });
});
