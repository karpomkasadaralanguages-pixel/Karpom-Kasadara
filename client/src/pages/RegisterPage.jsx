import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

// ── REGISTER ──────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    fullName: params.get('name') || '',
    email: params.get('email') || '',
    password: '',
    age: '',
    parentPhone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', { ...form, age: parseInt(form.age) });
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-900 rounded-full mb-3">
            <span className="font-tamil font-bold text-3xl text-white">அ</span>
          </div>
          <h1 className="font-tamil text-2xl font-bold text-primary-900">கற்போம் கசடற</h1>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            <span className="font-tamil">பதிவு செய்க</span>
            <span className="text-gray-400 text-sm font-normal ml-2">/ Create Account</span>
          </h2>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name / <span className="font-tamil">முழு பெயர்</span></label>
              <input type="text" className="input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email / <span className="font-tamil">மின்னஞ்சல்</span></label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password / <span className="font-tamil">கடவுச்சொல்</span></label>
              <input type="password" className="input" placeholder="Minimum 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age / <span className="font-tamil">வயது</span></label>
              <input type="number" className="input" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} required min={1} max={120} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone Number / <span className="font-tamil">பெற்றோர் தொலைபேசி</span></label>
              <input type="tel" className="input" placeholder="+1 234 567 8900" value={form.parentPhone} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : <><span className="font-tamil">பதிவு செய்</span> / Register</>}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-primary-700 font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-900 rounded-full mb-3">
            <span className="font-tamil font-bold text-3xl text-white">அ</span>
          </div>
          <h1 className="font-tamil text-2xl font-bold text-primary-900">கற்போம் கசடற</h1>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Reset Password</h2>

          {sent ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              If an account exists with that email, a reset link has been sent. Please check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-primary-700 hover:underline">← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        userId: params.get('userId'),
        token: params.get('token'),
        newPassword: form.newPassword,
      });
      navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Reset failed. The link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Set New Password</h2>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" className="input" minLength={8} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" className="input" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
