import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AuthShell from './AuthShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage() {
  const { signIn, user, loading } = useAuth(); const [form, setForm] = useState({ email: '', password: '' }); const [showPassword, setShowPassword] = useState(false); const navigate = useNavigate(); const location = useLocation();
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace />;
  const setField = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) { event.preventDefault(); try { const signedInUser = await signIn(form); toast.success('Welcome back.'); navigate(location.state?.from ?? (signedInUser.role === 'ADMIN' ? '/admin' : '/student'), { replace: true }); } catch (error) { toast.error(error.response?.data?.error?.message ?? 'Unable to sign in. Please try again.'); } }
  return <AuthShell eyebrow="Secure sign in" title="Welcome back" description="Sign in to manage your groups, assignments, and confirmations."><form className="space-y-5" onSubmit={submit}><label className="block text-sm font-medium">Email<input className="field mt-2" name="email" type="email" autoComplete="email" required value={form.email} onChange={setField} /></label><label className="block text-sm font-medium">Password<span className="relative mt-2 block"><input className="field pr-11" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={setField} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} className="icon-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><button className="primary-button w-full" disabled={loading}>{loading ? <><LoaderCircle className="animate-spin" size={18} />Signing in…</> : 'Sign in'}</button><p className="text-center text-sm text-muted">New to Joineazy? <Link className="font-semibold text-brand hover:text-brand-hover" to="/register">Create a student account</Link></p></form></AuthShell>;
}
