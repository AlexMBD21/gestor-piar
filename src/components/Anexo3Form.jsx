import { usePiar } from '../context/PiarContext';
import ActividadesTable from './ActividadesTable';
import CollaborativeSection from './CollaborativeSection';
import SignaturePad from './SignaturePad';

export default function Anexo3Form({ showToast, switchTab }) {
  const { getActiveStudent, savePiar, updateLocalPiarData, saveActivePiar, unsavedChanges } = usePiar();
  const activeStudent = getActiveStudent();

  if (!activeStudent) return null;

  const data = activeStudent.data;
  const { general, compromisosAula, firmas } = data.anexo3;

  const handleChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo3[field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleGeneralChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo3.general[field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleFamiliaChange = (index, field, value) => {
    const updatedData = { ...data };
    if (!updatedData.anexo3.general.familiaEstudiante) {
      updatedData.anexo3.general.familiaEstudiante = [
        { nombre: '', parentesco: '' },
        { nombre: '', parentesco: '' }
      ];
    }
    updatedData.anexo3.general.familiaEstudiante[index][field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleFirmaChange = (field, value) => {
    const updatedData = { ...data };
    if (!updatedData.anexo3.firmas) {
      updatedData.anexo3.firmas = { estudiante: '', acudiente: '', docentes: '', directivo: '' };
    }
    updatedData.anexo3.firmas[field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleTableUpdate = (anexo, field, updatedList) => {
    const updatedData = { ...data };
    updatedData[anexo][field] = updatedList;
    savePiar(activeStudent.id, updatedData, 'anexo3-actividades');
  };

  return (
    <>
      <div className="card print-page">
        <div className="card-title-container">
          <h3 className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            ANEXO 3: Acta de Acuerdo (Plan Inclusivo)
          </h3>
          <span className="card-description no-print">Compromisos de Familia y Colegio</span>
        </div>

        <div className="info-banner no-print">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div>
            <strong>Acta de Acuerdo:</strong> Este documento formaliza los compromisos del establecimiento educativo y de la familia para el acompañamiento y desarrollo de los procesos escolares.
          </div>
        </div>

        <h5 className="section-subtitle">Datos del Estudiante</h5>
        <div className="form-grid-3" style={{ backgroundColor: 'var(--bg-input)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Estudiante</label>
            <div style={{ fontWeight: 600 }}>{activeStudent.nombre || '—'}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Identificación</label>
            <div style={{ fontWeight: 600 }}>{data.anexo1?.estudiante?.numeroIdentificacion || '—'}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Grado / Edad</label>
            <div style={{ fontWeight: 600 }}>
              {activeStudent.grado || '—'} / {data.anexo1?.estudiante?.edad ? `${data.anexo1.estudiante.edad} años` : '—'}
            </div>
          </div>
        </div>

        <h5 className="section-subtitle">Datos del Acta</h5>
        <div className="form-grid-3">
          <div className="form-group">
            <label htmlFor="anexo3-general-fecha">Fecha</label>
            <input
              type="date"
              id="anexo3-general-fecha"
              className="form-control"
              value={general.fecha || ''}
              onChange={e => handleGeneralChange('fecha', e.target.value)}
            />
          </div>
          <div className="form-group col-span-2">
            <label htmlFor="anexo3-general-institucionSede">Institución Educativa y Sede</label>
            <input
              type="text"
              id="anexo3-general-institucionSede"
              className="form-control"
              placeholder="Ej. Institución Educativa El Vallejo - Sede Principal"
              value={general.institucionSede || ''}
              onChange={e => handleGeneralChange('institucionSede', e.target.value)}
            />
          </div>
          <div className="form-group col-span-3">
            <label htmlFor="anexo3-general-docentesEquipo">Nombres del Equipo Directivo y Docentes comprometidos</label>
            <input
              type="text"
              id="anexo3-general-docentesEquipo"
              className="form-control"
              placeholder="Nombres completos y roles (Ej. Lic. Manuel Salvador, Psicóloga, etc.)"
              value={general.docentesEquipo || ''}
              onChange={e => handleGeneralChange('docentesEquipo', e.target.value)}
            />
          </div>
        </div>

        <hr className="section-divider" />

        <h5 className="section-subtitle">Familia del Estudiante</h5>
        <div className="form-grid-2">
          {/* Familia 1 */}
          <div className="form-grid-2" style={{ borderRight: '1px dashed var(--border-color)', paddingRight: 20 }}>
            <div className="form-group">
              <label>Familiar 1 (Nombre)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre completo"
                value={general.familiaEstudiante?.[0]?.nombre || ''}
                onChange={e => handleFamiliaChange(0, 'nombre', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Parentesco</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Madre, Padre"
                value={general.familiaEstudiante?.[0]?.parentesco || ''}
                onChange={e => handleFamiliaChange(0, 'parentesco', e.target.value)}
              />
            </div>
          </div>

          {/* Familia 2 */}
          <div className="form-grid-2" style={{ paddingLeft: 10 }}>
            <div className="form-group">
              <label>Familiar 2 (Nombre)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre completo"
                value={general.familiaEstudiante?.[1]?.nombre || ''}
                onChange={e => handleFamiliaChange(1, 'nombre', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Parentesco</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Padre, Tía"
                value={general.familiaEstudiante?.[1]?.parentesco || ''}
                onChange={e => handleFamiliaChange(1, 'parentesco', e.target.value)}
              />
            </div>
          </div>
        </div>

        <hr className="section-divider" />

        <h5 className="section-subtitle">Compromisos del Establecimiento Educativo</h5>
        <div className="form-group">
          <label htmlFor="anexo3-compromisosAula">Compromisos específicos en el aula y apoyos:</label>
          <textarea
            id="anexo3-compromisosAula"
            className="form-control"
            style={{ minHeight: 120 }}
            placeholder="Escriba compromisos específicos, adaptaciones curriculares o de evaluación..."
            value={compromisosAula || ''}
            onChange={e => handleChange('compromisosAula', e.target.value)}
          />
        </div>
      </div>

      {/* Actividades Hogar Table */}
      <ActividadesTable studentData={data} onUpdate={handleTableUpdate} />

      {/* Firmas Anexo 3 */}
      <div className="card no-print">
        <h5 className="section-subtitle" style={{ fontSize: '0.95rem', marginBottom: '20px' }}>Firmas del Acta de Acuerdo (Web)</h5>
        <div className="form-grid-2">
          {/* Estudiante */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-input)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SignaturePad
              label="Firma del Estudiante"
              savedSignature={firmas?.estudianteSignature || ''}
              onSave={val => handleFirmaChange('estudianteSignature', val)}
              onClear={() => handleFirmaChange('estudianteSignature', '')}
            />
          </div>

          {/* Acudiente */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-input)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SignaturePad
              label="Firma del Acudiente / Familia"
              savedSignature={firmas?.acudienteSignature || ''}
              onSave={val => handleFirmaChange('acudienteSignature', val)}
              onClear={() => handleFirmaChange('acudienteSignature', '')}
            />
          </div>

          {/* Docentes */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-input)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SignaturePad
              label="Firma de Docentes comprometidos"
              savedSignature={firmas?.docentesSignature || ''}
              onSave={val => handleFirmaChange('docentesSignature', val)}
              onClear={() => handleFirmaChange('docentesSignature', '')}
            />
          </div>

          {/* Directivo */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-input)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SignaturePad
              label="Firma de Directivo docente"
              savedSignature={firmas?.directivoSignature || ''}
              onSave={val => handleFirmaChange('directivoSignature', val)}
              onClear={() => handleFirmaChange('directivoSignature', '')}
            />
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
        <button type="button" className="btn btn-secondary" onClick={() => switchTab('tab-anexo2')}>
          &larr; Anterior Anexo 2
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
          <button type="button" className="btn btn-secondary" onClick={() => switchTab('tab-preview')}>
            Finalizar / Vista Previa &rarr;
          </button>
        </div>
      </div>
    </>
  );
}
