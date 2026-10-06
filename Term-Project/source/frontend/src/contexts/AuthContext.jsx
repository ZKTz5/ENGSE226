import { createContext, useContext, useMemo, useState } from 'react';
import { login as loginRequest } from '../services/shuttleService.js';
import { setApiAuthToken } from '../services/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  async function signIn(credentials) {
    const result = await loginRequest(credentials);
    const nextSession = { token: result.token, user: result.user };
    setApiAuthToken(result.token);
    setSession(nextSession);
    return result.user;
  }

  function signOut() {
    setApiAuthToken('');
    setSession(null);
  }

  const value = useMemo(() => ({ session, signIn, signOut }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
