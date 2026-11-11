import { usePiar } from '../context/PiarContext';
import { PLantillasPIAR } from '../lib/piarTemplates';
import ActividadesTable from './ActividadesTable';
import SignaturePad from './SignaturePad';
import AnexoQuickNav from './AnexoQuickNav';

const ANEXO3_SECTIONS = [
  { id: 'anexo3-sec-general', icon: 'history_edu', label: '1. Datos del Acta' },
  { id: 'anexo3-sec-familia', icon: 'family_restroom', label: '2. Familiares / Acudientes' },
  { id: 'anexo3-sec-compromisos', icon: 'handshake', label: '3. Compromisos de Aula' },
  { id: 'anexo3-sec-actividades', icon: 'home_work', label: '4. Actividades en el Hogar' },
  { id: 'anexo3-sec-firmas', icon: 'draw', label: '5. Firmas del Acuerdo' }
];

export default function Anexo3Form({ switchTab }) {
  const { getActiveStudent, updateLocalPiarData } = usePiar();
  const activeStudent = getActiveStudent();
  const isBlankTemplate = !activeStudent;

  const displayStudent = activeStudent || {
    id: 'blanco-temp',
    nombre: '',
    grado: '',
    data: PLantillasPIAR.blanco
  };

  const data = displayStudent.data;
  const { general, compromisosAula, firmas } = data.anexo3;

  const handleChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo3[field] = value;
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  const handleGeneralChange = (field, value) => {
    const updatedData = { ...data };
    updatedData.anexo3.general[field] = value;
    updateLocalPiarData(displayStudent.id, updatedData);
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
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  const handleFirmaChange = (field, value) => {
    const updatedData = { ...data };
    if (!updatedData.anexo3.firmas) {
      updatedData.anexo3.firmas = { estudiante: '', acudiente: '', docentes: '', directivo: '' };
    }
    updatedData.anexo3.firmas[field] = value;
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  const handleTableUpdate = (anexo, field, updatedList) => {
    const updatedData = { ...data };
    updatedData[anexo][field] = updatedList;
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  return (
    <>
      <AnexoQuickNav sections={ANEXO3_SECTIONS} ariaLabel="Secciones del Anexo 3" />

      <div className="card print-page">
        <div className="card-title-container">
          <h3 className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            ANEXO 3: Acta de Acuerdo (Plan Inclusivo)
          </h3>
          <span className="card-description no-print">Compromisos de Familia y Colegio</span>
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
                No has seleccionado ningún estudiante. Estás viendo la estructura vacía del Anexo 3. Selecciona un estudiante en el Panel de Control para poder editarlo.
              </span>
            </div>
          </div>
        )}

        <div className="info-banner no-print">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div>
            <strong>Acta de Acuerdo:</strong> Este documento formaliza los compromisos del establecimiento educativo y de la familia para el acompañamiento y desarrollo de los procesos escolares.
          </div>
        </div>

        <h5 className="section-subtitle">Datos del Estudiante</h5>
        <div className="form-grid-3 student-summary-grid">
          <div className="student-summary-item">
            <div className="student-summary-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
            </div>
            <div className="student-summary-content">
              <span className="student-summary-label">Estudiante</span>
              <div className={`student-summary-value ${!isBlankTemplate && displayStudent.nombre ? '' : 'student-summary-empty'}`}>
                {!isBlankTemplate && displayStudent.nombre ? displayStudent.nombre : 'Sin seleccionar'}
              </div>
            </div>
          </div>

          <div className="student-summary-item">
            <div className="student-summary-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
            </div>
            <div className="student-summary-content">
              <span className="student-summary-label">Identificación</span>
              <div className={`student-summary-value ${!isBlankTemplate && data.anexo1?.estudiante?.numeroIdentificacion ? '' : 'student-summary-empty'}`}>
                {!isBlankTemplate && data.anexo1?.estudiante?.numeroIdentificacion ? data.anexo1.estudiante.numeroIdentificacion : '—'}
              </div>
            </div>
          </div>

          <div className="student-summary-item">
            <div className="student-summary-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>school</span>
            </div>
            <div className="student-summary-content">
              <span className="student-summary-label">Grado / Edad</span>
              <div className={`student-summary-value ${!isBlankTemplate && (displayStudent.grado || data.anexo1?.estudiante?.edad) ? '' : 'student-summary-empty'}`}>
                {!isBlankTemplate && (displayStudent.grado || data.anexo1?.estudiante?.edad)
                  ? `${displayStudent.grado || '—'} / ${data.anexo1?.estudiante?.edad ? `${data.anexo1.estudiante.edad} años` : '—'}`
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        <div style={isBlankTemplate ? { pointerEvents: 'none', opacity: 0.85 } : {}}>
          {/* 1. Datos del Acta */}
          <div id="anexo3-sec-general" className="anexo-section-anchor">
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
          </div>

          {/* 2. Familiares / Acudientes */}
          <div id="anexo3-sec-familia" className="anexo-section-anchor">
            <h5 className="section-subtitle">Familiar / Acudiente 1</h5>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Nombre del Acudiente</label>
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
                  placeholder="Ej. Madre, Padre, Abuelo"
                  value={general.familiaEstudiante?.[0]?.parentesco || ''}
                  onChange={e => handleFamiliaChange(0, 'parentesco', e.target.value)}
                />
              </div>
            </div>

            <h5 className="section-subtitle">Familiar / Acudiente 2 (Opcional)</h5>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Nombre del Acudiente</label>
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
                  placeholder="Ej. Madre, Padre, Abuelo"
                  value={general.familiaEstudiante?.[1]?.parentesco || ''}
                  onChange={e => handleFamiliaChange(1, 'parentesco', e.target.value)}
                />
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* 3. Compromisos de Aula */}
          <div id="anexo3-sec-compromisos" className="anexo-section-anchor">
            <h5 className="section-subtitle">Compromisos del Colegio y la Familia</h5>
            <div className="form-group">
              <label htmlFor="anexo3-compromisosAula">Compromisos específicos para el aula (Establecimiento Educativo):</label>
              <textarea
                id="anexo3-compromisosAula"
                className="form-control"
                style={{ minHeight: 120 }}
                placeholder="Describa los compromisos y responsabilidades del colegio..."
                value={compromisosAula || ''}
                onChange={e => handleChange('compromisosAula', e.target.value)}
              />
            </div>
          </div>

          {/* 4. Actividades en el Hogar */}
          <div id="anexo3-sec-actividades" className="anexo-section-anchor">
            <ActividadesTable
              list={data.anexo3.actividadesHogar || []}
              onUpdate={newList => handleTableUpdate('anexo3', 'actividadesHogar', newList)}
            />
          </div>

          {/* 5. Firmas del Acuerdo */}
          <div id="anexo3-sec-firmas" className="anexo-section-anchor">
            <h5 className="section-subtitle">Firma de los Actores Comprometidos (Pizarra de Firma)</h5>
            <div className="signature-grid">
              {/* Estudiante */}
              <div className="signature-input-card">
                <SignaturePad
                  label="Firma del Estudiante"
                  savedSignature={firmas?.estudianteSignature || ''}
                  onSave={val => handleFirmaChange('estudianteSignature', val)}
                  onClear={() => handleFirmaChange('estudianteSignature', '')}
                />
              </div>

              {/* Acudiente */}
              <div className="signature-input-card">
                <SignaturePad
                  label="Firma de la Familia o Acudiente"
                  savedSignature={firmas?.acudienteSignature || ''}
                  onSave={val => handleFirmaChange('acudienteSignature', val)}
                  onClear={() => handleFirmaChange('acudienteSignature', '')}
                />
              </div>

              {/* Docentes */}
              <div className="signature-input-card">
                <SignaturePad
                  label="Firma de Docentes comprometidos"
                  savedSignature={firmas?.docentesSignature || ''}
                  onSave={val => handleFirmaChange('docentesSignature', val)}
                  onClear={() => handleFirmaChange('docentesSignature', '')}
                />
              </div>

              {/* Docentes 2 */}
              <div className="signature-input-card">
                <SignaturePad
                  label="Firma de Docentes (2)"
                  savedSignature={firmas?.docentesSignature2 || ''}
                  onSave={val => handleFirmaChange('docentesSignature2', val)}
                  onClear={() => handleFirmaChange('docentesSignature2', '')}
                />
              </div>

              {/* Directivo */}
              <div className="signature-input-card">
                <SignaturePad
                  label="Firma de Directivo docente"
                  savedSignature={firmas?.directivoSignature || ''}
                  onSave={val => handleFirmaChange('directivoSignature', val)}
                  onClear={() => handleFirmaChange('directivoSignature', '')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de Navegación del Wizard */}
      <div className="wizard-nav-container no-print">
        <button type="button" className="btn-wizard-prev" onClick={() => switchTab('tab-anexo2')}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          <span>Anterior Anexo 2</span>
        </button>

        <button type="button" className="btn-wizard-next" onClick={() => switchTab('tab-preview')}>
          <span>Finalizar y Ver PIAR</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
        </button>
      </div>
    </>
  );
}
