import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-900 rounded-full mb-4">
            <span className="font-tamil font-bold text-4xl text-white">அ</span>
          </div>
          <h1 className="font-tamil text-3xl font-bold text-primary-900">கற்போம் கசடற</h1>
          <p className="text-primary-700 text-sm mt-1">Karpom Kasadara — Tamil Language Learning Portal</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            <span className="font-tamil">உள்நுழைக</span>
            <span className="text-gray-400 text-sm font-normal ml-2">/ Sign In</span>
          </h2>
          <p className="text-sm text-gray-500 mb-6">Enter your email and password to continue.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="font-tamil">மின்னஞ்சல்</span> / Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="font-tamil">கடவுச்சொல்</span> / Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span><span className="font-tamil">உள்நுழை</span> / Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
            New student?{' '}
            <Link to="/register" className="text-primary-700 font-medium hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
