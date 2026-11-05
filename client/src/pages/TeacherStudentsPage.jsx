import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import Pagination from '../components/Pagination';
import { CLASS_LEVELS } from './AdminUsersPage';
import { formatIST, formatISTDate } from '../utils/formatTime';

const PAGE_SIZE = 20;
const classLabel = v => CLASS_LEVELS.find(c => c.value === v)?.label || '';

// Teachers see and manage their own students; admins pick any teacher
// (/teacher/students?teacher=<id>) and can manage that teacher's students too.
export default function TeacherStudentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();

  const [teachers, setTeachers] = useState([]);
  const teacherId = isAdmin ? (searchParams.get('teacher') || '') : user.id;
  const teacher = isAdmin ? teachers.find(t => t.id === teacherId) : user;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgress, setStudentProgress] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', age: '', classLevel: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [mode, setMode] = useState('existing'); // 'existing' | 'invite' (invite is teacher-only)
  const [allStudents, setAllStudents] = useState([]);
  const [addStudentId, setAddStudentId] = useState('');
  const [adding, setAdding] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  const flash = msg => { setNotice(msg); setTimeout(() => setNotice(''), 3000); };

  // Admin: list of teachers for the picker.
  useEffect(() => {
    if (!isAdmin) return;
    api.get('/users?role=teacher').then(({ data }) => setTeachers(data.users)).catch(() => {});
  }, [isAdmin]);

  const load = async () => {
    if (!teacherId) { setStudents([]); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.get(`/users/${teacherId}/students`);
      setStudents(data.students);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load students.');
    } finally { setLoading(false); }
  };
  useEffect(() => { setPage(1); setSearch(''); load(); }, [teacherId]);

  // Everyone who could be added (flattened to child profiles).
  const loadAllStudents = async () => {
    try {
      const { data } = await api.get('/users?role=student');
      setAllStudents(data.users.flatMap(u =>
        (u.profiles && u.profiles.length ? u.profiles : [{ id: u.id, fullName: u.fullName }])
          .map(p => ({ ...p, email: u.email }))
      ));
    } catch {}
  };
  useEffect(() => { if (teacherId) loadAllStudents(); }, [teacherId]);

  const available = useMemo(
    () => allStudents.filter(s => !students.some(x => x.id === s.id)),
    [allStudents, students]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter(s => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : students;
  }, [students, search]);
  useEffect(() => { setPage(1); }, [search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const handleAdd = async e => {
    e.preventDefault();
    if (!addStudentId) return;
    setAdding(true); setError('');
    try {
      await api.post(`/users/${teacherId}/students`, { studentId: addStudentId });
      setAddStudentId('');
      await load();
      flash('Student added.');
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to add student.'); }
    finally { setAdding(false); }
  };

  const handleRemove = async s => {
    const who = isAdmin ? `${teacher?.fullName || 'this teacher'}` : 'your class';
    if (!confirm(`Remove ${s.fullName} from ${who}? Their account and progress are not deleted.`)) return;
    setError('');
    try {
      await api.delete(`/users/${teacherId}/students/${s.id}`);
      setStudents(list => list.filter(x => x.id !== s.id));
      flash(`${s.fullName} removed.`);
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to remove student.'); }
  };

  const openEdit = s => {
    setEditStudent(s);
    setEditForm({ fullName: s.fullName, age: s.age ?? '', classLevel: s.classLevel || '' });
    setEditError('');
  };
  const handleSaveEdit = async e => {
    e.preventDefault();
    setSaving(true); setEditError('');
    try {
      const payload = {
        fullName: editForm.fullName,
        age: editForm.age === '' ? '' : Number(editForm.age),
        classLevel: editForm.classLevel,
      };
      const { data } = await api.patch(`/users/${teacherId}/students/${editStudent.id}`, payload);
      setStudents(list => list.map(x => x.id === editStudent.id
        ? { ...x, fullName: data.profile.fullName, age: data.profile.age, classLevel: data.profile.classLevel } : x));
      setEditStudent(null);
      flash('Student updated.');
    } catch (err) { setEditError(err.response?.data?.error?.message || 'Could not save changes.'); }
    finally { setSaving(false); }
  };

  const viewProgress = async student => {
    setSelectedStudent(student);
    setLoadingProgress(true);
    try {
      const { data } = await api.get(`/users/${student.id}/progress`);
      setStudentProgress(data.progress);
    } catch { setStudentProgress([]); }
    finally { setLoadingProgress(false); }
  };

  const handleInvite = async e => {
    e.preventDefault();
    setInviting(true); setInviteMsg('');
    try {
      await api.post('/auth/invite', { email: inviteEmail, fullName: inviteName });
      setInviteMsg(`Invite sent to ${inviteEmail}`);
      setInviteEmail(''); setInviteName('');
    } catch (err) { setInviteMsg(err.response?.data?.error?.message || 'Failed to send invite.'); }
    finally { setInviting(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            <span className="font-tamil">{isAdmin ? 'ஆசிரியரின் மாணவர்கள்' : 'என் மாணவர்கள்'}</span>
          </h1>
          <p className="text-sm text-gray-500">{isAdmin ? "Teacher's Students" : 'My Students'}</p>
        </div>
        {isAdmin && (
          <select className="input max-w-xs text-sm" value={teacherId}
            onChange={e => setSearchParams(e.target.value ? { teacher: e.target.value } : {})}>
            <option value="">Select a teacher...</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>)}
          </select>
        )}
      </div>

      {notice && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{notice}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {isAdmin && !teacherId ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🎓</div>
          <p className="text-sm">Choose a teacher above to see and manage their students.</p>
        </div>
      ) : (
        <>
          {/* Add students */}
          <div className="card mb-6">
            {!isAdmin && (
              <div className="flex gap-2 mb-4">
                <button onClick={() => setMode('existing')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'existing' ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  🎓 Add Existing Student
                </button>
                <button onClick={() => setMode('invite')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'invite' ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  ✉️ Invite New Student
                </button>
              </div>
            )}

            {(isAdmin || mode === 'existing') ? (
              <>
                <h2 className="font-semibold text-gray-800 mb-1 text-sm">
                  {isAdmin ? `Add a student to ${teacher?.fullName || 'this teacher'}` : 'Add a student who already has an account'}
                </h2>
                <p className="text-xs text-gray-500 mb-3">Students can be assigned to more than one teacher.</p>
                <form onSubmit={handleAdd} className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-[200px]">
                    <select className="input text-sm" value={addStudentId} onChange={e => setAddStudentId(e.target.value)} required>
                      <option value="">Select a student...</option>
                      {available.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={adding || !addStudentId} className="btn-primary text-sm">
                    {adding ? 'Adding...' : isAdmin ? 'Add to Class' : 'Add to My Class'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-gray-800 mb-3 text-sm">
                  <span className="font-tamil">மாணவரை அழை</span> / Invite a New Student
                </h2>
                <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
                  <input type="text" className="input max-w-[180px] text-sm" placeholder="Student name"
                    value={inviteName} onChange={e => setInviteName(e.target.value)} required />
                  <input type="email" className="input max-w-[220px] text-sm" placeholder="student@email.com"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                  <button type="submit" disabled={inviting} className="btn-primary text-sm">
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </button>
                </form>
                {inviteMsg && <p className="text-sm mt-2 text-primary-700">{inviteMsg}</p>}
              </>
            )}
          </div>

          {/* Student list */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <input type="search" className="input max-w-xs text-sm" placeholder="Search assigned students..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <span className="text-sm text-gray-500">{students.length} assigned</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎓</div>
              <p className="font-tamil">மாணவர்கள் இல்லை</p>
              <p className="text-sm">{students.length === 0 ? 'No students assigned yet.' : 'No students match your search.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(s => (
                <div key={s.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-800 font-bold">{s.fullName[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-900">{s.fullName}</div>
                        <div className="text-xs text-gray-500 truncate">{s.email}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {[classLabel(s.classLevel), s.age ? `Age ${s.age}` : ''].filter(Boolean).join(' · ') || 'No class set'}
                          {' · '}Last active: {s.lastLoginAt ? formatIST(s.lastLoginAt) : 'Never'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => viewProgress(s)} className="btn-secondary text-xs py-1.5 px-3">📊 Progress</button>
                      <button onClick={() => openEdit(s)} className="btn-secondary text-xs py-1.5 px-3">✏️ Edit</button>
                      <button onClick={() => handleRemove(s)} className="text-xs py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onChange={setPage} noun="students" />
        </>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────────── */}
      {editStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Edit Student</h2>
              <button type="button" onClick={() => setEditStudent(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{editError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input className="input" value={editForm.fullName} minLength={2} required
                onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input type="number" min="1" max="120" className="input" value={editForm.age}
                  onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select className="input" value={editForm.classLevel}
                  onChange={e => setEditForm(f => ({ ...f, classLevel: e.target.value }))}>
                  <option value="">Not set</option>
                  {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">Email and password are managed by an admin.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditStudent(null)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── PROGRESS MODAL ───────────────────────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-800">
                  <span className="font-tamil">முன்னேற்றம்</span> / Progress
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedStudent.fullName}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingProgress ? (
                <div className="text-center py-8 text-gray-400">Loading progress...</div>
              ) : studentProgress.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="font-tamil">முன்னேற்றம் இல்லை</p>
                  <p className="text-sm">No lessons started yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentProgress.map(p => (
                    <div key={p.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{p.content?.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {p.content?.category} · Last viewed: {formatISTDate(p.lastAccessedAt)}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          p.percentComplete >= 100 ? 'bg-green-100 text-green-800' :
                          p.percentComplete > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {p.percentComplete >= 100 ? '✅ Complete' :
                           p.percentComplete > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, p.percentComplete)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Page {p.lastPageViewed} of {p.content?.pageCount || '?'}</span>
                        <span>{Math.round(p.percentComplete)}% complete</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
