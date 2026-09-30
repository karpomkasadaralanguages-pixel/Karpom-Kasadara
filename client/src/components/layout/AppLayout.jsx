import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const NAV = {
  admin: [
    { to: '/dashboard',           label: 'Dashboard',       tamil: 'முகப்பு',       icon: '⊞' },
    { to: '/content',             label: 'Content Library', tamil: 'உள்ளடக்கம்',    icon: '📚' },
    { to: '/admin/users',         label: 'Users',           tamil: 'பயனர்கள்',      icon: '👥' },
    { to: '/admin/announcements', label: 'Announcements',   tamil: 'அறிவிப்புகள்',  icon: '📢' },
    { to: '/admin/inquiries',     label: 'Inquiries',       tamil: 'விசாரணைகள்',    icon: '✉️' },
    { to: '/profile',             label: 'Profile',         tamil: 'சுயவிவரம்',     icon: '👤' },
  ],
  teacher: [
    { to: '/dashboard',          label: 'Dashboard',       tamil: 'முகப்பு',       icon: '⊞' },
    { to: '/content',            label: 'Content Library', tamil: 'உள்ளடக்கம்',    icon: '📚' },
    { to: '/teacher/students',   label: 'My Students',     tamil: 'மாணவர்கள்',     icon: '🎓' },
    { to: '/profile',            label: 'Profile',         tamil: 'சுயவிவரம்',     icon: '👤' },
  ],
  student: [
    { to: '/dashboard',  label: 'Dashboard',  tamil: 'முகப்பு',    icon: '⊞' },
    { to: '/content',    label: 'My Lessons', tamil: 'பாடங்கள்',  icon: '📖' },
    { to: '/profile',    label: 'Profile',    tamil: 'சுயவிவரம்', icon: '👤' },
  ],
};

export default function AppLayout() {
  const { user, logout, profiles, activeProfileId, switchProfile } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const navItems = NAV[user?.role] || NAV.student;
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchProfile = async e => {
    const profileId = e.target.value;
    if (!profileId || profileId === activeProfileId) return;
    setSwitching(true);
    try {
      await switchProfile(profileId);
      window.location.href = '/dashboard';
    } finally { setSwitching(false); }
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-primary-900 text-white w-64 min-w-[16rem]">
      {/* Logo */}
      <div className="p-5 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center">
            <span className="font-tamil font-bold text-xl text-white">அ</span>
          </div>
          <div>
            <div className="font-tamil font-bold text-sm leading-tight">கற்போம் கசடற</div>
            <div className="text-primary-300 text-xs">Karpom Kasadara</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-primary-700 bg-primary-800">
        {user?.role === 'student' && activeProfile ? (
          <>
            <div className="text-sm font-semibold truncate">{activeProfile.fullName}</div>
            <div className="text-primary-300 text-xs truncate">{user?.email}</div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold truncate">{user?.fullName}</div>
            <div className="text-primary-300 text-xs capitalize">{user?.role}</div>
          </>
        )}

        {/* Profile switcher — only shown when this account has more than one child */}
        {user?.role === 'student' && profiles.length > 1 && (
          <select
            value={activeProfileId || ''}
            onChange={handleSwitchProfile}
            disabled={switching}
            className="mt-2 w-full text-xs bg-primary-900 border border-primary-600 rounded-md px-2 py-1.5 text-white"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {switching && p.id === activeProfileId ? 'Switching…' : `Switch to: ${p.fullName}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-700 text-white font-semibold'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span className="flex flex-col leading-tight">
              <span className="font-tamil text-xs">{item.tamil}</span>
              <span className="text-xs opacity-75">{item.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-primary-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-200 hover:bg-primary-800 hover:text-white transition-colors"
        >
          <span className="text-base w-5 text-center">🚪</span>
          <span className="flex flex-col leading-tight">
            <span className="font-tamil text-xs">வெளியேறு</span>
            <span className="text-xs opacity-75">Sign Out</span>
          </span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="flex-shrink-0"><Sidebar /></div>
          <div className="flex-1 bg-black bg-opacity-50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between bg-primary-900 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-tamil font-bold text-lg">கற்போம் கசடற</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-primary-700">
            <span className="text-xl">☰</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
