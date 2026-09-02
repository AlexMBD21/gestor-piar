import { escHtml } from '../lib/piarTemplates';
import CollaborativeSection from './CollaborativeSection';

export default function AjustesTable({ list, studentData, onUpdate }) {
  const ajustes = list || studentData?.anexo2?.ajustesRazonables || [];

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
      area: 'Nueva Asignatura',
      trimestre: 'Primer Cuatrimestre',
      docente: '',
      objetivos: '',
      barreras: '',
      ajustes: '',
      evaluacion: ''
    };
    const updated = [...ajustes, newAjuste];
    handleUpdate(updated);
  };

  const handleChange = (id, field, value) => {
    const updated = ajustes.map(item => item.id === id ? { ...item, [field]: value } : item);
    handleUpdate(updated);
  };

  const handleDelete = (id) => {
    if (confirm('¿Está seguro de eliminar esta asignatura del PIAR?')) {
      const updated = ajustes.filter(item => item.id !== id);
      handleUpdate(updated);
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

      <div className="table-wrapper">
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
              ajustes.map(item => (
                <tr key={item.id}>
                  <td data-label="Área / Docente" style={{ fontWeight: 600, minWidth: 140 }}>
                    <input
                      type="text"
                      className="table-input"
                      value={item.area || ''}
                      onChange={e => handleChange(item.id, 'area', e.target.value)}
                      placeholder="Ej. Matemáticas"
                      style={{ fontWeight: 600 }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                      <select
                        className="form-control table-input"
                        value={item.trimestre || 'Primer Cuatrimestre'}
                        onChange={e => handleChange(item.id, 'trimestre', e.target.value)}
                        style={{ fontSize: '0.72rem', padding: 2, marginBottom: 2 }}
                      >
                        <option value="Primer Cuatrimestre">1er Trimestre/Cuat.</option>
                        <option value="Segundo Cuatrimestre">2do Trimestre/Cuat.</option>
                        <option value="Tercer Cuatrimestre">3er Trimestre/Cuat.</option>
                        <option value="Transversal">Transversal</option>
                      </select>
                      <input
                        type="text"
                        className="table-input"
                        value={item.docente || ''}
                        onChange={e => handleChange(item.id, 'docente', e.target.value)}
                        placeholder="Profesor asignado..."
                        style={{ fontSize: '0.72rem', padding: 2, marginTop: 2 }}
                      />
                    </span>
                  </td>
                  <td data-label="Objetivos / Propósitos">
                    <textarea
                      className="table-textarea"
                      value={item.objetivos || ''}
                      onChange={e => handleChange(item.id, 'objetivos', e.target.value)}
                      placeholder="Objetivos del grado..."
                    />
                  </td>
                  <td data-label="Barreras Evidenciadas">
                    <textarea
                      className="table-textarea"
                      value={item.barreras || item.bareras || ''}
                      onChange={e => handleChange(item.id, 'barreras', e.target.value)}
                      placeholder="Barreras del entorno..."
                    />
                  </td>
                  <td data-label="Ajustes Razonables">
                    <textarea
                      className="table-textarea"
                      value={item.ajustes || ''}
                      onChange={e => handleChange(item.id, 'ajustes', e.target.value)}
                      placeholder="Estrategias/Apoyos..."
                    />
                  </td>
                  <td data-label="Evaluación de los Ajustes">
                    <textarea
                      className="table-textarea"
                      value={item.evaluacion || ''}
                      onChange={e => handleChange(item.id, 'evaluacion', e.target.value)}
                      placeholder="Observaciones de seguimiento..."
                    />
                  </td>
                  <td className="action-cell no-print">
                    <button
                      type="button"
                      className="btn-icon-danger btn-delete-ajuste"
                      onClick={() => handleDelete(item.id)}
                      title="Eliminar fila"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CollaborativeSection>
  );
}
