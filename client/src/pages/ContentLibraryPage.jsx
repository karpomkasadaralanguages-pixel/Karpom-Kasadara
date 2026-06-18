import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const CATEGORIES = ['Alphabet', 'Grammar', 'Vocabulary', 'Sentences', 'Conversation', 'Culture'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

function ContentCard({ item, onDelete, onShare }) {
  const { user } = useAuthStore();
  const canEdit = user.role === 'admin' || (user.role === 'teacher' && item.uploadedBy?.id === user.id);

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge-${item.difficulty}`}>{item.difficulty}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.category}</span>
            {item.isShared && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Shared</span>}
            {item.status === 'processing' && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 animate-pulse">Converting…</span>}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm truncate">{item.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {item.pageCount ? `${item.pageCount} pages` : ''} · {item.uploadedBy?.fullName}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.status === 'ready' && (
            <Link to={`/content/${item.id}/view`} className="btn-primary text-xs py-1.5 px-3">
              <span className="font-tamil">காண்</span> / View
            </Link>
          )}
          {canEdit && (
            <>
              {user.role === 'admin' || item.uploadedBy?.id === user.id ? (
                <button
                  onClick={() => onShare(item)}
                  title={item.isShared ? 'Make Private' : 'Share with Teachers'}
                  className="p-1.5 rounded-md text-gray-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                >
                  {item.isShared ? '🔒' : '🔗'}
                </button>
              ) : null}
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                🗑
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }) {
  const [form, setForm] = useState({ title: '', category: 'Alphabet', difficulty: 'beginner', isShared: false });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('difficulty', form.difficulty);
      fd.append('isShared', form.isShared.toString());
      await api.post('/content', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            <span className="font-tamil">கோப்பு பதிவேற்று</span> / Upload Content
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF or PowerPoint)</label>
            <input type="file" accept=".pdf,.pptx,.ppt" onChange={e => setFile(e.target.files[0])} required
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary-50 file:text-primary-800 hover:file:bg-primary-100 cursor-pointer" />
            <p className="text-xs text-gray-400 mt-1">Max 50 MB. PDF is ready instantly; PowerPoint takes a minute to convert.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title / <span className="font-tamil">தலைப்பு</span></label>
            <input type="text" className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select className="input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isShared} onChange={e => setForm(f => ({ ...f, isShared: e.target.checked }))} className="rounded text-primary-700" />
            <span className="text-sm text-gray-700">Share with all teachers</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={uploading} className="btn-primary flex-1">
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContentLibraryPage() {
  const { user } = useAuthStore();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams({ sort });
      if (filterCategory) params.append('category', filterCategory);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      const { data } = await api.get(`/content?${params}`);
      setContent(data.content);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [sort, filterCategory, filterDifficulty]);

  const handleDelete = async id => {
    if (!confirm('Delete this content? This cannot be undone.')) return;
    await api.delete(`/content/${id}`);
    setContent(c => c.filter(i => i.id !== id));
  };

  const handleShare = async item => {
    await api.patch(`/content/${item.id}`, { isShared: !item.isShared });
    setContent(c => c.map(i => i.id === item.id ? { ...i, isShared: !i.isShared } : i));
  };

  const filtered = content.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            <span className="font-tamil">உள்ளடக்க நூலகம்</span>
          </h1>
          <p className="text-sm text-gray-500">Content Library</p>
        </div>
        {['admin', 'teacher'].includes(user?.role) && (
          <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">
            + <span className="font-tamil">பதிவேற்று</span> / Upload
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input type="search" className="input max-w-xs text-sm" placeholder="Search / தேடு..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input max-w-[140px] text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input max-w-[140px] text-sm" value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="">All levels</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input max-w-[140px] text-sm" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="recent">Recently Added</option>
          <option value="alpha">A → Z</option>
        </select>
      </div>

      {/* Content list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full animate-spin mr-3" />
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-tamil text-lg">உள்ளடக்கம் இல்லை</p>
          <p className="text-sm">No content found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <ContentCard key={item.id} item={item} onDelete={handleDelete} onShare={handleShare} />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={load} />}
    </div>
  );
}
