import CollaborativeSection from './CollaborativeSection';

export default function ActividadesTable({ list, studentData, onUpdate }) {
  const actividades = list || studentData?.anexo3?.actividadesHogar || [];

  const handleUpdate = (updated) => {
    if (typeof onUpdate === 'function') {
      if (onUpdate.length >= 3) {
        onUpdate('anexo3', 'actividadesHogar', updated);
      } else {
        onUpdate(updated);
      }
    }
  };

  const handleAddField = () => {
    const newAct = {
      id: 'act-' + Date.now(),
      actividad: '',
      descripcion: '',
      frecuencia: 'D'
    };
    const updated = [...actividades, newAct];
    handleUpdate(updated);
  };

  const handleChange = (id, field, value) => {
    const updated = actividades.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    handleUpdate(updated);
  };

  const handleDelete = (id) => {
    if (confirm('¿Está seguro de eliminar esta actividad?')) {
      const updated = actividades.filter(item => item.id !== id);
      handleUpdate(updated);
    }
  };

  return (
    <CollaborativeSection sectionKey="anexo3-actividades" className="print-page">
      <div className="card-title-container">
        <h3 className="card-title">Y en casa apoyará con las siguientes actividades:</h3>
        <button type="button" id="btn-add-actividad" className="btn btn-primary btn-sm no-print" onClick={handleAddField}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          <span>Agregar Actividad</span>
        </button>
      </div>
      <p className="card-description no-print" style={{ marginBottom: 16 }}>
        Especifique las actividades acordadas con la familia para el acompañamiento y refuerzo escolar en el hogar.
      </p>

      <div className="table-wrapper">
        <table className="custom-table" id="tabla-actividades-hogar">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Nombre de la Actividad</th>
              <th style={{ width: '55%' }}>Descripción de la estrategia</th>
              <th style={{ width: '20%' }}>Frecuencia (D / S / P)</th>
              <th className="action-cell no-print"></th>
            </tr>
          </thead>
          <tbody id="tbody-actividades-hogar">
            {actividades.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                  Sin actividades registradas.
                </td>
              </tr>
            ) : (
              actividades.map(item => (
                <tr key={item.id}>
                  <td data-label="Actividad">
                    <input
                      type="text"
                      className="table-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      value={item.actividad || ''}
                      onChange={e => handleChange(item.id, 'actividad', e.target.value)}
                      placeholder="Ej. Rutina de repaso"
                    />
                  </td>
                  <td data-label="Descripción">
                    <textarea
                      className="table-textarea"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      value={item.descripcion || ''}
                      onChange={e => handleChange(item.id, 'descripcion', e.target.value)}
                      placeholder="Descripción breve..."
                    />
                  </td>
                  <td data-label="Frecuencia (D / S / P)">
                    <select
                      className="form-control table-input"
                      value={item.frecuencia || 'D'}
                      onChange={e => handleChange(item.id, 'frecuencia', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px' }}
                    >
                      <option value="D">D (Diaria)</option>
                      <option value="S">S (Semanal)</option>
                      <option value="P">P (Permanente)</option>
                    </select>
                  </td>
                  <td className="action-cell no-print">
                    <button
                      type="button"
                      className="btn-icon-danger btn-delete-actividad"
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
