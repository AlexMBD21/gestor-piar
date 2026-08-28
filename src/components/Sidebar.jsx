import { usePiar } from '../context/PiarContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, switchTab, sidebarCollapsed, setSidebarCollapsed, darkMode, setDarkMode, isSuperAdmin, profile, onSignOut, showToast }) {
  const { getActiveStudent } = usePiar();
  const activeStudent = getActiveStudent();

  const navItems = [
    {
      tab: 'tab-dashboard', label: 'Panel de Control',
      icon: <span className="material-symbols-outlined">dashboard</span>
    },
    {
      tab: 'tab-anexo1', label: 'Anexo 1: Info General',
      icon: <span className="material-symbols-outlined">description</span>
    },
    {
      tab: 'tab-anexo2', label: 'Anexo 2: Plan PIAR',
      icon: <span className="material-symbols-outlined">assignment</span>
    },
    {
      tab: 'tab-anexo3', label: 'Anexo 3: Acta Acuerdo',
      icon: <span className="material-symbols-outlined">handshake</span>
    },
    {
      tab: 'tab-preview', label: 'Vista Previa / Imprimir', isPreview: true,
      icon: <span className="material-symbols-outlined">visibility</span>
    }
  ];

  return (
    <aside className="sidebar no-print">
      {/* Botón flotante de colapso/expansión */}
      <button className="sidebar-collapse-btn" title={sidebarCollapsed ? 'Expandir' : 'Contraer'} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
        <span className="material-symbols-outlined">chevron_left</span>
      </button>

      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">P</div>
        <div className="sidebar-logo-text">
          <h1>Gestor PIAR</h1>
          <p>DECRETO 1421 DE 2017</p>
        </div>
      </div>

      {/* Student Selector — expandido */}
      <div className="sidebar-student-selector">
        <p>ESTUDIANTE EN GESTIÓN</p>
        <button className="student-btn" disabled={!activeStudent}>
          <span className="student-name">
            {activeStudent ? `${activeStudent.nombre} (${activeStudent.grado || 'S/G'})` : 'Ninguno'}
          </span>
          <span className="material-symbols-outlined icon-more">unfold_more</span>
        </button>
      </div>

      {/* Student Avatar — solo visible cuando está contraído */}
      <div className="sidebar-student-avatar" title={activeStudent ? activeStudent.nombre : 'Sin estudiante'}>
        {activeStudent ? (
          <span className="student-avatar-initials">
            {activeStudent.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </span>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>person</span>
        )}
      </div>

      {/* Main Navigation */}
      <div className="sidebar-nav">
        {navItems.map(item => {
          if (item.isPreview) {
            return (
              <div key={item.tab}>
                <div className="nav-divider"></div>
                <a
                  className={`nav-link nav-link-preview ${activeTab === item.tab ? 'active' : ''} ${item.tab !== 'tab-dashboard' && !activeStudent ? 'nav-disabled' : ''}`}
                  onClick={() => switchTab(item.tab)}
                  data-tooltip={item.label}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </div>
            );
          }

          return (
            <a
              key={item.tab}
              className={`nav-link ${activeTab === item.tab ? 'active' : ''} ${item.tab !== 'tab-dashboard' && !activeStudent ? 'nav-disabled' : ''}`}
              onClick={() => switchTab(item.tab)}
              data-tooltip={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="sidebar-footer">
        {isSuperAdmin && (
          <a className="footer-link" onClick={() => switchTab('tab-admin')} data-tooltip="Panel Admin">
            <span className="material-symbols-outlined">settings</span>
            <span>Panel Admin</span>
          </a>
        )}
        <a className="footer-link" onClick={onSignOut} data-tooltip="Cerrar Sesión">
          <span className="material-symbols-outlined">logout</span>
          <span>Cerrar Sesión</span>
        </a>
        <div className="theme-toggle-row">
          <span>Modo Oscuro</span>
          <button 
            className={`theme-toggle-btn ${darkMode ? 'active' : ''}`}
            onClick={() => setDarkMode(!darkMode)}
          >
            <div className="toggle-thumb"></div>
          </button>
        </div>
      </div>
    </aside>
  );
}
