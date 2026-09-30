import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { CLASS_LEVELS } from './AdminUsersPage';

const CATEGORIES = ['Alphabet', 'Grammar', 'Vocabulary', 'Sentences', 'Conversation', 'Culture'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const CONTENT_TYPES = [
  { value: 'book', label: 'Book' },
  { value: 'workbook', label: 'Workbook' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'question_paper', label: 'Question Paper' },
  { value: 'teaching_guide', label: 'Teaching Guide (hidden from students)' },
];
const CONTENT_TYPE_LABEL = Object.fromEntries(CONTENT_TYPES.map(c => [c.value, c.label]));
const CLASS_LABEL = Object.fromEntries(CLASS_LEVELS.map(c => [c.value, c.label]));

function ContentCard({ item, onDelete, onShare, onOpenTeacherShare, onOpenAssign, onOpenSetMeta }) {
  const { user } = useAuthStore();
  const canEdit = user.role === 'admin' || (user.role === 'teacher' && item.uploadedBy?.id === user.id);
  const needsMeta = !item.classLevel || !item.contentType;
  const isTeacherOrAdmin = user.role === 'admin' || user.role === 'teacher';

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge-${item.difficulty}`}>{item.difficulty}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.category}</span>
            {item.classLevel && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{CLASS_LABEL[item.classLevel] || item.classLevel}</span>}
            {item.contentType && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{CONTENT_TYPE_LABEL[item.contentType] || item.contentType}</span>}
            {item.isShared && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Shared</span>}
            {needsMeta && canEdit && (
              <button onClick={() => onOpenSetMeta(item)} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors">
                ⚠️ Set Class/Type
              </button>
            )}
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
          {user.role === 'teacher' && (
            <button
              onClick={() => onOpenAssign(item)}
              title="Assign to Students"
              className="p-1.5 rounded-md text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
            >
              🎓
            </button>
          )}
          {user.role === 'admin' && (
            <button
              onClick={() => onOpenTeacherShare(item)}
              title="Share with specific teachers"
              className="p-1.5 rounded-md text-gray-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              👥
            </button>
          )}
          {canEdit && (
            <>
              {user.role === 'admin' || item.uploadedBy?.id === user.id ? (
                <button
                  onClick={() => onShare(item)}
                  title={item.isShared ? 'Make Private (currently shared with all teachers)' : 'Share with all teachers'}
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

// ── ADMIN: SHARE WITH SPECIFIC TEACHERS ────────────────────────────────────────
function TeacherShareModal({ item, onClose }) {
  const [teachers, setTeachers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/users?role=teacher'),
      api.get(`/content/${item.id}/shares`)
    ]).then(([teachersRes, sharesRes]) => {
      setTeachers(teachersRes.data.users);
      setSelected(sharesRes.data.teacherIds);
    }).catch(() => setError('Failed to load sharing info.'))
      .finally(() => setLoading(false));
  }, [item.id]);

  const toggle = teacherId => {
    setSelected(s => s.includes(teacherId) ? s.filter(id => id !== teacherId) : [...s, teacherId]);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.put(`/content/${item.id}/shares`, { teacherIds: selected });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update sharing.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Share "{item.title}" with Teachers</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <p className="text-xs text-gray-500 mb-3">
            Select teachers who should be able to see and assign this content, in addition to any teacher who already sees it via "Share with all teachers."
          </p>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No teachers found.</div>
          ) : (
            <div className="space-y-2">
              {teachers.map(t => (
                <label key={t.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} className="rounded text-primary-700" />
                  <span className="text-sm text-gray-800">{t.fullName}</span>
                  <span className="text-xs text-gray-400">({t.email})</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Save Sharing'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TEACHER: ASSIGN CONTENT TO STUDENTS ────────────────────────────────────────
function AssignModal({ item, onClose }) {
  const { user } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [initialSelected, setInitialSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/users/${user.id}/students`),
      api.get(`/content/${item.id}/assignments`)
    ]).then(([studentsRes, assignRes]) => {
      setStudents(studentsRes.data.students);
      setSelected(assignRes.data.studentIds);
      setInitialSelected(assignRes.data.studentIds);
    }).catch(() => setError('Failed to load assignment info.'))
      .finally(() => setLoading(false));
  }, [item.id, user.id]);

  const toggle = studentId => {
    setSelected(s => s.includes(studentId) ? s.filter(id => id !== studentId) : [...s, studentId]);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const toAdd = selected.filter(id => !initialSelected.includes(id));
      const toRemove = initialSelected.filter(id => !selected.includes(id));
      if (toAdd.length > 0) {
        await api.post(`/content/${item.id}/assign`, { studentIds: toAdd });
      }
      for (const studentId of toRemove) {
        await api.delete(`/content/${item.id}/assign/${studentId}`);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update assignments.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Assign "{item.title}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <p className="text-xs text-gray-500 mb-3">Select which of your students should receive this content.</p>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">You don't have any students assigned to you yet.</div>
          ) : (
            <div className="space-y-2">
              {students.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} className="rounded text-primary-700" />
                  <span className="text-sm text-gray-800">{s.fullName}</span>
                  <span className="text-xs text-gray-400">({s.email})</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }) {
  const [form, setForm] = useState({ title: '', category: 'Alphabet', difficulty: 'beginner', classLevel: '', contentType: '', isShared: false });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    if (!form.classLevel) { setError('Please select a class.'); return; }
    if (!form.contentType) { setError('Please select a content type.'); return; }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('difficulty', form.difficulty);
      fd.append('classLevel', form.classLevel);
      fd.append('contentType', form.contentType);
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select className="input" value={form.classLevel} onChange={e => setForm(f => ({ ...f, classLevel: e.target.value }))} required>
                <option value="">Select class...</option>
                {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
              <select className="input" value={form.contentType} onChange={e => setForm(f => ({ ...f, contentType: e.target.value }))} required>
                <option value="">Select type...</option>
                {CONTENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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

// ── SET CLASS/TYPE ON LEGACY CONTENT MISSING THEM ──────────────────────────────
function SetMetaModal({ item, onClose, onSaved }) {
  const [classLevel, setClassLevel] = useState(item.classLevel || '');
  const [contentType, setContentType] = useState(item.contentType || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!classLevel || !contentType) { setError('Both fields are required.'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.patch(`/content/${item.id}`, { classLevel, contentType });
      onSaved(data.content);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Set Class & Content Type</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <p className="text-xs text-gray-500">This item was uploaded before Class and Content Type were required. Please set them now.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select className="input" value={classLevel} onChange={e => setClassLevel(e.target.value)}>
              <option value="">Select class...</option>
              {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
            <select className="input" value={contentType} onChange={e => setContentType(e.target.value)}>
              <option value="">Select type...</option>
              {CONTENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
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
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [assignItem, setAssignItem] = useState(null);
  const [setMetaItem, setSetMetaItem] = useState(null);

  const load = async () => {
    try {
      const params = new URLSearchParams({ sort });
      if (filterCategory) params.append('category', filterCategory);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      if (filterClass) params.append('classLevel', filterClass);
      if (filterType) params.append('contentType', filterType);
      const { data } = await api.get(`/content?${params}`);
      setContent(data.content);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [sort, filterCategory, filterDifficulty, filterClass, filterType]);

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
        <select className="input max-w-[140px] text-sm" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All classes</option>
          {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className="input max-w-[160px] text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All content types</option>
          {CONTENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
            <ContentCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onShare={handleShare}
              onOpenTeacherShare={setShareItem}
              onOpenAssign={setAssignItem}
              onOpenSetMeta={setSetMetaItem}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={load} />}
      {shareItem && <TeacherShareModal item={shareItem} onClose={() => setShareItem(null)} />}
      {assignItem && <AssignModal item={assignItem} onClose={() => setAssignItem(null)} />}
      {setMetaItem && (
        <SetMetaModal
          item={setMetaItem}
          onClose={() => setSetMetaItem(null)}
          onSaved={updated => setContent(c => c.map(i => i.id === updated.id ? { ...i, ...updated } : i))}
        />
      )}
    </div>
  );
}
