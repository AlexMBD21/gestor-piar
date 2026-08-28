import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePiar } from '../context/PiarContext';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import Anexo1Form from '../components/Anexo1Form';
import Anexo2Form from '../components/Anexo2Form';
import Anexo3Form from '../components/Anexo3Form';
import PreviewTab from '../components/PreviewTab';
import Toast from '../components/Toast';
import StudentModal from '../components/StudentModal';
import TeacherList from '../components/admin/TeacherList';
import ScrollToTop from '../components/ScrollToTop';

export default function AppPage() {
  const { profile, isSuperAdmin, signOut } = useAuth();
  const { getActiveStudent, activeStudentId, unsavedChanges } = usePiar();
  const [activeTab, setActiveTab] = useState('tab-dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('piar_sidebar_collapsed') === 'true');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('piar_dark_mode') === 'enabled');
  const [toasts, setToasts] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);

  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('piar_dark_mode', darkMode ? 'enabled' : 'disabled');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('piar_sidebar_collapsed', sidebarCollapsed ? 'true' : '');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Deseas salir?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const switchTab = async (tabId, overrideStudentId = null) => {
    if (unsavedChanges && (tabId === 'tab-dashboard' || tabId === 'tab-admin')) {
      showToast('Por favor, guarda tu aportación al final de la página antes de salir.', 'warning');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    const studentId = overrideStudentId || activeStudentId;
    if (!studentId && tabId !== 'tab-dashboard' && tabId !== 'tab-admin') {
      showToast('Seleccione un estudiante en el Panel de Control para acceder a esta sección.', 'warning');
      return;
    }
    setActiveTab(tabId);
    window.scrollTo(0, 0);
  };

  const activeStudent = getActiveStudent();

  const tabTitles = {
    'tab-dashboard': 'Panel de Control',
    'tab-anexo1': activeStudent ? activeStudent.nombre : 'Anexo 1',
    'tab-anexo2': activeStudent ? activeStudent.nombre : 'Anexo 2',
    'tab-anexo3': activeStudent ? activeStudent.nombre : 'Anexo 3',
    'tab-preview': 'Vista Previa',
    'tab-admin': 'Administración',
  };
  const headerTitle = tabTitles[activeTab] || 'Gestor PIAR';

  const profileInitials = profile?.full_name
    ? profile.full_name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : (isSuperAdmin ? 'SA' : 'PF');

  const mobileNavItems = [
    { tab: 'tab-dashboard', icon: 'dashboard', label: 'Inicio' },
    { tab: 'tab-anexo1', icon: 'description', label: 'Anexo 1' },
    { tab: 'tab-anexo2', icon: 'assignment', label: 'Anexo 2' },
    { tab: 'tab-anexo3', icon: 'handshake', label: 'Anexo 3' },
    { tab: 'tab-preview', icon: 'visibility', label: 'Vista' },
  ];

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* DESKTOP: Sidebar */}
      <Sidebar
        activeTab={activeTab}
        switchTab={switchTab}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isSuperAdmin={isSuperAdmin}
        profile={profile}
        onSignOut={signOut}
        showToast={showToast}
      />

      {/* MOBILE: Top Bar */}
      <header className="mobile-top-bar no-print">
        <div className="mobile-top-bar__avatar">
          {profileInitials}
        </div>
        <div className="mobile-top-bar__titles">
          <span className="mobile-top-bar__title">{headerTitle}</span>
          <span className="mobile-top-bar__subtitle">Gestor PIAR</span>
        </div>
        <button
          className="mobile-top-bar__theme"
          onClick={() => setDarkMode(!darkMode)}
          title="Cambiar tema"
        >
          <span className="material-symbols-outlined">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </header>

      <main className="main-content">
        {/* Desktop App Header */}
        <header className="app-header no-print">
          <div><span style={{ display: 'none' }}>Gestor PIAR</span></div>
          <div className="header-actions">
            <div className="header-profile-chip">
              <div className="profile-avatar">{profileInitials}</div>
              <div className="profile-details">
                <span className="profile-name">{profile?.full_name || 'Usuario'}</span>
                <span className="profile-role">
                  {isSuperAdmin ? (
                    <><span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>workspace_premium</span> SuperAdmin</>
                  ) : (
                    <><span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>person</span> Docente</>
                  )}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* TABS */}
        <div id="tab-dashboard" className={`tab-content ${activeTab === 'tab-dashboard' ? 'active' : ''}`}>
          <Dashboard switchTab={switchTab} showToast={showToast} onNewStudent={() => setShowStudentModal(true)} />
        </div>
        <div id="tab-anexo1" className={`tab-content ${activeTab === 'tab-anexo1' ? 'active' : ''}`}>
          <Anexo1Form showToast={showToast} switchTab={switchTab} />
        </div>
        <div id="tab-anexo2" className={`tab-content ${activeTab === 'tab-anexo2' ? 'active' : ''}`}>
          <Anexo2Form showToast={showToast} switchTab={switchTab} />
        </div>
        <div id="tab-anexo3" className={`tab-content ${activeTab === 'tab-anexo3' ? 'active' : ''}`}>
          <Anexo3Form showToast={showToast} switchTab={switchTab} />
        </div>
        <div id="tab-preview" className={`tab-content ${activeTab === 'tab-preview' ? 'active' : ''}`}>
          <PreviewTab showToast={showToast} />
        </div>
        {isSuperAdmin && (
          <div id="tab-admin" className={`tab-content ${activeTab === 'tab-admin' ? 'active' : ''}`}>
            <TeacherList />
          </div>
        )}
      </main>

      {/* MOBILE: Bottom Navigation */}
      <nav className="mobile-bottom-nav no-print">
        {mobileNavItems.map(item => (
          <button
            key={item.tab}
            className={`mobile-bottom-nav__item ${activeTab === item.tab ? 'active' : ''}`}
            onClick={() => switchTab(item.tab)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </button>
        ))}
        {isSuperAdmin && (
          <button
            className={`mobile-bottom-nav__item ${activeTab === 'tab-admin' ? 'active' : ''}`}
            onClick={() => switchTab('tab-admin')}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="mobile-bottom-nav__label">Admin</span>
          </button>
        )}
      </nav>

      {showStudentModal && (
        <StudentModal
          onClose={() => setShowStudentModal(false)}
          switchTab={switchTab}
          showToast={showToast}
        />
      )}

      <div id="toast-container" className="toast-container">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
      </div>

      <ScrollToTop />
    </div>
  );
}
