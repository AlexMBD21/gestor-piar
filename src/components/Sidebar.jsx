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
        <div className="sidebar-logo-text">
          <h1>Gestor PIAR</h1>
          <p>DECRETO 1421 DE 2017</p>
        </div>
      </div>

      {/* Student Selector — expandido */}
      <div className="sidebar-student-selector">
        <p>ESTUDIANTE EN GESTIÓN</p>
        {activeStudent ? (
          <div className="active-student-badge" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md, 12px)',
            background: 'rgba(92, 143, 250, 0.12)',
            border: '1px solid rgba(92, 143, 250, 0.3)',
            color: 'var(--text-main)',
            animation: 'fadeIn 0.2s ease-in-out',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span className="material-symbols-outlined" style={{ 
              fontSize: '20px', 
              color: 'var(--primary)',
              background: 'rgba(92, 143, 250, 0.15)',
              borderRadius: '50%',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>school</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span className="student-name" style={{ 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {activeStudent.nombre}
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-muted)',
                fontWeight: 600
              }}>
                Grado: {activeStudent.grado || 'S/G'}
              </span>
            </div>
          </div>
        ) : (
          <div className="active-student-badge-empty" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md, 12px)',
            background: 'var(--bg-app)',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>person_off</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Ningún estudiante</span>
          </div>
        )}
      </div>

      {/* Student Avatar — solo visible cuando está contraído */}
      <div className="sidebar-student-avatar" title={activeStudent ? activeStudent.nombre : 'Sin estudiante'}>
        {activeStudent ? (
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>school</span>
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
                  className={`nav-link nav-link-preview ${activeTab === item.tab ? 'active' : ''}`}
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
              className={`nav-link ${activeTab === item.tab ? 'active' : ''}`}
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
