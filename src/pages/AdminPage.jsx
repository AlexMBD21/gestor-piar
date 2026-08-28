import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import TeacherList from '../components/admin/TeacherList';

export default function AdminPage() {
  const { user, profile, isSuperAdmin, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('teachers');

  if (!isSuperAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div className="card" style={{ maxWidth: 400, textAlign: 'center', padding: 48 }}>
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="var(--danger)" strokeWidth="1.5" style={{ marginBottom: 16 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <h3>Acceso Denegado</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>No tienes permisos para acceder a esta sección.</p>
          <a href="/" className="btn btn-primary" style={{ marginTop: 20 }}>Volver a la App</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Admin Sidebar */}
      <aside className="sidebar no-print">
        <div className="logo-container">
          <div className="logo-icon">A</div>
          <div className="logo-text">
            <h1>Admin PIAR</h1>
            <span>Panel SuperAdmin</span>
          </div>
        </div>

        <div className="student-selector" style={{ marginBottom: 16 }}>
          <label>Sesión Activa</label>
          <div className="student-display-box" style={{ fontSize: '0.82rem' }}>
            {profile?.full_name || user?.email}
          </div>
        </div>

        <nav className="nav-menu">
          <li className="nav-item">
            <a className={`nav-link ${activeSection === 'teachers' ? 'active' : ''}`} onClick={() => setActiveSection('teachers')} data-tooltip="Gestión de Profesores">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Gestión de Profesores</span>
            </a>
          </li>
        </nav>

        <div className="sidebar-actions">
          <a href="/" className="btn btn-secondary" id="btn-go-to-app" style={{ fontSize: '0.85rem' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Volver a la App</span>
          </a>
          <button className="btn btn-danger btn-sm" id="btn-admin-signout" onClick={signOut} style={{ fontSize: '0.85rem' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="app-header no-print">
          <div className="app-title-area">
            <h2>Gestión de Profesores</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Administra las cuentas de los docentes del sistema
            </p>
          </div>
          <div className="header-actions">
            <div className="header-profile-card">
              <div className="profile-avatar">
                {profile?.full_name
                  ? profile.full_name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  : (isSuperAdmin ? 'SA' : 'PF')}
              </div>
              <div className="profile-details">
                <span className="profile-name">{profile?.full_name || 'Usuario'}</span>
                <span className="profile-role">
                  {isSuperAdmin ? '👑 SuperAdmin' : '👤 Docente'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {activeSection === 'teachers' && <TeacherList />}
      </main>
    </div>
  );
}
