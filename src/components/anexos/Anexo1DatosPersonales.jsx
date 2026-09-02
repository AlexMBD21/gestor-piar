export default function Anexo1DatosPersonales({ general, estudiante, handleChange, isBlankTemplate }) {
  return (
    <div className="card print-page">
      <div className="card-title-container">
        <h3 className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          ANEXO 1: Información General del Estudiante
        </h3>
        <span className="card-description no-print">Información para la matrícula</span>
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
              No has seleccionado ningún estudiante. Estás viendo la estructura vacía del Anexo 1. Selecciona un estudiante en el Panel de Control para poder editarlo.
            </span>
          </div>
        </div>
      )}

      <div className="info-banner no-print">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <div>
          <strong>Diligenciamiento del Formato:</strong> Este anexo recoge los datos de identificación, salud, entorno familiar y educativo del estudiante. Debe ser diligenciado por la Institución Educativa.
        </div>
      </div>

      <h4 className="section-subtitle">Diligenciamiento</h4>
      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="anexo1-general-fechaDiligenciamiento">Fecha de Diligenciamiento</label>
          <input
            type="date"
            id="anexo1-general-fechaDiligenciamiento"
            className="form-control"
            value={general.fechaDiligenciamiento || ''}
            onChange={e => handleChange('general', 'fechaDiligenciamiento', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-general-lugarDiligenciamiento">Lugar de Diligenciamiento</label>
          <input
            type="text"
            id="anexo1-general-lugarDiligenciamiento"
            className="form-control"
            placeholder="Ej. Montería, Córdoba"
            value={general.lugarDiligenciamiento || ''}
            onChange={e => handleChange('general', 'lugarDiligenciamiento', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-general-nombreDiligencia">Nombre de la persona que diligencia</label>
          <input
            type="text"
            id="anexo1-general-nombreDiligencia"
            className="form-control"
            placeholder="Nombre completo"
            value={general.nombreDiligencia || ''}
            onChange={e => handleChange('general', 'nombreDiligencia', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-general-rolDiligencia">Rol que desempeña en la SE o IE</label>
          <input
            type="text"
            id="anexo1-general-rolDiligencia"
            className="form-control"
            placeholder="Ej. Docente de Apoyo, Orientador"
            value={general.rolDiligencia || ''}
            onChange={e => handleChange('general', 'rolDiligencia', e.target.value)}
          />
        </div>
      </div>

      <hr className="section-divider" />

      <h4 className="section-subtitle">1. Datos Personales del Estudiante</h4>
      <div className="form-grid-3">
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-nombres">Nombres <span className="required">*</span></label>
          <input
            type="text"
            id="anexo1-estudiante-nombres"
            className="form-control"
            required
            placeholder="Ej. Carlos Eduardo"
            value={estudiante.nombres || ''}
            onChange={e => handleChange('estudiante', 'nombres', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-apellidos">Apellidos <span className="required">*</span></label>
          <input
            type="text"
            id="anexo1-estudiante-apellidos"
            className="form-control"
            required
            placeholder="Ej. Bolaño Londoño"
            value={estudiante.apellidos || ''}
            onChange={e => handleChange('estudiante', 'apellidos', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-lugarNacimiento">Lugar de Nacimiento</label>
          <input
            type="text"
            id="anexo1-estudiante-lugarNacimiento"
            className="form-control"
            placeholder="Ciudad y departamento"
            value={estudiante.lugarNacimiento || ''}
            onChange={e => handleChange('estudiante', 'lugarNacimiento', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-fechaNacimiento">Fecha de Nacimiento</label>
          <input
            type="date"
            id="anexo1-estudiante-fechaNacimiento"
            className="form-control"
            value={estudiante.fechaNacimiento || ''}
            onChange={e => handleChange('estudiante', 'fechaNacimiento', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-edad">Edad</label>
          <input
            type="number"
            id="anexo1-estudiante-edad"
            className="form-control"
            placeholder="Ej. 17"
            value={estudiante.edad || ''}
            onChange={e => handleChange('estudiante', 'edad', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-tipoIdentificacion">Tipo de Identificación</label>
          <select
            id="anexo1-estudiante-tipoIdentificacion"
            className="form-control"
            value={estudiante.tipoIdentificacion || 'TI'}
            onChange={e => handleChange('estudiante', 'tipoIdentificacion', e.target.value)}
          >
            <option value="TI">TI (Tarjeta de Identidad)</option>
            <option value="CC">CC (Cédula de Ciudadanía)</option>
            <option value="RC">RC (Registro Civil)</option>
            <option value="PEP">PEP</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        {estudiante.tipoIdentificacion === 'Otro' && (
          <div className="form-group">
            <label htmlFor="anexo1-estudiante-tipoIdentificacionOtro">¿Cuál otro tipo?</label>
            <input
              type="text"
              id="anexo1-estudiante-tipoIdentificacionOtro"
              className="form-control"
              value={estudiante.tipoIdentificacionOtro || ''}
              onChange={e => handleChange('estudiante', 'tipoIdentificacionOtro', e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="anexo1-estudiante-numeroIdentificacion">Número de Identificación</label>
          <input
            type="text"
            id="anexo1-estudiante-numeroIdentificacion"
            className="form-control"
            placeholder="Número de documento"
            value={estudiante.numeroIdentificacion || ''}
            onChange={e => handleChange('estudiante', 'numeroIdentificacion', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-departamento">Departamento de Vivienda</label>
          <input
            type="text"
            id="anexo1-estudiante-departamento"
            className="form-control"
            placeholder="Ej. Córdoba"
            value={estudiante.departamento || ''}
            onChange={e => handleChange('estudiante', 'departamento', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-municipio">Municipio</label>
          <input
            type="text"
            id="anexo1-estudiante-municipio"
            className="form-control"
            placeholder="Ej. Montería"
            value={estudiante.municipio || ''}
            onChange={e => handleChange('estudiante', 'municipio', e.target.value)}
          />
        </div>
        <div className="form-group col-span-2">
          <label htmlFor="anexo1-estudiante-direccion">Dirección de Vivienda</label>
          <input
            type="text"
            id="anexo1-estudiante-direccion"
            className="form-control"
            placeholder="Ej. Calle 12 N° 45-20"
            value={estudiante.direccion || ''}
            onChange={e => handleChange('estudiante', 'direccion', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-barrioVereda">Barrio o Vereda</label>
          <input
            type="text"
            id="anexo1-estudiante-barrioVereda"
            className="form-control"
            placeholder="Nombre del barrio"
            value={estudiante.barrioVereda || ''}
            onChange={e => handleChange('estudiante', 'barrioVereda', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-telefono">Teléfono de Contacto</label>
          <input
            type="text"
            id="anexo1-estudiante-telefono"
            className="form-control"
            placeholder="Celular o fijo"
            value={estudiante.telefono || ''}
            onChange={e => handleChange('estudiante', 'telefono', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-email">Correo Electrónico</label>
          <input
            type="email"
            id="anexo1-estudiante-email"
            className="form-control"
            placeholder="ejemplo@correo.com"
            value={estudiante.email || ''}
            onChange={e => handleChange('estudiante', 'email', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-gradoAspirado">Grado al que aspira ingresar</label>
          <input
            type="text"
            id="anexo1-estudiante-gradoAspirado"
            className="form-control"
            placeholder="Ej. Décimo (10°)"
            value={estudiante.gradoAspirado || ''}
            onChange={e => handleChange('estudiante', 'gradoAspirado', e.target.value)}
          />
        </div>
      </div>

      <div className="form-grid-3" style={{ marginTop: 10 }}>
        <div className="form-group">
          <label>¿Está en centro de protección?</label>
          <div className="options-group-horizontal">
            <div className={`radio-card ${estudiante.centroProteccion === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('estudiante', 'centroProteccion', 'SI')}>Sí</div>
            <div className={`radio-card ${estudiante.centroProteccion === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('estudiante', 'centroProteccion', 'NO')}>No</div>
          </div>
        </div>

        {estudiante.centroProteccion === 'SI' && (
          <div className="form-group col-span-2">
            <label htmlFor="anexo1-estudiante-centroProteccionDonde">¿Dónde? Especificar Institución</label>
            <input
              type="text"
              id="anexo1-estudiante-centroProteccionDonde"
              className="form-control"
              placeholder="Nombre de la institución o centro"
              value={estudiante.centroProteccionDonde || ''}
              onChange={e => handleChange('estudiante', 'centroProteccionDonde', e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="anexo1-estudiante-grupoEtnico">¿Se reconoce o pertenece a un grupo étnico?</label>
          <input
            type="text"
            id="anexo1-estudiante-grupoEtnico"
            className="form-control"
            placeholder="Escribir 'No' o especificar cuál grupo"
            value={estudiante.grupoEtnico || ''}
            onChange={e => handleChange('estudiante', 'grupoEtnico', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>¿Se reconoce como víctima del conflicto armado?</label>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${estudiante.victimaConflicto === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('estudiante', 'victimaConflicto', 'SI')}>Sí</div>
              <div className={`radio-card ${estudiante.victimaConflicto === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('estudiante', 'victimaConflicto', 'NO')}>No</div>
            </div>
            {estudiante.victimaConflicto === 'SI' && (
              <div>
                <div className="options-group-horizontal">
                  <div className={`radio-card ${estudiante.victimaConflictoRegistro === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('estudiante', 'victimaConflictoRegistro', 'SI')} title="Cuenta con Registro Único de Víctimas (RUV)">Con Registro</div>
                  <div className={`radio-card ${estudiante.victimaConflictoRegistro === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('estudiante', 'victimaConflictoRegistro', 'NO')} title="No cuenta con registro formal">Sin Registro</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
