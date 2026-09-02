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
  const { getActiveStudent, activeStudentId, unsavedChanges, discardActiveStudentChanges } = usePiar();
  const [activeTab, setActiveTab] = useState('tab-dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('piar_sidebar_collapsed') === 'true');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('piar_dark_mode') === 'enabled');
  const [toasts, setToasts] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, tabId: null });

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
      setConfirmModal({ show: true, tabId });
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
            <div className="mobile-bottom-nav__icon-box">
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </button>
        ))}
        {isSuperAdmin && (
          <button
            className={`mobile-bottom-nav__item ${activeTab === 'tab-admin' ? 'active' : ''}`}
            onClick={() => switchTab('tab-admin')}
          >
            <div className="mobile-bottom-nav__icon-box">
              <span className="material-symbols-outlined">settings</span>
            </div>
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

      {confirmModal.show && (
        <div id="modal-confirm-discard" className="modal-overlay active" onClick={(e) => e.target.id === 'modal-confirm-discard' && setConfirmModal({ show: false, tabId: null })}>
          <div className="modal-container" style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined">warning</span>
                ¿Descartar cambios?
              </h3>
              <button type="button" className="modal-close" onClick={() => setConfirmModal({ show: false, tabId: null })} aria-label="Cerrar modal">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0 24px 20px 24px', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              Tienes aportaciones sin guardar en el formulario. ¿Deseas descartar los cambios y salir?
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={async () => {
                  setConfirmModal({ show: false, tabId: null });
                  await discardActiveStudentChanges();
                  showToast('Cambios no guardados descartados.', 'warning');
                  setActiveTab(confirmModal.tabId);
                  window.scrollTo(0, 0);
                }}
                style={{ width: '100%', padding: '10px 16px', height: 'auto' }}
              >
                Descartar y Salir
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="toast-container" className="toast-container">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
      </div>

      <ScrollToTop />
    </div>
  );
}
