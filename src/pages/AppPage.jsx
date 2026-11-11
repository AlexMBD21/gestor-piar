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
  const { getActiveStudent, unsavedChanges, saveActivePiar, discardActiveStudentChanges } = usePiar();
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

  const switchTab = async (tabId) => {
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
        onSignOut={signOut}
      />

      {/* MOBILE: Top Bar */}
      <header className="mobile-top-bar no-print">
        <div className="mobile-top-bar__avatar">
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>person</span>
        </div>
        <div className="mobile-top-bar__titles">
          <span className="mobile-top-bar__title">{headerTitle}</span>
          <span className="mobile-top-bar__subtitle">Gestor PIAR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="mobile-top-bar__theme"
            onClick={() => setDarkMode(!darkMode)}
            title="Cambiar tema"
          >
            <span className="material-symbols-outlined">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            className="mobile-top-bar__theme mobile-top-bar__logout"
            onClick={signOut}
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Desktop App Header */}
        <header className="app-header no-print">
          <div className="app-header-context">
            <div className="app-header-title-block">
              <span className="app-header-eyebrow">
                {activeTab === 'tab-dashboard' && 'Gestión Institucional'}
                {activeTab === 'tab-anexo1' && 'Paso 1 de 4 · Información General'}
                {activeTab === 'tab-anexo2' && 'Paso 2 de 4 · Ajustes Razonables'}
                {activeTab === 'tab-anexo3' && 'Paso 3 de 4 · Acta de Acuerdo'}
                {activeTab === 'tab-preview' && 'Paso 4 de 4 · Documento Oficial'}
                {activeTab === 'tab-admin' && 'Configuración del Sistema'}
              </span>
              <h2 className="app-header-page-title">{headerTitle}</h2>
            </div>
          </div>

          <div className="header-actions">
            {unsavedChanges && activeStudent && (
              <button
                type="button"
                className="header-unsaved-btn"
                onClick={async () => {
                  const result = await saveActivePiar();
                  if (result && result.success) showToast('Aportación guardada correctamente');
                  else showToast(result?.message || 'Error al guardar', 'danger');
                }}
                title="Haz clic para guardar los cambios pendientes"
              >
                <span className="header-unsaved-dot" />
                <span>Guardar cambios</span>
              </button>
            )}
            <div className="header-profile-chip">
              <div className="profile-avatar">
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>person</span>
              </div>
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
          <PreviewTab showToast={showToast} switchTab={switchTab} />
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
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmModal({ show: false, tabId: null })}
                style={{ flex: 1, justifyContent: 'center', height: '38px' }}
              >
                Continuar editando
              </button>
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
                style={{ flex: 1, justifyContent: 'center', height: '38px', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                <span>Descartar y Salir</span>
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
