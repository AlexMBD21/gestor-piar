import { useState } from 'react';
import { createPortal } from 'react-dom';
import { escHtml } from '../lib/piarTemplates';
import CollaborativeSection from './CollaborativeSection';

export default function AjustesTable({ list, studentData, onUpdate }) {
  const rawAjustes = list || studentData?.anexo2?.ajustesRazonables || [];

  // Migración al vuelo para compatibilidad con la estructura anterior
  const ajustes = rawAjustes.map(item => {
    if (item.trimestres) return item;
    return {
      id: item.id,
      area: item.area,
      docente: item.docente,
      trimestres: [
        {
          id: item.id + '-t1',
          trimestre: item.trimestre || 'Primer Cuatrimestre',
          objetivos: item.objetivos || '',
          barreras: item.barreras || item.bareras || '',
          ajustes: item.ajustes || '',
          evaluacion: item.evaluacion || ''
        }
      ]
    };
  });

  const [deleteModalAjuste, setDeleteModalAjuste] = useState(null);
  const [isClosingDeleteModal, setIsClosingDeleteModal] = useState(false);
  const [activeTabs, setActiveTabs] = useState({}); // { [areaId]: tabIndex }

  const handleUpdate = (updated) => {
    if (typeof onUpdate === 'function') {
      if (onUpdate.length >= 3) {
        onUpdate('anexo2', 'ajustesRazonables', updated);
      } else {
        onUpdate(updated);
      }
    }
  };

  const handleAddField = () => {
    const newAjuste = {
      id: 'ar-' + Date.now(),
      area: '',
      docente: '',
      trimestres: [
        {
          id: 't-' + Date.now(),
          trimestre: '',
          objetivos: '',
          barreras: '',
          ajustes: '',
          evaluacion: ''
        }
      ]
    };
    const updated = [...ajustes, newAjuste];
    handleUpdate(updated);
  };

  const handleAddTrimestre = (areaId) => {
    const updated = ajustes.map(item => {
      if (item.id === areaId) {
        const newTrimestre = {
          id: 't-' + Date.now(),
          trimestre: '',
          objetivos: '',
          barreras: '',
          ajustes: '',
          evaluacion: ''
        };
        const newTrimestres = [...item.trimestres, newTrimestre];
        // Seleccionar la nueva pestaña
        setActiveTabs(prev => ({ ...prev, [areaId]: newTrimestres.length - 1 }));
        return { ...item, trimestres: newTrimestres };
      }
      return item;
    });
    handleUpdate(updated);
  };

  const handleRemoveTrimestre = (areaId, trimestreId) => {
    const updated = ajustes.map(item => {
      if (item.id === areaId) {
        const newTrimestres = item.trimestres.filter(t => t.id !== trimestreId);
        // Ajustar la pestaña activa
        const currentTab = activeTabs[areaId] || 0;
        if (currentTab >= newTrimestres.length) {
          setActiveTabs(prev => ({ ...prev, [areaId]: Math.max(0, newTrimestres.length - 1) }));
        }
        return { ...item, trimestres: newTrimestres };
      }
      return item;
    });
    handleUpdate(updated);
  };

  const handleChangeArea = (id, field, value) => {
    const updated = ajustes.map(item => item.id === id ? { ...item, [field]: value } : item);
    handleUpdate(updated);
  };

  const handleChangeTrimestre = (areaId, trimestreId, field, value) => {
    const updated = ajustes.map(item => {
      if (item.id === areaId) {
        const newTrimestres = item.trimestres.map(t => t.id === trimestreId ? { ...t, [field]: value } : t);
        return { ...item, trimestres: newTrimestres };
      }
      return item;
    });
    handleUpdate(updated);
  };

  const handleDeleteRequest = (id) => {
    setDeleteModalAjuste(id);
  };

  const handleCloseDeleteModal = () => {
    setIsClosingDeleteModal(true);
    setTimeout(() => {
      setDeleteModalAjuste(null);
      setIsClosingDeleteModal(false);
    }, 300);
  };

  const handleConfirmDelete = () => {
    if (deleteModalAjuste) {
      const updated = ajustes.filter(item => item.id !== deleteModalAjuste);
      handleUpdate(updated);
      handleCloseDeleteModal();
    }
  };

  return (
    <CollaborativeSection sectionKey="anexo2-ajustes" className="print-page">
      <div className="card-title-container">
        <h3 className="card-title">6. Ajustes Razonables</h3>
        <button type="button" id="btn-add-ajuste" className="btn btn-primary btn-sm no-print" onClick={handleAddField}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          <span>Agregar Área / Asignatura</span>
        </button>
      </div>
      <p className="card-description no-print" style={{ marginBottom: 16 }}>
        Diligencie los objetivos, barreras del contexto, ajustes y criterios de evaluación por áreas. Puede agregar cuantas filas necesite.
      </p>

      <div className="table-wrapper mobile-card-table-wrapper">
        <table className="custom-table" id="tabla-ajustes-razonables">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Área / Aprendizaje</th>
              <th style={{ width: '25%' }}>Objetivos / Propósitos (Grado - DBA)</th>
              <th style={{ width: '25%' }}>Barreras Evidenciadas</th>
              <th style={{ width: '20%' }}>Ajustes Razonables (Apoyos/Estrategias)</th>
              <th style={{ width: '15%' }}>Evaluación de los Ajustes</th>
              <th className="action-cell no-print"></th>
            </tr>
          </thead>
          <tbody id="tbody-ajustes-razonables">
            {ajustes.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                  Sin ajustes razonables registrados.
                </td>
              </tr>
            ) : (
              ajustes.map(item => {
                const activeTab = activeTabs[item.id] || 0;

                return (
                  <tr key={item.id} className="ajustes-area-row">
                    <td data-label="Área / Docente" style={{ fontWeight: 600, minWidth: 140, verticalAlign: 'top' }}>
                      <div className="ajuste-area-header">
                        <input
                          type="text"
                          className="table-input ajuste-area-input"
                          value={item.area || ''}
                          onChange={e => handleChangeArea(item.id, 'area', e.target.value)}
                          placeholder="Ej. Matemáticas"
                          style={{ fontWeight: 600 }}
                        />
                        <input
                          type="text"
                          className="table-input ajuste-docente-input"
                          value={item.docente || ''}
                          onChange={e => handleChangeArea(item.id, 'docente', e.target.value)}
                          placeholder="Profesor asignado..."
                          style={{ fontSize: '0.82rem', marginTop: 6 }}
                        />
                      </div>

                      <div className="trimestres-tabs-container no-print">
                        <div className="trimestres-tabs">
                          {item.trimestres.map((t, index) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`trimestre-tab-btn ${activeTab === index ? 'active' : ''}`}
                              onClick={() => setActiveTabs(prev => ({ ...prev, [item.id]: index }))}
                            >
                              <span className="trimestre-tab-label">
                                {t.trimestre
                                  ? t.trimestre.replace('Primer ', '1er ').replace('Segundo ', '2do ').replace('Tercer ', '3er ')
                                  : 'Nuevo'}
                              </span>
                              {item.trimestres.length > 1 && (
                                <span
                                  className="material-symbols-outlined trimestre-tab-remove"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveTrimestre(item.id, t.id); }}
                                  title="Eliminar trimestre"
                                >
                                  close
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="btn-add-trimestre no-print"
                          onClick={() => handleAddTrimestre(item.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                          Trimestre
                        </button>
                      </div>
                    </td>

                    {/* Contenido del trimestre - Renderizado condicional basado en la vista (pantalla vs impresión) */}
                    <td colSpan="4" className="trimestres-content-cell" style={{ padding: 0, verticalAlign: 'top' }}>

                      {/* Vista de Pantalla: Solo muestra el trimestre activo */}
                      <div className="trimestre-screen-view no-print">
                        {item.trimestres.map((t, index) => (
                          <div key={t.id} className={`ajustes-trimestre-fields ${activeTab === index ? 'active' : ''}`}>
                            <div className="ajustes-field-group ajustes-field-objetivos">
                              <label className="ajustes-field-label">Periodo y Objetivos / Propósitos (Grado - DBA)</label>
                              <select
                                className="form-control table-input select-periodo"
                                value={t.trimestre || ''}
                                onChange={e => handleChangeTrimestre(item.id, t.id, 'trimestre', e.target.value)}
                                style={{ marginBottom: 6 }}
                              >
                                <option value="" disabled>Seleccionar Trimestre...</option>
                                <option value="Primer Cuatrimestre">1er Trimestre/Cuat.</option>
                                <option value="Segundo Cuatrimestre">2do Trimestre/Cuat.</option>
                                <option value="Tercer Cuatrimestre">3er Trimestre/Cuat.</option>
                                <option value="Transversal">Transversal</option>
                              </select>
                              <textarea
                                className="table-textarea"
                                value={t.objetivos || ''}
                                onChange={e => handleChangeTrimestre(item.id, t.id, 'objetivos', e.target.value)}
                                placeholder="Objetivos del grado..."
                                rows={4}
                              />
                            </div>
                            <div className="ajustes-field-group ajustes-field-barreras">
                              <label className="ajustes-field-label">Barreras Evidenciadas</label>
                              <textarea
                                className="table-textarea"
                                value={t.barreras || ''}
                                onChange={e => handleChangeTrimestre(item.id, t.id, 'barreras', e.target.value)}
                                placeholder="Barreras del entorno..."
                                rows={4}
                              />
                            </div>
                            <div className="ajustes-field-group ajustes-field-estrategias">
                              <label className="ajustes-field-label">Ajustes Razonables (Apoyos/Estrategias)</label>
                              <textarea
                                className="table-textarea"
                                value={t.ajustes || ''}
                                onChange={e => handleChangeTrimestre(item.id, t.id, 'ajustes', e.target.value)}
                                placeholder="Estrategias/Apoyos..."
                                rows={4}
                              />
                            </div>
                            <div className="ajustes-field-group ajustes-field-evaluacion">
                              <label className="ajustes-field-label">Evaluación de los Ajustes</label>
                              <textarea
                                className="table-textarea"
                                value={t.evaluacion || ''}
                                onChange={e => handleChangeTrimestre(item.id, t.id, 'evaluacion', e.target.value)}
                                placeholder="Observaciones..."
                                rows={4}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Vista de Impresión: Muestra TODOS los trimestres uno debajo del otro */}
                      <div className="trimestre-print-view print-only">
                        {item.trimestres.map((t, index) => (
                          <div key={t.id} className="print-trimestre-block" style={{ display: 'flex', width: '100%', borderBottom: index < item.trimestres.length - 1 ? '1px dashed #ccc' : 'none' }}>
                            <div style={{ flex: '1 1 30%', padding: '6px', borderRight: '1px solid var(--border-color)' }}>
                              <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>{t.trimestre}</strong>
                              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.objetivos}</div>
                            </div>
                            <div style={{ flex: '1 1 30%', padding: '6px', borderRight: '1px solid var(--border-color)' }}>
                              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.barreras}</div>
                            </div>
                            <div style={{ flex: '1 1 25%', padding: '6px', borderRight: '1px solid var(--border-color)' }}>
                              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.ajustes}</div>
                            </div>
                            <div style={{ flex: '1 1 15%', padding: '6px' }}>
                              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.evaluacion}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                    </td>

                    <td className="action-cell no-print" style={{ verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        className="btn-icon-danger btn-delete-ajuste"
                        onClick={() => handleDeleteRequest(item.id)}
                        title="Eliminar asignatura y todos sus trimestres"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmación para Eliminar Ajuste */}
      {deleteModalAjuste && createPortal(
        <div id="modal-delete-ajuste" className={`modal-overlay active ${isClosingDeleteModal ? 'closing' : ''}`} onClick={(e) => e.target.id === 'modal-delete-ajuste' && handleCloseDeleteModal()}>
          <div className="modal-container" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: '24px' }}>delete_forever</span>
                ¿Eliminar asignatura?
              </h3>
              <button type="button" className="modal-close" onClick={handleCloseDeleteModal} aria-label="Cerrar modal">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0 24px 20px 24px', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas eliminar esta asignatura del PIAR y todos sus trimestres? Esta acción no se puede deshacer.
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0' }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                style={{ width: '100%', padding: '12px 16px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </CollaborativeSection>
  );
}
