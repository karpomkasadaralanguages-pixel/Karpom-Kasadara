import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { formatIST, istDayKey } from '../utils/formatTime';

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-800',
  teacher: 'bg-blue-100 text-blue-800',
  student: 'bg-green-100 text-green-800',
};

export default function AdminLoginActivityPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(300);
  const [view, setView] = useState('all'); // 'all' = every sign-in, 'latest' = most recent per person
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/auth/login-history', { params: { limit } });
      setEvents(data.events);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load login activity.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [limit]);

  const rows = useMemo(() => {
    let list = events;
    if (roleFilter) list = list.filter(e => e.user.role === roleFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(e => e.user.fullName.toLowerCase().includes(q) || e.user.email.toLowerCase().includes(q));

    if (view === 'latest') {
      // Events arrive newest-first, so the first one we see per person is their latest.
      const seen = new Set();
      list = list.filter(e => (seen.has(e.user.id) ? false : (seen.add(e.user.id), true)));
    }
    return list;
  }, [events, roleFilter, search, view]);

  const today = istDayKey(new Date());
  const signedInToday = useMemo(() => {
    const ids = new Set(events.filter(e => istDayKey(e.loggedInAt) === today).map(e => e.user.id));
    return ids.size;
  }, [events, today]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Login Activity</h1>
          <p className="text-sm text-gray-500">Who has signed in, and when. Students and teachers only; the last 3 months are kept. All times are India Standard Time (IST).</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm">
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="card">
            <div className="text-2xl font-bold text-primary-900">{signedInToday}</div>
            <div className="text-sm text-gray-500">People signed in today (IST)</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-primary-900">{events.length}</div>
            <div className="text-sm text-gray-500">Sign-ins loaded{events.length >= limit ? ` (latest ${limit})` : ''}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {[['all', 'All sign-ins'], ['latest', 'Latest per person']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-3 py-1.5 ${view === key ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select className="input text-sm w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
        </select>
        <input
          type="text" className="input text-sm flex-1 min-w-[160px]" placeholder="Search name or email..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="input text-sm w-auto" value={limit} onChange={e => setLimit(Number(e.target.value))} title="How many recent sign-ins to load">
          <option value={100}>Last 100</option>
          <option value={300}>Last 300</option>
          <option value={1000}>Last 1000</option>
        </select>
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🕒</div>
          <p className="text-sm">
            {events.length === 0
              ? 'No sign-ins recorded yet. They will appear here as people log in.'
              : 'No sign-ins match these filters.'}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Signed in (IST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {e.user.fullName}
                      {e.user.deletedAt && <span className="ml-2 text-xs text-gray-400">(removed)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{e.user.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ROLE_STYLES[e.user.role] || 'bg-gray-100 text-gray-700'}`}>
                        {e.user.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatIST(e.loggedInAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Student and teacher sign-ins only. History older than 3 months is removed automatically.
      </p>
    </div>
  );
}
