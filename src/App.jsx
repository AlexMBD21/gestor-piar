import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PiarProvider } from './context/PiarContext';
import { AulaIaProvider } from './context/AulaIaContext';
import LoginPage from './pages/LoginPage';
import AppPage from './pages/AppPage';
import AdminPage from './pages/AdminPage';
import StudentAulaPage from './pages/StudentAulaPage';

function ProtectedRoute({ children }) {
  const { user, isStudent, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-app)'
        }}
      >
        <div className="login-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  // Si es Rol Estudiante, ingresa exclusivamente al Apartado 2 (Mi Aula Adaptativa), bloqueando el Apartado 1
  if (isStudent) {
    return <StudentAulaPage />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, isStudent, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-app)'
        }}
      >
        <div className="login-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (user || isStudent) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-app)'
        }}
      >
        <div className="login-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PiarProvider>
          <AulaIaProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AulaIaProvider>
        </PiarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
