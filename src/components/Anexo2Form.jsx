import { usePiar } from '../context/PiarContext';
import { PLantillasPIAR } from '../lib/piarTemplates';
import AjustesTable from './AjustesTable';
import PmiTable from './PmiTable';

export default function Anexo2Form({ showToast, switchTab }) {
  const { getActiveStudent, savePiar, updateLocalPiarData, saveActivePiar, unsavedChanges } = usePiar();
  const activeStudent = getActiveStudent();
  const isBlankTemplate = !activeStudent;

  const displayStudent = activeStudent || {
    id: 'blanco-temp',
    nombre: '',
    grado: '',
    data: PLantillasPIAR.blanco
  };

  const data = displayStudent.data;
  const { general, caracteristicasEstudiante, firmas } = data.anexo2;

  const handleChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo2[field] = value;
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  const handleGeneralChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo2.general[field] = value;
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  const handleFirmaChange = (index, field, value) => {
    const updatedData = { ...data };
    updatedData.anexo2.firmas[index][field] = value;
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  // Helper para actualizar tablas dinámicas anidadas
  const handleTableUpdate = (anexo, field, updatedList) => {
    const updatedData = { ...data };
    updatedData[anexo][field] = updatedList;
    const sectionKey = field === 'ajustesRazonables' ? 'anexo2-ajustes' : 'anexo2-pmi';
    savePiar(displayStudent.id, updatedData, sectionKey);
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

        {isBlankTemplate && (
          <div className="no-print" style={{ 
            backgroundColor: 'rgba(236, 106, 6, 0.1)', 
            border: '1px dashed var(--warning)', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            color: 'var(--text-main)'
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--warning)', fontSize: '24px' }}>info</span>
            <div>
              <strong style={{ display: 'block', marginBottom: '2px' }}>Vista de Formulario en Blanco (Solo Lectura)</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                No has seleccionado ningún estudiante. Estás viendo la estructura vacía del Anexo 2. Selecciona un estudiante en el Panel de Control para poder editarlo.
              </span>
            </div>
          </div>
        )}

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
            <div style={{ fontWeight: 600 }}>{isBlankTemplate ? '' : displayStudent.nombre}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Identificación</label>
            <div style={{ fontWeight: 600 }}>{isBlankTemplate ? '' : data.anexo1?.estudiante?.numeroIdentificacion}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Edad</label>
            <div style={{ fontWeight: 600 }}>{isBlankTemplate ? '' : (data.anexo1?.estudiante?.edad ? `${data.anexo1.estudiante.edad} años` : '')}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Grado</label>
            <div style={{ fontWeight: 600 }}>{isBlankTemplate ? '' : displayStudent.grado}</div>
          </div>
        </div>
        <div style={isBlankTemplate ? { pointerEvents: 'none', opacity: 0.85 } : {}}>
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
                placeholder="Ej. Mañana, Tarde"
                value={general.jornada || ''}
                onChange={e => handleGeneralChange('jornada', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="anexo2-general-docentesElaboran">Docentes que elaboran</label>
              <input
                type="text"
                id="anexo2-general-docentesElaboran"
                className="form-control"
                placeholder="Nombres de los docentes"
                value={general.docentesElaboran || ''}
                onChange={e => handleGeneralChange('docentesElaboran', e.target.value)}
              />
            </div>
          </div>

          <h5 className="section-subtitle">1. Características del Estudiante</h5>
          <div className="form-group">
            <label htmlFor="anexo2-caracteristicasEstudiante">
              Descripción general del estudiante con énfasis en sus gustos, intereses o aspectos que le desagradan, expectativas de la familia
            </label>
            <textarea
              id="anexo2-caracteristicasEstudiante"
              className="form-control"
              rows="4"
              placeholder="Habilidades, gustos, expectativas, etc..."
              value={caracteristicasEstudiante || ''}
              onChange={e => handleChange('caracteristicasEstudiante', e.target.value)}
            />
          </div>

          <h5 className="section-subtitle">2. Ajustes Razonables</h5>
          <AjustesTable
            list={data.anexo2.ajustesRazonables || []}
            onUpdate={newList => handleTableUpdate('anexo2', 'ajustesRazonables', newList)}
          />

          <h5 className="section-subtitle">3. Recomendaciones PMI (Plan de Mejoramiento Institucional)</h5>
          <PmiTable
            list={data.anexo2.pmiRecomendaciones || []}
            onUpdate={newList => handleTableUpdate('anexo2', 'pmiRecomendaciones', newList)}
          />

          <h5 className="section-subtitle">Firmas de Responsables</h5>
          <div className="form-grid-3">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="signature-input-card">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Responsable {idx + 1}</label>
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
          {unsavedChanges && !isBlankTemplate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--warning)', animation: 'pulse 1.5s infinite ease-in-out' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--warning)' }}>Tienes aportaciones sin guardar</span>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isBlankTemplate && (
            <button type="button" className="btn btn-primary" onClick={async () => {
              const success = await saveActivePiar();
              if (success) showToast('Aportación guardada correctamente');
              else showToast('Error al guardar', 'danger');
            }}>
              Guardar Aportación
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => switchTab('tab-anexo3')}>
            Siguiente Anexo 3 &rarr;
          </button>
        </div>
      </div>
    </>
  );
}
