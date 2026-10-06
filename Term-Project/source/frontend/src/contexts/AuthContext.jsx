import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest } from '../services/authService.js';
import { setApiAuthToken, setUnauthorizedHandler } from '../services/apiClient.js';
import { clearStoredSession, persistSession, restoreSession } from './authSession.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const restored = restoreSession();
    setApiAuthToken(restored.session?.token ?? '');
    return { session: restored.session, ready: false, messageKey: restored.messageKey };
  });

  useEffect(() => {
    function clearRejectedSession() {
      clearStoredSession();
      setApiAuthToken('');
      setAuth({ session: null, ready: true, messageKey: 'auth.sessionExpired' });
    }
    setUnauthorizedHandler(clearRejectedSession);
    setAuth((current) => ({ ...current, ready: true }));
    return () => setUnauthorizedHandler(null);
  }, []);

  async function signIn(credentials) {
    const result = await loginRequest(credentials);
    const nextSession = { token: result.token, user: result.user };
    persistSession(nextSession);
    setApiAuthToken(result.token);
    setAuth({ session: nextSession, ready: true, messageKey: '' });
    return result.user;
  }

  function signOut() {
    clearStoredSession();
    setApiAuthToken('');
    setAuth({ session: null, ready: true, messageKey: '' });
  }

  const value = useMemo(() => ({ ...auth, signIn, signOut }), [auth]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
