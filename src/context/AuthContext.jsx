import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { getStoredToken, storeToken, clearToken } from '../utils/auth';

const AuthContext = createContext({
  user: null,
  token: null,
  status: 'anonymous',
  loading: false,
  isAuthenticated: false,
  login: async () => undefined,
  signup: async () => undefined,
  logout: async () => undefined,
  refresh: async () => undefined,
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(token ? 'loading' : 'anonymous');

  const loadMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      setStatus('anonymous');
      return null;
    }
    setStatus('loading');
    try {
      const profile = await api.me();
      setUser(profile);
      setStatus('authenticated');
      return profile;
    } catch (error) {
      console.error('Failed to load current user', error);
      clearToken();
      setToken(null);
      setUser(null);
      setStatus('anonymous');
      return null;
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStatus('anonymous');
        setUser(null);
        return;
      }
      try {
        setStatus('loading');
        const profile = await api.me();
        if (!cancelled) {
          setUser(profile);
          setStatus('authenticated');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Auth check failed', error);
          clearToken();
          setToken(null);
          setUser(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    storeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const result = await api.signup(payload);
    storeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.warn('Logout request failed', error);
    }
    clearToken();
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async () => {
    return loadMe();
  }, [loadMe]);

  const value = useMemo(() => ({
    user,
    token,
    status,
    loading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    login,
    signup,
    logout,
    refresh,
  }), [user, token, status, login, signup, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
