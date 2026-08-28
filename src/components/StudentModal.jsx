import { useState } from 'react';
import { usePiar } from '../context/PiarContext';
import { createBlankPiar } from '../lib/piarTemplates';

export default function StudentModal({ onClose, switchTab, showToast }) {
  const { createPiar, setActiveStudentId } = usePiar();
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !lastname.trim()) {
      showToast('Nombre y apellido son requeridos.', 'danger');
      return;
    }
    setLoading(true);
    const blankData = createBlankPiar(name.trim(), lastname.trim(), grade.trim());
    const created = await createPiar(blankData);
    setLoading(false);
    if (created) {
      setActiveStudentId(created.id);
      onClose();
      switchTab('tab-anexo1', created.id);
      showToast(`Se creó el PIAR de ${created.nombre}`);
    } else {
      showToast('Error al crear el estudiante.', 'danger');
    }
  };

  return (
    <div id="modal-new-student" className="modal-overlay active" onClick={(e) => e.target.id === 'modal-new-student' && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">Nuevo Registro PIAR</h3>
          <button id="btn-modal-close" className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="new-student-name">Nombres <span className="required">*</span></label>
              <input
                type="text"
                id="new-student-name"
                className="form-control"
                placeholder="Ej. Carlos Eduardo"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-student-lastname">Apellidos <span className="required">*</span></label>
              <input
                type="text"
                id="new-student-lastname"
                className="form-control"
                placeholder="Ej. Bolaño Londoño"
                value={lastname}
                onChange={e => setLastname(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-student-grade">Grado del estudiante</label>
              <input
                type="text"
                id="new-student-grade"
                className="form-control"
                placeholder="Ej. 10°3"
                value={grade}
                onChange={e => setGrade(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" id="btn-modal-cancel" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" id="btn-modal-submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
