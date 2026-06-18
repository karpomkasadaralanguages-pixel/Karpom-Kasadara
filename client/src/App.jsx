import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ContentLibraryPage from './pages/ContentLibraryPage';
import ViewerPage from './pages/ViewerPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage';
import TeacherStudentsPage from './pages/TeacherStudentsPage';
import ProfilePage from './pages/ProfilePage';

// Route guards
function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RequireRole({ roles, children }) {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin" />
      <p className="text-primary-800 font-tamil text-lg">ஏற்றுகிறது...</p>
    </div>
  );
}

export default function App() {
  const { refreshToken, isLoading } = useAuthStore();

  useEffect(() => {
    refreshToken();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="text-6xl font-tamil font-bold text-primary-900 mb-2">அ</div>
          <div className="w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected */}
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="content" element={<ContentLibraryPage />} />
          <Route path="content/:id/view" element={<ViewerPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Teacher */}
          <Route path="teacher/students" element={
            <RequireRole roles={['teacher', 'admin']}><TeacherStudentsPage /></RequireRole>
          } />

          {/* Admin */}
          <Route path="admin/users" element={
            <RequireRole roles={['admin']}><AdminUsersPage /></RequireRole>
          } />
          <Route path="admin/announcements" element={
            <RequireRole roles={['admin']}><AdminAnnouncementsPage /></RequireRole>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
