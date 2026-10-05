import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { formatIST, formatISTDate } from '../utils/formatTime';

export const CLASS_LEVELS = [
  { value: 'kg', label: 'KG' },
  { value: 'class_1', label: '1st' },
  { value: 'class_2', label: '2nd' },
  { value: 'class_3', label: '3rd' },
  { value: 'class_4', label: '4th' },
  { value: 'class_5', label: '5th' },
  { value: 'class_6', label: '6th' },
  { value: 'class_7', label: '7th' },
  { value: 'class_8', label: '8th' },
];

// ── MODALS ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── ADMIN USERS ───────────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [transferUser, setTransferUser] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({ role: 'student', fullName: '', email: '', password: '', age: '', parentPhone: '', classLevel: '' });
  const [editForm, setEditForm] = useState({ fullName: '', email: '', parentPhone: '' });
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [resetMode, setResetMode] = useState('generate'); // 'generate' | 'manual'
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [assignTeacher, setAssignTeacher] = useState(null);
  const [assignProfileId, setAssignProfileId] = useState('');

  // Profile management (student accounts can have multiple child profiles)
  const [editProfiles, setEditProfiles] = useState([]);
  const [newProfile, setNewProfile] = useState({ fullName: '', age: '', classLevel: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editingProfileForm, setEditingProfileForm] = useState({ fullName: '', age: '', classLevel: '' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await api.get('/users');
    setUsers(data.users);
    setLoading(false);
  };

  const showSuccess = msg => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...createForm,
        age: createForm.age ? parseInt(createForm.age) : undefined,
        classLevel: createForm.classLevel || undefined,
      };
      await api.post('/users', payload);
      await load();
      setShowCreate(false);
      setCreateForm({ role: 'student', fullName: '', email: '', password: '', age: '', parentPhone: '', classLevel: '' });
      showSuccess('User created successfully.');
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to create user.'); }
    finally { setSaving(false); }
  };

  // ── EDIT ───────────────────────────────────────────────────────────────────
  const openEdit = u => {
    setEditUser(u);
    setEditForm({
      fullName: u.fullName,
      email: u.email,
      parentPhone: u.parentPhone || '',
    });
    setEditProfiles(u.profiles || []);
    setNewProfile({ fullName: '', age: '', classLevel: '' });
    setEditingProfileId(null);
    setProfileError('');
    setError('');
  };

  const handleEdit = async e => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { fullName: editForm.fullName };
      if (editUser.role === 'student') {
        payload.parentPhone = editForm.parentPhone;
      }
      const { data } = await api.patch(`/users/${editUser.id}`, payload);
      setUsers(us => us.map(u => u.id === editUser.id ? { ...u, ...data.user } : u));
      setEditUser(null);
      showSuccess('User details updated.');
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to update user.'); }
    finally { setSaving(false); }
  };

  // ── STUDENT PROFILES (children under a student account) ─────────────────────
  const syncEditedProfilesIntoUsers = profiles => {
    setEditProfiles(profiles);
    setUsers(us => us.map(u => u.id === editUser.id ? { ...u, profiles } : u));
  };

  const handleAddProfile = async e => {
    e.preventDefault();
    if (!newProfile.fullName.trim()) { setProfileError('Please enter a name.'); return; }
    setProfileBusy(true); setProfileError('');
    try {
      const payload = { fullName: newProfile.fullName };
      if (newProfile.age !== '') payload.age = parseInt(newProfile.age, 10);
      if (newProfile.classLevel !== '') payload.classLevel = newProfile.classLevel;
      const { data } = await api.post(`/users/${editUser.id}/profiles`, payload);
      syncEditedProfilesIntoUsers([...editProfiles, data.profile]);
      setNewProfile({ fullName: '', age: '', classLevel: '' });
      showSuccess(`Added student profile "${data.profile.fullName}".`);
    } catch (err) { setProfileError(err.response?.data?.error?.message || 'Failed to add student.'); }
    finally { setProfileBusy(false); }
  };

  const openEditProfile = p => {
    setEditingProfileId(p.id);
    setEditingProfileForm({ fullName: p.fullName, age: p.age ?? '', classLevel: p.classLevel || '' });
    setProfileError('');
  };

  const handleSaveProfile = async e => {
    e.preventDefault();
    setProfileBusy(true); setProfileError('');
    try {
      const payload = { fullName: editingProfileForm.fullName };
      payload.age = editingProfileForm.age === '' ? null : parseInt(editingProfileForm.age, 10);
      payload.classLevel = editingProfileForm.classLevel === '' ? null : editingProfileForm.classLevel;
      const { data } = await api.patch(`/users/${editUser.id}/profiles/${editingProfileId}`, payload);
      syncEditedProfilesIntoUsers(editProfiles.map(p => p.id === editingProfileId ? data.profile : p));
      setEditingProfileId(null);
      showSuccess('Student profile updated.');
    } catch (err) { setProfileError(err.response?.data?.error?.message || 'Failed to update student.'); }
    finally { setProfileBusy(false); }
  };

  const handleDeleteProfile = async p => {
    if (editProfiles.length <= 1) { setProfileError('An account must keep at least one student profile.'); return; }
    if (!confirm(`Remove student profile "${p.fullName}"? Their progress, quizzes, and assignments will be removed too. This cannot be undone.`)) return;
    setProfileBusy(true); setProfileError('');
    try {
      await api.delete(`/users/${editUser.id}/profiles/${p.id}`);
      syncEditedProfilesIntoUsers(editProfiles.filter(x => x.id !== p.id));
      showSuccess(`Removed student profile "${p.fullName}".`);
    } catch (err) { setProfileError(err.response?.data?.error?.message || 'Failed to remove student.'); }
    finally { setProfileBusy(false); }
  };

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  const openReset = u => {
    setResetUser(u);
    setResetForm({ password: '', confirm: '' });
    setResetMode('generate');
    setGeneratedPassword('');
    setError('');
  };

  const handleReset = async e => {
    e.preventDefault();
    if (resetMode === 'manual') {
      if (resetForm.password !== resetForm.confirm) { setError('Passwords do not match.'); return; }
      if (resetForm.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    }
    setSaving(true); setError('');
    try {
      const { data } = await api.post(`/users/${resetUser.id}/reset-password`,
        resetMode === 'manual' ? { newPassword: resetForm.password } : {});
      if (data.generatedPassword) {
        // Show it once, right here — the server never stores or logs the
        // plaintext, so this is the only chance to see or copy it.
        setGeneratedPassword(data.generatedPassword);
      } else {
        setResetUser(null);
        showSuccess(`Password reset for ${resetUser.fullName}.`);
      }
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to reset password.'); }
    finally { setSaving(false); }
  };

  // ── TRANSFER TEACHER ───────────────────────────────────────────────────────
  const openTransfer = u => { setTransferUser(u); setTransferTo(''); setError(''); };

  const handleTransfer = async e => {
    e.preventDefault();
    if (!transferTo) { setError('Please select a teacher to transfer to.'); return; }
    if (!confirm(`Transfer ALL students and content from ${transferUser.fullName} to the selected teacher? This cannot be undone.`)) return;
    setSaving(true); setError('');
    try {
      await api.post(`/users/${transferUser.id}/transfer`, { toTeacherId: transferTo });
      setTransferUser(null);
      showSuccess('Transfer completed successfully.');
      await load();
    } catch (err) { setError(err.response?.data?.error?.message || 'Transfer failed.'); }
    finally { setSaving(false); }
  };

  // ── ASSIGN STUDENT TO TEACHER ──────────────────────────────────────────────
  const openAssign = u => { setAssignTeacher(u); setAssignProfileId(''); setError(''); };

  // Student accounts can hold several child profiles — flatten to a
  // per-profile picker since assignment (and all student-scoped data) is
  // keyed by profile, not by account.
  const studentProfileOptions = users
    .filter(u => u.role === 'student')
    .flatMap(u => (u.profiles && u.profiles.length ? u.profiles : [{ id: u.id, fullName: u.fullName }])
      .map(p => ({ ...p, accountEmail: u.email })));

  const handleAssign = async e => {
    e.preventDefault();
    if (!assignProfileId) { setError('Please select a student.'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/users/${assignTeacher.id}/students`, { studentId: assignProfileId });
      setAssignTeacher(null);
      showSuccess(`Student assigned to ${assignTeacher.fullName}.`);
    } catch (err) { setError(err.response?.data?.error?.message || 'Assignment failed.'); }
    finally { setSaving(false); }
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const handleDelete = async u => {
    if (!confirm(`Delete ${u.fullName}? This cannot be undone.`)) return;
    await api.delete(`/users/${u.id}`);
    setUsers(us => us.filter(x => x.id !== u.id));
    showSuccess('User deleted.');
  };

  // ── SUSPEND ────────────────────────────────────────────────────────────────
  const handleToggleSuspend = async u => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    await api.patch(`/users/${u.id}`, { status: newStatus });
    setUsers(us => us.map(x => x.id === u.id ? { ...x, status: newStatus } : x));
  };

  const teachers = users.filter(u => u.role === 'teacher');
  const filtered = users.filter(u => {
    if (filter && u.role !== filter) return false;
    if (search && !u.fullName.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleBadge = {
    admin: 'bg-purple-100 text-purple-800',
    teacher: 'bg-blue-100 text-blue-800',
    student: 'bg-green-100 text-green-800'
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900"><span className="font-tamil">பயனர் நிர்வாகம்</span></h1>
          <p className="text-sm text-gray-500">User Management</p>
        </div>
        <button onClick={() => { setShowCreate(true); setError(''); }} className="btn-primary text-sm">+ Create User</button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{successMsg}</div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="search" className="input max-w-xs text-sm" placeholder="Search by name or email..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          {['', 'admin', 'teacher', 'student'].map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === r ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {r || 'All'} {r ? `(${users.filter(u => u.role === r).length})` : `(${users.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      {loading ? <div className="text-center py-12 text-gray-400">Loading users...</div> : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className="card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-800 font-bold text-sm">{u.fullName[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{u.fullName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge[u.role]}`}>{u.role}</span>
                      {u.status === 'suspended' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">suspended</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                  <button onClick={() => openEdit(u)}
                    className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                    ✏️ Edit
                  </button>
                  <button onClick={() => openReset(u)}
                    className="text-xs text-gray-500 hover:text-amber-600 px-2 py-1 rounded hover:bg-amber-50 transition-colors">
                    🔑 Reset Password
                  </button>
                  {u.role === 'teacher' && (
                    <>
                      <button onClick={() => openAssign(u)}
                        className="text-xs text-gray-500 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors">
                        🎓 Assign Student
                      </button>
                      <button onClick={() => openTransfer(u)}
                        className="text-xs text-gray-500 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors">
                        🔄 Transfer
                      </button>
                    </>
                  )}
                  {u.id !== currentUser.id && (
                    <>
                      <button onClick={() => handleToggleSuspend(u)}
                        className="text-xs text-gray-500 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                        {u.status === 'active' ? '⏸ Suspend' : '▶️ Activate'}
                      </button>
                      <button onClick={() => handleDelete(u)}
                        className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        🗑 Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">No users found.</div>
          )}
        </div>
      )}

      {/* ── CREATE MODAL ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Create User" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="input" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" className="input" value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="input" minLength={8} placeholder="Minimum 8 characters" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            {createForm.role === 'student' && <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input type="number" className="input" value={createForm.age} onChange={e => setCreateForm(f => ({ ...f, age: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone Number</label>
                <input type="text" maxLength={50} className="input" placeholder="e.g. +91 98765 43210" value={createForm.parentPhone} onChange={e => setCreateForm(f => ({ ...f, parentPhone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select className="input" value={createForm.classLevel} onChange={e => setCreateForm(f => ({ ...f, classLevel: e.target.value }))}>
                  <option value="">Not set</option>
                  {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────────── */}
      {editUser && (
        <Modal title={`Edit — ${editUser.fullName}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input type="text" className="input" value={editForm.fullName}
                onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} required />
              {editUser.role === 'student' && (
                <p className="text-xs text-gray-400 mt-1">This is the login account's name (usually a parent/guardian). Manage individual students below.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input bg-gray-50 text-gray-400 cursor-not-allowed" value={editForm.email} disabled />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed to preserve login integrity.</p>
            </div>
            {editUser.role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone Number</label>
                <input type="text" maxLength={50} className="input" placeholder="e.g. +91 98765 43210" value={editForm.parentPhone}
                  onChange={e => setEditForm(f => ({ ...f, parentPhone: e.target.value }))} />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>

          {/* ── STUDENT PROFILES ──────────────────────────────────────────────── */}
          {editUser.role === 'student' && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Student on this Login</h3>
              <p className="text-xs text-gray-500 mb-3">
                Each login is for one child. To add another child, create a separate account for them.
              </p>
              {profileError && <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{profileError}</div>}

              <div className="space-y-2 mb-4">
                {editProfiles.map(p => (
                  <div key={p.id} className="border border-gray-100 rounded-lg p-3">
                    {editingProfileId === p.id ? (
                      <form onSubmit={handleSaveProfile} className="space-y-2">
                        <input type="text" className="input text-sm" value={editingProfileForm.fullName}
                          onChange={e => setEditingProfileForm(f => ({ ...f, fullName: e.target.value }))} required />
                        <div className="flex gap-2">
                          <input type="number" className="input text-sm" placeholder="Age" value={editingProfileForm.age}
                            onChange={e => setEditingProfileForm(f => ({ ...f, age: e.target.value }))} />
                          <select className="input text-sm" value={editingProfileForm.classLevel}
                            onChange={e => setEditingProfileForm(f => ({ ...f, classLevel: e.target.value }))}>
                            <option value="">Class: Not set</option>
                            {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingProfileId(null)} className="btn-secondary text-xs flex-1 py-1.5">Cancel</button>
                          <button type="submit" disabled={profileBusy} className="btn-primary text-xs flex-1 py-1.5">{profileBusy ? 'Saving...' : 'Save'}</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{p.fullName}</div>
                          <div className="text-xs text-gray-500">
                            {p.age ? `Age ${p.age}` : ''}{p.age && p.classLevel ? ' · ' : ''}
                            {p.classLevel ? CLASS_LEVELS.find(c => c.value === p.classLevel)?.label : ''}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button type="button" onClick={() => openEditProfile(p)}
                            className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">✏️ Edit</button>
                          <button type="button" onClick={() => handleDeleteProfile(p)} disabled={profileBusy}
                            className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">🗑 Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {editProfiles.length < 1 ? (
                <form onSubmit={handleAddProfile} className="space-y-2 bg-gray-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-600">+ Add Student</label>
                  <input type="text" className="input text-sm" placeholder="Student's name" value={newProfile.fullName}
                    onChange={e => setNewProfile(f => ({ ...f, fullName: e.target.value }))} />
                  <div className="flex gap-2">
                    <input type="number" className="input text-sm" placeholder="Age" value={newProfile.age}
                      onChange={e => setNewProfile(f => ({ ...f, age: e.target.value }))} />
                    <select className="input text-sm" value={newProfile.classLevel}
                      onChange={e => setNewProfile(f => ({ ...f, classLevel: e.target.value }))}>
                      <option value="">Class: Not set</option>
                      {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={profileBusy} className="btn-primary text-xs w-full py-1.5">
                    {profileBusy ? 'Adding...' : '+ Add Student'}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                  This login already has a student. Create a new account for another child.
                </p>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* ── RESET PASSWORD MODAL ─────────────────────────────────────────────── */}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.fullName}`} onClose={() => setResetUser(null)}>
          {generatedPassword ? (
            // One-time reveal: this is the only moment this password is ever
            // visible — it's hashed before this response is even sent, and
            // nothing in the system can show it again after this modal closes.
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠️ Copy this now — it won't be shown again. Share it with {resetUser.fullName} or their parent.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono tracking-wide bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-center text-gray-900">
                  {generatedPassword}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(generatedPassword)}
                  className="btn-secondary py-3 px-3"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setResetUser(null); showSuccess(`Password reset for ${resetUser.fullName}.`); }}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Set a new password for <strong>{resetUser.fullName}</strong> ({resetUser.email}).
                They will need to use this new password to log in. Nobody — including admins — can see
                their current password; it's one-way encrypted and can only be replaced, not revealed.
              </p>

              <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setResetMode('generate')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resetMode === 'generate' ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  🎲 Generate for me
                </button>
                <button type="button" onClick={() => setResetMode('manual')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resetMode === 'manual' ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  ✏️ Type my own
                </button>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
                {resetMode === 'generate' ? (
                  <p className="text-xs text-gray-500">
                    A secure, easy-to-read password will be created and shown to you once you click below.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input type="password" className="input" minLength={8} placeholder="Minimum 8 characters"
                        value={resetForm.password} onChange={e => setResetForm(f => ({ ...f, password: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <input type="password" className="input"
                        value={resetForm.confirm} onChange={e => setResetForm(f => ({ ...f, confirm: e.target.value }))} required />
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setResetUser(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}

      {/* ── ASSIGN STUDENT MODAL ─────────────────────────────────────────────── */}
      {assignTeacher && (
        <Modal title={`Assign Student to ${assignTeacher.fullName}`} onClose={() => setAssignTeacher(null)}>
          <p className="text-sm text-gray-500 mb-4">
            Select an existing student to assign to <strong>{assignTeacher.fullName}</strong>.
            The student must already have an account. Students can be assigned to multiple teachers.
          </p>
          <form onSubmit={handleAssign} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
              <select className="input" value={assignProfileId} onChange={e => setAssignProfileId(e.target.value)} required>
                <option value="">Choose a student...</option>
                {studentProfileOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName} ({p.accountEmail})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAssignTeacher(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving || !assignProfileId} className="btn-primary flex-1">
                {saving ? 'Assigning...' : 'Assign Student'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── TRANSFER MODAL ───────────────────────────────────────────────────── */}
      {transferUser && (
        <Modal title={`Transfer Teacher — ${transferUser.fullName}`} onClose={() => setTransferUser(null)}>
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>⚠️ What this does:</strong> All students assigned to <strong>{transferUser.fullName}</strong> and
            all content they uploaded will be transferred to the selected teacher. This cannot be undone.
          </div>
          <form onSubmit={handleTransfer} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to Teacher</label>
              <select className="input" value={transferTo} onChange={e => setTransferTo(e.target.value)} required>
                <option value="">Select a teacher...</option>
                {teachers.filter(t => t.id !== transferUser.id).map(t => (
                  <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setTransferUser(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving || !transferTo} className="btn-primary flex-1 bg-amber-600 hover:bg-amber-700">
                {saving ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── TEACHER STUDENTS WITH PROGRESS ────────────────────────────────────────────
export function TeacherStudentsPage() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgress, setStudentProgress] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [addStudentId, setAddStudentId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await api.get(`/users/${user.id}/students`);
    setStudents(data.students);
    setLoading(false);
  };

  const loadAllStudents = async () => {
    try {
      const { data } = await api.get('/users?role=student');
      // Each student account may hold several child profiles — the picker
      // needs to offer individual students, not accounts, since assignment
      // is keyed by profile.
      const flattened = data.users.flatMap(u =>
        (u.profiles && u.profiles.length ? u.profiles : [{ id: u.id, fullName: u.fullName }])
          .map(p => ({ ...p, email: u.email }))
      );
      setAllStudents(flattened);
    } catch {}
  };

  const handleAddExisting = async e => {
    e.preventDefault();
    if (!addStudentId) return;
    setAdding(true); setAddMsg('');
    try {
      await api.post(`/users/${user.id}/students`, { studentId: addStudentId });
      setAddMsg('Student added successfully.');
      setAddStudentId('');
      await load();
      setTimeout(() => { setAddMsg(''); setShowAddExisting(false); }, 2000);
    } catch (err) { setAddMsg(err.response?.data?.error?.message || 'Failed to add student.'); }
    finally { setAdding(false); }
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900"><span className="font-tamil">என் மாணவர்கள்</span></h1>
        <p className="text-sm text-gray-500">My Students</p>
      </div>

      {/* Add Students Card */}
      <div className="card mb-6">
        {/* Tab toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowAddExisting(false)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!showAddExisting ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            ✉️ Invite New Student
          </button>
          <button onClick={() => { setShowAddExisting(true); loadAllStudents(); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showAddExisting ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            🎓 Add Existing Student
          </button>
        </div>

        {!showAddExisting ? (
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
        ) : (
          <>
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">
              Add a Student Who Already Has an Account
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Select a student who has already registered or been created by an admin.
            </p>
            <form onSubmit={handleAddExisting} className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[200px]">
                <select className="input text-sm" value={addStudentId}
                  onChange={e => setAddStudentId(e.target.value)} required>
                  <option value="">Select a student...</option>
                  {allStudents
                    .filter(s => !students.find(existing => existing.id === s.id))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
                    ))}
                </select>
              </div>
              <button type="submit" disabled={adding || !addStudentId} className="btn-primary text-sm">
                {adding ? 'Adding...' : 'Add to My Class'}
              </button>
            </form>
            {addMsg && (
              <p className={`text-sm mt-2 ${addMsg.includes('success') ? 'text-green-700' : 'text-red-600'}`}>{addMsg}</p>
            )}
          </>
        )}
      </div>

      {/* Student list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🎓</div>
          <p className="font-tamil">மாணவர்கள் இல்லை</p>
          <p className="text-sm">No students assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map(s => (
            <div key={s.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-800 font-bold">{s.fullName[0]}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{s.fullName}</div>
                    <div className="text-xs text-gray-500">{s.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Last active: {s.lastLoginAt ? formatIST(s.lastLoginAt) : 'Never'}
                    </div>
                  </div>
                </div>
                <button onClick={() => viewProgress(s)} className="btn-secondary text-xs py-1.5 px-3">
                  📊 <span className="font-tamil">முன்னேற்றம்</span> / View Progress
                </button>
              </div>
            </div>
          ))}
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

// ── ADMIN ANNOUNCEMENTS ───────────────────────────────────────────────────────
export function AdminAnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/announcements').then(r => setItems(r.data.announcements)); }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    const { data } = await api.post('/announcements', form);
    setItems(a => [data.announcement, ...a]);
    setForm({ title: '', body: '' });
    setSaving(false);
  };

  const handleDelete = async id => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    setItems(a => a.filter(i => i.id !== id));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900"><span className="font-tamil">அறிவிப்புகள்</span></h1>
        <p className="text-sm text-gray-500">Announcements</p>
      </div>
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-3 text-sm">New Announcement</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <input type="text" className="input text-sm" placeholder="Title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <textarea className="input text-sm h-24 resize-none" placeholder="Message..."
            value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Posting...' : 'Post Announcement'}
          </button>
        </form>
      </div>
      <div className="space-y-3">
        {items.map(a => (
          <div key={a.id} className="card border-l-4 border-primary-600">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-gray-800 text-sm">{a.title}</div>
                <p className="text-gray-600 text-sm mt-1">{a.body}</p>
                <div className="text-xs text-gray-400 mt-2">{formatIST(a.createdAt)}</div>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-600 flex-shrink-0">🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user, updateUser, profiles, activeProfileId, reloadProfiles, switchProfile } = useAuthStore();
  const [form, setForm] = useState({ fullName: user?.fullName || '', parentPhone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Per-child profile management (student accounts only)
  const [newProfile, setNewProfile] = useState({ fullName: '', age: '', classLevel: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editingProfileForm, setEditingProfileForm] = useState({ fullName: '', age: '', classLevel: '' });

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/users/${user.id}`).then(({ data }) => {
      setForm({
        fullName: data.user.fullName || '',
        parentPhone: data.user.parentPhone || '',
      });
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { fullName: form.fullName };
      if (user?.role === 'student') payload.parentPhone = form.parentPhone;

      const { data } = await api.patch(`/users/${user.id}`, payload);
      updateUser({ fullName: data.user.fullName });
      setMsg('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save changes.');
    }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  // ── MY STUDENTS (self-service: add/edit the children under this login) ─────
  const handleAddProfile = async e => {
    e.preventDefault();
    if (!newProfile.fullName.trim()) { setProfileError('Please enter a name.'); return; }
    setProfileBusy(true); setProfileError('');
    try {
      const payload = { fullName: newProfile.fullName };
      if (newProfile.age !== '') payload.age = parseInt(newProfile.age, 10);
      if (newProfile.classLevel !== '') payload.classLevel = newProfile.classLevel;
      await api.post(`/users/${user.id}/profiles`, payload);
      await reloadProfiles();
      setNewProfile({ fullName: '', age: '', classLevel: '' });
      setMsg('Student added successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setProfileError(err.response?.data?.error?.message || 'Failed to add student.'); }
    finally { setProfileBusy(false); }
  };

  const openEditProfile = p => {
    setEditingProfileId(p.id);
    setEditingProfileForm({ fullName: p.fullName, age: p.age ?? '', classLevel: p.classLevel || '' });
    setProfileError('');
  };

  const handleSaveProfile = async e => {
    e.preventDefault();
    setProfileBusy(true); setProfileError('');
    try {
      const payload = { fullName: editingProfileForm.fullName };
      payload.age = editingProfileForm.age === '' ? null : parseInt(editingProfileForm.age, 10);
      payload.classLevel = editingProfileForm.classLevel === '' ? null : editingProfileForm.classLevel;
      await api.patch(`/users/${user.id}/profiles/${editingProfileId}`, payload);
      await reloadProfiles();
      setEditingProfileId(null);
    } catch (err) { setProfileError(err.response?.data?.error?.message || 'Failed to update student.'); }
    finally { setProfileBusy(false); }
  };

  const handleDeleteProfile = async p => {
    if (profiles.length <= 1) { setProfileError('You must keep at least one student profile.'); return; }
    if (!confirm(`Remove "${p.fullName}"? Their progress, quizzes, and assignments will be removed too. This cannot be undone.`)) return;
    setProfileBusy(true); setProfileError('');
    try {
      await api.delete(`/users/${user.id}/profiles/${p.id}`);
      await reloadProfiles();
      // If the profile that was just deleted was the active one, hop to
      // whichever profile is left so the session stays valid.
      if (p.id === activeProfileId) {
        const remaining = profiles.filter(x => x.id !== p.id);
        if (remaining[0]) { await switchProfile(remaining[0].id); window.location.href = '/dashboard'; return; }
      }
    } catch (err) { setProfileError(err.response?.data?.error?.message || 'Failed to remove student.'); }
    finally { setProfileBusy(false); }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900"><span className="font-tamil">சுயவிவரம்</span></h1>
        <p className="text-sm text-gray-500">Profile</p>
      </div>
      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
          <div className="w-14 h-14 bg-primary-900 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">{user?.fullName?.[0]}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user?.fullName}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <div className="text-xs text-primary-700 capitalize mt-0.5">{user?.role}</div>
          </div>
        </div>
        {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
          <form onSubmit={handleSave} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {user?.role === 'student' ? 'Account Name (parent/guardian)' : 'Full Name'}
              </label>
              <input type="text" className="input" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
            </div>
            {user?.role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone Number</label>
                <input type="text" maxLength={50} className="input" placeholder="e.g. +91 98765 43210" value={form.parentPhone}
                  onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} />
              </div>
            )}
            {msg && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>}
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>

      {/* ── MY STUDENTS ──────────────────────────────────────────────────────── */}
      {user?.role === 'student' && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">My Student</h2>
          <p className="text-xs text-gray-500 mb-3">
            Each login is for one child. If you have another child, ask an admin to set up a separate account for them.
          </p>
          {profileError && <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{profileError}</div>}

          <div className="space-y-2 mb-4">
            {profiles.map(p => (
              <div key={p.id} className="border border-gray-100 rounded-lg p-3">
                {editingProfileId === p.id ? (
                  <form onSubmit={handleSaveProfile} className="space-y-2">
                    <input type="text" className="input text-sm" value={editingProfileForm.fullName}
                      onChange={e => setEditingProfileForm(f => ({ ...f, fullName: e.target.value }))} required />
                    <div className="flex gap-2">
                      <input type="number" className="input text-sm" placeholder="Age" value={editingProfileForm.age}
                        onChange={e => setEditingProfileForm(f => ({ ...f, age: e.target.value }))} />
                      <select className="input text-sm" value={editingProfileForm.classLevel}
                        onChange={e => setEditingProfileForm(f => ({ ...f, classLevel: e.target.value }))}>
                        <option value="">Class: Not set</option>
                        {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingProfileId(null)} className="btn-secondary text-xs flex-1 py-1.5">Cancel</button>
                      <button type="submit" disabled={profileBusy} className="btn-primary text-xs flex-1 py-1.5">{profileBusy ? 'Saving...' : 'Save'}</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                        {p.fullName}
                        {p.id === activeProfileId && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">Currently viewing</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.age ? `Age ${p.age}` : ''}{p.age && p.classLevel ? ' · ' : ''}
                        {p.classLevel ? CLASS_LEVELS.find(c => c.value === p.classLevel)?.label : ''}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button type="button" onClick={() => openEditProfile(p)}
                        className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">✏️ Edit</button>
                      <button type="button" onClick={() => handleDeleteProfile(p)} disabled={profileBusy}
                        className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">🗑 Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {profiles.length < 1 && (
            <form onSubmit={handleAddProfile} className="space-y-2 bg-gray-50 rounded-lg p-3">
              <label className="block text-xs font-medium text-gray-600">+ Add Student</label>
              <input type="text" className="input text-sm" placeholder="Student's name" value={newProfile.fullName}
                onChange={e => setNewProfile(f => ({ ...f, fullName: e.target.value }))} />
              <div className="flex gap-2">
                <input type="number" className="input text-sm" placeholder="Age" value={newProfile.age}
                  onChange={e => setNewProfile(f => ({ ...f, age: e.target.value }))} />
                <select className="input text-sm" value={newProfile.classLevel}
                  onChange={e => setNewProfile(f => ({ ...f, classLevel: e.target.value }))}>
                  <option value="">Class: Not set</option>
                  {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={profileBusy} className="btn-primary text-xs w-full py-1.5">
                {profileBusy ? 'Adding...' : '+ Add Student'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
