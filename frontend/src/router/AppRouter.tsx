import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import StudentDashboard from '../pages/Student/StudentDashboard';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import TeacherDashboard from '../pages/Teacher/TeacherDashboard';
import WaitingPage from '../pages/WaitingPage';
import LessonJournalPage from '../pages/Teacher/LessonJournalPage'; // импорт страницы журнала

// Публичные маршруты (для неавторизованных)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuth = authApi.isAuthenticated();
  return !isAuth ? <>{children}</> : <Navigate to="/dashboard" />;
};

// Защищенные маршруты (для всех авторизованных)
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuth = authApi.isAuthenticated();
  return isAuth ? <>{children}</> : <Navigate to="/login" />;
};

// Маршрут только для администраторов
const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuth = authApi.isAuthenticated();
  const user = authApi.getCurrentUser();

  if (!isAuth) {
    return <Navigate to="/login" />;
  }

  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" />;
};

// Маршрут только для преподавателей (добавлен)
const TeacherOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuth = authApi.isAuthenticated();
  const user = authApi.getCurrentUser();

  if (!isAuth) {
    return <Navigate to="/login" />;
  }

  if (user?.role === 'teacher') {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" />;
};

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Публичные маршруты */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />

      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />

      {/* Главный дашборд - выбор зависит от роли */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <RoleBasedDashboard />
        </PrivateRoute>
      } />

      {/* Панель администратора - только для админов */}
      <Route path="/admin/*" element={
        <AdminOnlyRoute>
          <AdminDashboard />
        </AdminOnlyRoute>
      } />

      {/* Журнал занятий преподавателя - добавлен */}
      <Route path="/teacher/lesson-journal" element={
        <TeacherOnlyRoute>
          <LessonJournalPage />
        </TeacherOnlyRoute>
      } />

      {/* По умолчанию - на дашборд */}
      <Route path="/" element={<Navigate to="/dashboard" />} />

      {/* Все остальные пути - на дашборд */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

// Компонент для выбора дашборда на основе роли
const RoleBasedDashboard: React.FC = () => {
  const user = authApi.getCurrentUser();

  if (!user) {
    return <Navigate to="/login" />;
  }

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'user':
      return <WaitingPage />;
    default:
      return <Navigate to="/login" />;
  }
};

export default AppRouter;