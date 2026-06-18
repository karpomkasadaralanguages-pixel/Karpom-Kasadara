import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

function StatCard({ icon, value, label, tamil }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-primary-900">{value}</div>
        <div className="text-sm text-gray-500">
          <span className="font-tamil">{tamil}</span> <span className="text-gray-400">/ {label}</span>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ percent }) {
  const pct = Math.min(100, Math.round(percent));
  return (
    <div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-primary-600' : 'bg-gray-200'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 mt-0.5 text-right">{pct}%</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({});
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/announcements').then(r => setAnnouncements(r.data.announcements)),
      loadStats(),
    ]).finally(() => setLoading(false));
  }, []);

  async function loadStats() {
    try {
      if (user.role === 'student') {
        const [content, prog] = await Promise.all([
          api.get('/content'),
          api.get(`/users/${user.id}/progress`),
        ]);
        const progData = prog.data.progress;
        setProgress(progData);
        setStats({
          lessons: content.data.content.length,
          completed: progData.filter(p => p.percentComplete >= 100).length,
          inProgress: progData.filter(p => p.percentComplete > 0 && p.percentComplete < 100).length,
        });
      } else if (user.role === 'teacher') {
        const [content, students] = await Promise.all([
          api.get('/content'),
          api.get(`/users/${user.id}/students`),
        ]);
        setStats({ content: content.data.content.length, students: students.data.students.length });
      } else if (user.role === 'admin') {
        const [content, users] = await Promise.all([
          api.get('/content'),
          api.get('/users'),
        ]);
        const userList = users.data.users;
        setStats({
          content: content.data.content.length,
          teachers: userList.filter(u => u.role === 'teacher').length,
          students: userList.filter(u => u.role === 'student').length,
        });
      }
    } catch {}
  }

  const greeting = { admin: 'நிர்வாகி', teacher: 'ஆசிரியர்', student: 'மாணவர்' };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          <span className="font-tamil">வணக்கம், {user?.fullName}!</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back — <span className="font-tamil">{greeting[user?.role]}</span> / {user?.role}
        </p>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {user?.role === 'student' && <>
            <StatCard icon="📖" value={stats.lessons || 0} label="Assigned Lessons" tamil="பாடங்கள்" />
            <StatCard icon="✅" value={stats.completed || 0} label="Completed" tamil="முடிந்தவை" />
            <StatCard icon="📝" value={stats.inProgress || 0} label="In Progress" tamil="தொடர்பவை" />
          </>}
          {user?.role === 'teacher' && <>
            <StatCard icon="📚" value={stats.content || 0} label="Content Items" tamil="உள்ளடக்கம்" />
            <StatCard icon="🎓" value={stats.students || 0} label="My Students" tamil="மாணவர்கள்" />
          </>}
          {user?.role === 'admin' && <>
            <StatCard icon="📚" value={stats.content || 0} label="Total Content" tamil="உள்ளடக்கம்" />
            <StatCard icon="👨‍🏫" value={stats.teachers || 0} label="Teachers" tamil="ஆசிரியர்கள்" />
            <StatCard icon="🎓" value={stats.students || 0} label="Students" tamil="மாணவர்கள்" />
          </>}
        </div>
      )}

      {/* Student progress section */}
      {user?.role === 'student' && !loading && progress.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <span className="font-tamil">என் முன்னேற்றம்</span> / My Progress
          </h2>
          <div className="space-y-3">
            {progress.map(p => (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{p.content?.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {p.content?.category} · Last viewed: {new Date(p.lastAccessedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.percentComplete >= 100 ? 'bg-green-100 text-green-800' :
                      p.percentComplete > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {p.percentComplete >= 100 ? '✅ Done' : p.percentComplete > 0 ? 'In Progress' : 'Not Started'}
                    </span>
                    <Link to={`/content/${p.contentId}/view`} className="btn-primary text-xs py-1 px-2">
                      Continue
                    </Link>
                  </div>
                </div>
                <ProgressBar percent={p.percentComplete} />
                <div className="text-xs text-gray-400 mt-1">
                  Page {p.lastPageViewed} of {p.content?.pageCount || '?'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <span className="font-tamil">விரைவு செயல்கள்</span> / Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/content" className="btn-primary text-sm">
            <span className="font-tamil">உள்ளடக்கம் காண்</span> / View Content
          </Link>
          {['admin', 'teacher'].includes(user?.role) && (
            <Link to="/content" className="btn-secondary text-sm">
              + Upload Content
            </Link>
          )}
          {user?.role === 'teacher' && (
            <Link to="/teacher/students" className="btn-secondary text-sm">
              Manage Students
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin/users" className="btn-secondary text-sm">
              Manage Users
            </Link>
          )}
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <span className="font-tamil">அறிவிப்புகள்</span> / Announcements
          </h2>
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className="card border-l-4 border-primary-600">
                <div className="font-semibold text-gray-800 text-sm">{a.title}</div>
                <p className="text-gray-600 text-sm mt-1">{a.body}</p>
                <div className="text-xs text-gray-400 mt-2">{new Date(a.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
