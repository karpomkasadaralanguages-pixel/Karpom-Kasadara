import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function InquiryPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/inquiries', form);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
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
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Get in Touch</h2>
          <p className="text-sm text-gray-500 mb-4">Have a question? Send us a message and we'll get back to you.</p>

          {sent ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              Thank you — your message has been sent. We'll be in touch soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="tel" className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea className="input h-28 resize-none" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm">
            <Link to="/" className="text-primary-700 hover:underline">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
