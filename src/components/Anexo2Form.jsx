import { usePiar } from '../context/PiarContext';
import AjustesTable from './AjustesTable';
import PmiTable from './PmiTable';

export default function Anexo2Form({ showToast, switchTab }) {
  const { getActiveStudent, savePiar, updateLocalPiarData, saveActivePiar, unsavedChanges } = usePiar();
  const activeStudent = getActiveStudent();

  if (!activeStudent) return null;

  const data = activeStudent.data;
  const { general, caracteristicasEstudiante, firmas } = data.anexo2;

  const handleChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo2[field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleGeneralChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo2.general[field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleFirmaChange = (index, field, value) => {
    const updatedData = { ...data };
    updatedData.anexo2.firmas[index][field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  // Helper para actualizar tablas dinámicas anidadas
  const handleTableUpdate = (anexo, field, updatedList) => {
    const updatedData = { ...data };
    updatedData[anexo][field] = updatedList;
    const sectionKey = field === 'ajustesRazonables' ? 'anexo2-ajustes' : 'anexo2-pmi';
    savePiar(activeStudent.id, updatedData, sectionKey);
  };

  return (
    <>
      <div className="card print-page">
        <div className="card-title-container">
          <h3 className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            ANEXO 2: Plan Individual de Ajustes Razonables (PIAR)
          </h3>
          <span className="card-description no-print">Seguimiento y Ajustes Razonables</span>
        </div>

        <div className="info-banner no-print">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div>
            <strong>Formulación del Plan PIAR:</strong> Aquí se concretan las barreras del contexto y los ajustes específicos por área y cuatrimestre, junto con los docentes responsables de su implementación.
          </div>
        </div>

        <h5 className="section-subtitle">Datos del Estudiante</h5>
        <div className="form-grid-4" style={{ backgroundColor: 'var(--bg-input)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Estudiante</label>
            <div style={{ fontWeight: 600 }}>{activeStudent.nombre || '—'}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Identificación</label>
            <div style={{ fontWeight: 600 }}>{data.anexo1?.estudiante?.numeroIdentificacion || '—'}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Edad</label>
            <div style={{ fontWeight: 600 }}>{data.anexo1?.estudiante?.edad ? `${data.anexo1.estudiante.edad} años` : '—'}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Grado</label>
            <div style={{ fontWeight: 600 }}>{activeStudent.grado || '—'}</div>
          </div>
        </div>

        <h5 className="section-subtitle">Datos de Elaboración</h5>
        <div className="form-grid-3">
          <div className="form-group">
            <label htmlFor="anexo2-general-fechaElaboracion">Fecha de Elaboración</label>
            <input
              type="date"
              id="anexo2-general-fechaElaboracion"
              className="form-control"
              value={general.fechaElaboracion || ''}
              onChange={e => handleGeneralChange('fechaElaboracion', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="anexo2-general-institucion">Institución Educativa</label>
            <input
              type="text"
              id="anexo2-general-institucion"
              className="form-control"
              placeholder="I.E. Nombre"
              value={general.institucion || ''}
              onChange={e => handleGeneralChange('institucion', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="anexo2-general-sede">Sede Educativa</label>
            <input
              type="text"
              id="anexo2-general-sede"
              className="form-control"
              placeholder="Ej. Principal, Sede B"
              value={general.sede || ''}
              onChange={e => handleGeneralChange('sede', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="anexo2-general-jornada">Jornada</label>
            <input
              type="text"
              id="anexo2-general-jornada"
              className="form-control"
              placeholder="Ej. Completa, Mañana, Tarde"
              value={general.jornada || ''}
              onChange={e => handleGeneralChange('jornada', e.target.value)}
            />
          </div>
          <div className="form-group col-span-2">
            <label htmlFor="anexo2-general-docentesElaboran">Docentes que elaboran y Cargo</label>
            <input
              type="text"
              id="anexo2-general-docentesElaboran"
              className="form-control"
              placeholder="Nombres, apellidos y áreas dictadas"
              value={general.docentesElaboran || ''}
              onChange={e => handleGeneralChange('docentesElaboran', e.target.value)}
            />
          </div>
        </div>

        <hr className="section-divider" />

        <h5 className="section-subtitle">5. Características del Estudiante</h5>
        <div className="form-group">
          <label htmlFor="anexo2-caracteristicasEstudiante">Descripción en términos de lo que hace, puede hacer o requiere apoyo:</label>
          <p className="card-description" style={{ marginBottom: 8 }}>Indique habilidades, competencias, cualidades, gustos, intereses, y expectativas de la familia.</p>
          <textarea
            id="anexo2-caracteristicasEstudiante"
            className="form-control"
            style={{ minHeight: 140 }}
            placeholder="Descripción general detallada del perfil del estudiante y sus apoyos..."
            value={caracteristicasEstudiante || ''}
            onChange={e => handleChange('caracteristicasEstudiante', e.target.value)}
          />
        </div>
      </div>

      {/* Ajustes Razonables Table */}
      <AjustesTable studentData={data} onUpdate={handleTableUpdate} />

      {/* PMI Recommendations Table */}
      <PmiTable studentData={data} onUpdate={handleTableUpdate} />

      {/* Firmas */}
      <div className="card no-print">
        <h5 className="section-subtitle" style={{ fontSize: '0.95rem' }}>Firmas de Valoración del Plan (Web)</h5>
        <div className="form-grid-3">
          {[0, 1, 2].map(idx => (
            <div className="form-group" key={idx}>
              <label>Nombre Funcionario {idx + 1}</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre completo"
                value={firmas?.[idx]?.nombre || ''}
                onChange={e => handleFirmaChange(idx, 'nombre', e.target.value)}
              />
              <input
                type="text"
                className="form-control"
                placeholder="Cargo / Área"
                value={firmas?.[idx]?.area || ''}
                onChange={e => handleFirmaChange(idx, 'area', e.target.value)}
                style={{ marginTop: 8 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Botones de Navegación del Wizard */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '32px', 
        paddingTop: '16px', 
        borderTop: '1px solid var(--border-color)'
      }}>
        <button type="button" className="btn btn-secondary" onClick={() => switchTab('tab-anexo1')}>
          &larr; Anterior Anexo 1
        </button>
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {unsavedChanges && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--warning)', animation: 'pulse 1.5s infinite ease-in-out' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--warning)' }}>Tienes aportaciones sin guardar</span>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn btn-primary" onClick={async () => {
            const success = await saveActivePiar();
            if (success) showToast('Aportación guardada correctamente');
            else showToast('Error al guardar', 'danger');
          }}>
            Guardar Aportación
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => switchTab('tab-anexo3')}>
            Siguiente Anexo 3 &rarr;
          </button>
        </div>
      </div>
    </>
  );
}
