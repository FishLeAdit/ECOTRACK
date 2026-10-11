import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearSession, loadSession, saveSession } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  // With a stored token we confirm it is still valid before showing the app
  const [checking, setChecking] = useState(() => !!loadSession());

  const start = useCallback(({ token, user }) => {
    saveSession(token, user);
    setSession({ token, user });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // Validate the stored token once on load
  useEffect(() => {
    if (!loadSession()) return;
    let cancelled = false;
    api.get('/api/auth/me')
      .then(res => {
        if (!cancelled) {
          const stored = loadSession();
          if (stored) start({ token: stored.token, user: res.data.user });
        }
      })
      .catch(err => {
        // 401 is handled by the interceptor (it logs out). For network errors we keep the
        // stored session so a slow or sleeping server doesn't kick people out.
        if (!cancelled && err.response?.status === 401) setSession(null);
      })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [start]);

  // The API client fires this when any request comes back 401
  useEffect(() => {
    const onUnauthorized = () => setSession(null);
    window.addEventListener('ecotrack:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ecotrack:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    start(res.data);
  }, [start]);

  const register = useCallback(async (username, password) => {
    const res = await api.post('/api/auth/register', { username, password });
    start(res.data);
  }, [start]);

  const loginAsDemo = useCallback(async () => {
    const res = await api.post('/api/auth/demo');
    start(res.data);
  }, [start]);

  const value = useMemo(() => ({
    user: session?.user || null,
    checking,
    login,
    register,
    loginAsDemo,
    logout
  }), [session, checking, login, register, loginAsDemo, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
