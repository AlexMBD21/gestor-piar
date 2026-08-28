import { useState, useEffect } from 'react';
import { usePiar } from '../context/PiarContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ switchTab, showToast, onNewStudent }) {
  const { piars, activeStudentId, setActiveStudentId, deletePiar, importPiar, loading, createPiar, editLogs } = usePiar();
  const { user, isSuperAdmin } = useAuth();
  const [historyModalPiar, setHistoryModalPiar] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr));
  };


  const validPiars = piars.filter(p => p.data?.id !== 'blanco-temp');

  const handleManage = (piar) => {
    setActiveStudentId(piar.id);
    switchTab('tab-anexo1', piar.id);
    showToast(`Gestionando PIAR de: ${piar.nombre}`);
  };

  const handleDelete = async (piar) => {
    if (confirm(`¿Está seguro de que desea eliminar permanentemente el PIAR de ${piar.nombre}?`)) {
      await deletePiar(piar.id);
      showToast('PIAR eliminado.', 'danger');
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.estudianteNombre) throw new Error('Formato PIAR inválido');
        const created = await importPiar(imported);
        if (created) {
          setActiveStudentId(created.id);
          switchTab('tab-anexo1', created.id);
          showToast(`PIAR de ${imported.estudianteNombre} importado con éxito.`);
        }
      } catch {
        showToast('Error al importar el archivo JSON.', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = (piar) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(piar.data, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `${piar.nombre.replace(/\s+/g, '_')}_PIAR.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Archivo JSON exportado.');
  };

  return (
    <div className="dashboard-layout">
      {/* Main Content Grid */}
      <div className="dashboard-main-grid">
        
        {/* Left Column (Estudiantes) */}
        <div className="dashboard-col-left">
          <div className="md3-card">
            <div className="md3-card-header">
              <div className="md3-card-title-group">
                <span className="material-symbols-outlined text-primary">groups</span>
                <h3 className="font-headline-sm">Estudiantes en Gestión</h3>
              </div>
              <div className="md3-card-actions">

                <button id="btn-import-trigger" className="btn-md3-outlined" onClick={() => document.getElementById('json-file-input').click()}>
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  <span className="hidden md:inline">Importar</span>
                </button>
                <button id="btn-new-student" className="btn-md3-filled" onClick={onNewStudent}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Nuevo</span>
                </button>
              </div>
            </div>
            
            <input type="file" id="json-file-input" style={{ display: 'none' }} accept=".json" onChange={handleImport} />
            
            <p className="md3-card-description">
              Seleccione un estudiante para gestionar su Plan Individual de Ajustes Razonables (PIAR).
            </p>

            <div id="dashboard-student-list" className="student-list-container">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-card">
                    {/* Cuerpo de la tarjeta (emula sc-body) */}
                    <div className="sc-body" style={{ width: '100%', gap: '16px' }}>
                      
                      {/* Row 1: Nombre + Badge de grado */}
                      <div className="sc-row sc-row-top" style={{ alignItems: 'center', gap: '16px' }}>
                        <div className="skeleton skeleton-line title" style={{ margin: 0, height: '24px', width: '45%' }} />
                        <div className="skeleton skeleton-line badge" style={{ margin: 0, height: '24px', width: '80px', borderRadius: '6px' }} />
                      </div>

                      {/* Row 2: Documento y Docente */}
                      <div className="sc-row sc-row-meta" style={{ gap: '20px', marginTop: '8px' }}>
                        <div className="skeleton skeleton-line sub" style={{ margin: 0, width: '30%', height: '14px' }} />
                        <div className="skeleton skeleton-line sub" style={{ margin: 0, width: '35%', height: '14px' }} />
                      </div>

                      {/* Row 3: Pills de estado y fecha */}
                      <div className="sc-row sc-row-status" style={{ marginTop: '8px' }}>
                        <div className="sc-pills" style={{ display: 'flex', gap: '8px' }}>
                          <div className="skeleton skeleton-line badge" style={{ width: '100px', height: '26px', borderRadius: '20px' }} />
                          <div className="skeleton skeleton-line badge" style={{ width: '110px', height: '26px', borderRadius: '20px' }} />
                        </div>
                        <div className="skeleton skeleton-line short" style={{ width: '160px', height: '12px' }} />
                      </div>
                      
                    </div>

                    {/* Botones de acción */}
                    <div className="skeleton-actions">
                      <div className="skeleton skeleton-btn-wide" style={{ width: '120px', height: '40px', borderRadius: '20px' }} />
                      <div className="skeleton skeleton-btn" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : validPiars.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 40px', 
                color: 'var(--text-muted)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-color)',
                margin: '20px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px'
                }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0 }}>No hay estudiantes registrados</h3>
                <p style={{ margin: 0, maxWidth: '300px', lineHeight: '1.5' }}>
                  El sistema está listo. Para comenzar a trabajar, haz clic en el botón <strong>"Nuevo PIAR"</strong> en la esquina superior.
                </p>
              </div>
            ) : validPiars.map((piar, index) => {
              const isActive = piar.id === activeStudentId;
              const hasUserEdited = editLogs[piar.id]?.some(log => log.editor_id === user?.id) || false;
              const isDiligenciado = isSuperAdmin
                ? (piar.diligenciado || (editLogs[piar.id]?.length > 0))
                : hasUserEdited;
              // Eliminada isLastItem por falta de uso
              return (
                <div
                  key={piar.id}
                  className={`student-card-item ${isActive ? 'active' : ''}`}
                >
                  {/* Left content area */}
                  <div className="sc-body">

                    {/* Row 1: Name + Grade badge */}
                    <div className="sc-row sc-row-top">
                      <span className="sc-name">{piar.nombre}</span>
                      <span className="sc-grade-badge">Grado: {piar.grado || 'S/G'}</span>
                    </div>

                    {/* Row 2: Document + Teacher meta */}
                    <div className="sc-row sc-row-meta">
                      <span className="sc-meta-item">
                        <span className="material-symbols-outlined sc-meta-icon">badge</span>
                        Documento: <strong>{piar.data?.anexo1?.estudiante?.numeroIdentificacion || 'Sin documento'}</strong>
                      </span>
                      {piar.owner_id && (
                        <span className="sc-meta-item">
                          <span className="material-symbols-outlined sc-meta-icon">person</span>
                          Docente: <strong>{piar.owner_name || piar.owner_email || 'Asignado'}</strong>
                        </span>
                      )}
                    </div>

                    {/* Row 3: Status pills + last edit */}
                    <div className="sc-row sc-row-status">
                      <div className="sc-pills">
                        {isDiligenciado ? (
                          <span className="sc-pill sc-pill-success">
                            <span className="sc-pill-dot" />
                            Diligenciado
                          </span>
                        ) : (
                          <span className="sc-pill sc-pill-warning">
                            <span className="sc-pill-dot" />
                            Pendiente
                          </span>
                        )}
                        {isActive ? (
                          <span className="sc-pill sc-pill-active">
                            <span className="sc-pill-dot" />
                            Gestionando
                          </span>
                        ) : (
                          <span className="sc-pill sc-pill-inactive">
                            Inactivo
                          </span>
                        )}
                      </div>
                      {editLogs[piar.id]?.length > 0 && (
                        <span className="sc-last-edit">
                          U. Edición: {formatDate(editLogs[piar.id][0].edited_at)}
                        </span>
                      )}
                    </div>

                  </div>

                  {/* Right: Action buttons */}
                  <div className="sc-actions no-print" onClick={e => e.stopPropagation()}>
                    <button
                      className="sc-btn-manage"
                      onClick={(e) => { e.stopPropagation(); handleManage(piar); }}
                      title="Gestionar PIAR"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_document</span>
                      Gestionar
                    </button>

                    <div style={{ position: 'relative' }}>
                      <button
                        className="sc-btn-more"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === piar.id ? null : piar.id);
                        }}
                        title="Más acciones"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
                      </button>

                      {activeDropdownId === piar.id && (
                        <div className="sc-dropdown">
                          {editLogs[piar.id]?.length > 0 && (
                            <button
                              className="sc-dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryModalPiar(piar);
                                setActiveDropdownId(null);
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
                              Ver Historial
                            </button>
                          )}
                          <button
                            className="sc-dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(piar);
                              setActiveDropdownId(null);
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                            Exportar JSON
                          </button>
                          <hr className="sc-dropdown-divider" />
                          <button
                            className="sc-dropdown-item sc-dropdown-item-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(piar);
                              setActiveDropdownId(null);
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                            Eliminar PIAR
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* Right Column (Activity/Widgets) */}
        <div className="dashboard-col-right">
          <div className="stat-indicator-card">
            <p className="stat-indicator-label">TOTAL REGISTRADOS</p>
            <p className="stat-indicator-number">{validPiars.length}</p>
            <p className="stat-indicator-desc">Planes Individuales de Ajustes Razonables en el sistema.</p>
          </div>

          <div className="md3-card">
            <h4 className="md3-card-title-small text-primary mb-4">Guía de Uso Rápido</h4>
            <ul className="dashboard-guide-list">
              <li>Haz clic en <strong>"Nuevo"</strong> para crear el registro en blanco de un estudiante.</li>
              <li>Usa las pestañas laterales para diligenciar los 3 Anexos requeridos.</li>
              <li>Los datos se <strong>auto-guardan</strong> automáticamente en la nube.</li>
              <li>Haz clic en <strong>"Imprimir / PDF"</strong> para generar el documento oficial.</li>
              <li>Puedes descargar el archivo <strong>JSON</strong> para respaldo e importarlo en otro equipo.</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Modal de Historial de Ediciones */}
      {historyModalPiar && (
        <div id="modal-piar-history" className="modal-overlay active" onClick={(e) => e.target.id === 'modal-piar-history' && setHistoryModalPiar(null)}>
          <div className="modal-container" style={{ maxWidth: '500px', width: '100%', margin: '20px auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary)' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Historial: {historyModalPiar.nombre}
              </h3>
              <button className="modal-close" onClick={() => setHistoryModalPiar(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto', padding: '20px' }}>
              {editLogs[historyModalPiar.id]?.length > 0 ? (
                <div style={{ position: 'relative', margin: '10px 0 20px 10px', borderLeft: '2px solid var(--border-color)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {editLogs[historyModalPiar.id].map((log, idx) => {
                    const totalLogs = editLogs[historyModalPiar.id].length;
                    const logIndex = totalLogs - idx;
                    return (
                      <div 
                        key={log.id} 
                        style={{ position: 'relative' }}
                      >
                        {/* Timeline Dot */}
                        <div style={{
                          position: 'absolute',
                          left: '-26px',
                          top: '12px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          boxShadow: '0 0 0 3px var(--bg-card)'
                        }} />
                        
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '14px 18px', 
                          borderRadius: 'var(--radius-md)', 
                          background: 'var(--bg-input)', 
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                #{logIndex}
                              </span>
                              {log.action_summary || `Edición Completa`}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                              {formatDate(log.edited_at)}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>
                              {log.editor_name ? log.editor_name.substring(0, 2).toUpperCase() : 'U'}
                            </div>
                            <span>
                              <strong>{log.editor_name}</strong>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '0.75rem' }}>({log.editor_email})</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  No hay registros de edición para este estudiante.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px' }}>
              <button className="btn btn-secondary" onClick={() => setHistoryModalPiar(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
