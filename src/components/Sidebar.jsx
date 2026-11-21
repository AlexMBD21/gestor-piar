import { usePiar } from '../context/PiarContext';

export default function Sidebar({
  activeTab,
  switchTab,
  activeIaSubTab = 'ia-studio',
  setActiveIaSubTab,
  sidebarCollapsed,
  setSidebarCollapsed,
  isSuperAdmin,
  onSignOut
}) {
  const { getActiveStudent } = usePiar();
  const activeStudent = getActiveStudent();

  const isAulaIaMode = activeTab === 'tab-aula-ia';

  const mainItem = {
    tab: 'tab-dashboard',
    label: 'Panel de Control',
    sub: 'Inicio y estudiantes',
    icon: <span className="material-symbols-outlined">dashboard</span>
  };

  const anexoItems = [
    {
      tab: 'tab-anexo1',
      label: 'Anexo 1: Info General',
      sub: 'Datos, salud y hogar',
      step: '01',
      icon: <span className="material-symbols-outlined">description</span>
    },
    {
      tab: 'tab-anexo2',
      label: 'Anexo 2: Plan PIAR',
      sub: 'Ajustes razonables',
      step: '02',
      icon: <span className="material-symbols-outlined">assignment</span>
    },
    {
      tab: 'tab-anexo3',
      label: 'Anexo 3: Acta Acuerdo',
      sub: 'Compromisos y firmas',
      step: '03',
      icon: <span className="material-symbols-outlined">handshake</span>
    }
  ];

  const previewItem = {
    tab: 'tab-preview',
    label: 'Vista Previa / Imprimir',
    sub: 'Exportar Word y PDF',
    icon: <span className="material-symbols-outlined">visibility</span>
  };

  const aulaIaItems = [
    {
      subTab: 'ia-studio',
      label: 'Estudio Docente IA',
      sub: 'Ingesta OCR y Gemini',
      step: '01',
      icon: <span className="material-symbols-outlined">auto_awesome</span>
    },
    {
      subTab: 'ia-mirror',
      label: 'Ver como Estudiante',
      sub: 'Slides, audio y video',
      step: '02',
      icon: <span className="material-symbols-outlined">school</span>
    },
    {
      subTab: 'ia-analytics',
      label: 'Intentos y Telemetría',
      sub: 'Curva de aprendizaje',
      step: '03',
      icon: <span className="material-symbols-outlined">monitoring</span>
    }
  ];

  return (
    <aside className="sidebar no-print">
      {/* Botón flotante de colapso/expansión */}
      <button
        className="sidebar-collapse-btn"
        title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>

      <div className="sidebar-inner">
        {/* Header con emblema */}
        <div className="sidebar-header">
          <div className="sidebar-brand-mark">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div className="sidebar-logo-text">
            <h1>Gestor PIAR</h1>
            <p>DECRETO 1421 DE 2017</p>
          </div>
        </div>

        {/* Student Selector — expandido */}
        <div className="sidebar-student-selector">
          <p>{isAulaIaMode ? 'ESTUDIANTE EN AULA IA' : 'ESTUDIANTE EN GESTIÓN'}</p>
          {activeStudent ? (
            <div className="sidebar-student-card sidebar-student-card--active">
              <div className="sidebar-student-card__icon">
                <span className="material-symbols-outlined">person</span>
                <span className="sidebar-student-card__dot" />
              </div>
              <div className="sidebar-student-card__info">
                <span className="student-name">{activeStudent.nombre}</span>
                <span className="sidebar-student-card__grade">
                  Grado: {activeStudent.grado || 'Sin asignar'}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="sidebar-student-card sidebar-student-card--empty"
              onClick={() => switchTab('tab-dashboard')}
              title="Ir al Panel de Control para seleccionar un estudiante"
              style={{ cursor: 'pointer' }}
            >
              <div className="sidebar-student-card__icon sidebar-student-card__icon--muted">
                <span className="material-symbols-outlined">person_search</span>
              </div>
              <div className="sidebar-student-card__info">
                <span className="sidebar-student-card__empty-title">Ningún estudiante</span>
                <span className="sidebar-student-card__empty-sub">Seleccionar en Panel →</span>
              </div>
            </div>
          )}
        </div>

        {/* Student Avatar — solo visible cuando está contraído */}
        <div
          className={`sidebar-student-avatar ${activeStudent ? 'sidebar-student-avatar--active' : ''}`}
          title={
            activeStudent
              ? `Estudiante: ${activeStudent.nombre}`
              : 'Ningún estudiante (Ir al Panel)'
          }
          onClick={() => switchTab('tab-dashboard')}
        >
          <span className="material-symbols-outlined">
            {activeStudent ? 'person' : 'person_search'}
          </span>
          {activeStudent && <span className="sidebar-student-card__dot" />}
        </div>

        {/* Main Navigation: cambia dinámicamente según el Apartado de la Suite */}
        {!isAulaIaMode ? (
          <div className="sidebar-nav">
            <div className="sidebar-section-label">APARTADO 1 · GESTIÓN</div>
            <a
              className={`nav-link nav-link-premium ${activeTab === mainItem.tab ? 'active' : ''}`}
              onClick={() => switchTab(mainItem.tab)}
              data-tooltip={mainItem.label}
            >
              <div className="nav-icon-box">{mainItem.icon}</div>
              <div className="nav-item-text">
                <span className="nav-item-title">{mainItem.label}</span>
                <span className="nav-item-subtitle">{mainItem.sub}</span>
              </div>
            </a>

            <div className="sidebar-section-label" style={{ marginTop: '8px' }}>
              EXPEDIENTE PIAR
            </div>
            <div className="sidebar-anexos-group">
              {anexoItems.map((item) => (
                <a
                  key={item.tab}
                  className={`nav-link nav-link-premium ${activeTab === item.tab ? 'active' : ''}`}
                  onClick={() => switchTab(item.tab)}
                  data-tooltip={item.label}
                >
                  <div className="nav-icon-box">{item.icon}</div>
                  <div className="nav-item-text">
                    <span className="nav-item-title">{item.label}</span>
                    <span className="nav-item-subtitle">{item.sub}</span>
                  </div>
                  {item.step && <span className="sidebar-step-pill">{item.step}</span>}
                </a>
              ))}
            </div>

            <div className="sidebar-section-label" style={{ marginTop: '8px' }}>
              DOCUMENTO FINAL
            </div>
            <a
              className={`nav-link nav-link-preview nav-link-preview-premium ${
                activeTab === previewItem.tab ? 'active' : ''
              }`}
              onClick={() => switchTab(previewItem.tab)}
              data-tooltip={previewItem.label}
            >
              <div className="nav-icon-box nav-icon-box--preview">{previewItem.icon}</div>
              <div className="nav-item-text">
                <span className="nav-item-title">{previewItem.label}</span>
                <span className="nav-item-subtitle">{previewItem.sub}</span>
              </div>
              <span className="material-symbols-outlined nav-preview-arrow">
                arrow_forward_ios
              </span>
            </a>
          </div>
        ) : (
          <div className="sidebar-nav">
            <div className="sidebar-section-label">APARTADO 2 · AULA ADAPTATIVA IA</div>
            <div className="sidebar-anexos-group">
              {aulaIaItems.map((item) => {
                const isItemActive = isAulaIaMode && activeIaSubTab === item.subTab;
                return (
                  <a
                    key={item.subTab}
                    className={`nav-link nav-link-premium ${isItemActive ? 'active' : ''}`}
                    onClick={() => {
                      switchTab('tab-aula-ia');
                      if (setActiveIaSubTab) setActiveIaSubTab(item.subTab);
                    }}
                    data-tooltip={item.label}
                  >
                    <div className="nav-icon-box">{item.icon}</div>
                    <div className="nav-item-text">
                      <span className="nav-item-title">{item.label}</span>
                      <span className="nav-item-subtitle">{item.sub}</span>
                    </div>
                    {item.step && <span className="sidebar-step-pill">{item.step}</span>}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="sidebar-footer">
          {isSuperAdmin && (
            <a
              className={`footer-link ${activeTab === 'tab-admin' ? 'active' : ''}`}
              onClick={() => switchTab('tab-admin')}
              data-tooltip="Panel Admin"
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Panel Admin</span>
            </a>
          )}
          <a
            className="footer-link footer-link-logout"
            onClick={onSignOut}
            data-tooltip="Cerrar Sesión"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Cerrar Sesión</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
