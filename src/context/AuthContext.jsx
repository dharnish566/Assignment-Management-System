import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { setAccessToken } from '../services/api.js';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'joineazy_user';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? { user: JSON.parse(stored) } : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleExpired = () => {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      setSession(null);
    };
    window.addEventListener('joineazy:auth-expired', handleExpired);
    return () => window.removeEventListener('joineazy:auth-expired', handleExpired);
  }, []);

  async function signIn(credentials) {
    setLoading(true);
    try {
      const result = await authService.login(credentials);
      setAccessToken(result.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      }
      setSession({ user: result.user });
      return result.user;
    } finally {
      setLoading(false);
    }
  }

  async function signUp(payload) {
    setLoading(true);
    try {
      const result = await authService.register(payload);
      setAccessToken(result.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      }
      setSession({ user: result.user });
      return result.user;
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    setSession(null);
  }

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
