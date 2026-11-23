import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { setAccessToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { const handleExpired = () => { setAccessToken(null); setSession(null); }; window.addEventListener('joineazy:auth-expired', handleExpired); return () => window.removeEventListener('joineazy:auth-expired', handleExpired); }, []);
  async function signIn(credentials) { setLoading(true); try { const result = await authService.login(credentials); setAccessToken(result.accessToken); setSession({ user: result.user }); return result.user; } finally { setLoading(false); } }
  async function signUp(payload) { setLoading(true); try { const result = await authService.register(payload); setAccessToken(result.accessToken); setSession({ user: result.user }); return result.user; } finally { setLoading(false); } }
  function signOut() { setAccessToken(null); setSession(null); }
  const value = useMemo(() => ({ user: session?.user ?? null, isAuthenticated: Boolean(session), loading, signIn, signUp, signOut }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider.'); return context; }
