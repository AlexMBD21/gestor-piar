export default function Anexo1Educativo({ trayectoria, institucion, firmas, handleChange, handleFirmaChange }) {
  return (
    <div className="card print-page">
      <div className="card-title-container">
        <h3 className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>
          4. Entorno Educativo
        </h3>
      </div>

      <h5 className="section-subtitle" style={{ fontSize: '0.95rem' }}>Trayectoria Educativa</h5>
      
      <div className="form-group">
        <label>¿Ha estado vinculado a otra institución o modalidad inicial?</label>
        <div className="form-grid-3" style={{ gap: 10 }}>
          <div className="options-group-horizontal" style={{ maxWidth: 250 }}>
            <div className={`radio-card ${trayectoria.vinculadoAntes === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'vinculadoAntes', 'SI')}>Sí</div>
            <div className={`radio-card ${trayectoria.vinculadoAntes === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'vinculadoAntes', 'NO')}>No</div>
          </div>
          {trayectoria.vinculadoAntes === 'SI' && (
            <input
              type="text"
              id="anexo1-trayectoria-vinculadoCuales"
              className="form-control col-span-2"
              placeholder="¿En cuáles instituciones?"
              value={trayectoria.vinculadoCuales || ''}
              onChange={e => handleChange('trayectoria', 'vinculadoCuales', e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-group col-span-2">
          <label htmlFor="anexo1-trayectoria-ultimoGrado">Último grado cursado</label>
          <input
            type="text"
            id="anexo1-trayectoria-ultimoGrado"
            className="form-control"
            placeholder="Ej. Noveno (9°)"
            value={trayectoria.ultimoGrado || ''}
            onChange={e => handleChange('trayectoria', 'ultimoGrado', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>¿Aprobó el último grado?</label>
          <div className="options-group-horizontal">
            <div className={`radio-card ${trayectoria.aprobo === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'aprobo', 'SI')}>Sí</div>
            <div className={`radio-card ${trayectoria.aprobo === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'aprobo', 'NO')}>No</div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="anexo1-trayectoria-observaciones">Observaciones (Motivos del cambio o situación escolar)</label>
        <textarea
          id="anexo1-trayectoria-observaciones"
          className="form-control"
          placeholder="Detallar cualquier aspecto relevante de la trayectoria escolar"
          value={trayectoria.observaciones || ''}
          onChange={e => handleChange('trayectoria', 'observaciones', e.target.value)}
        />
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label>¿Se recibe informe pedagógico cualitativo o PIAR previo?</label>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${trayectoria.recibeInforme === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'recibeInforme', 'SI')}>Sí</div>
              <div className={`radio-card ${trayectoria.recibeInforme === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'recibeInforme', 'NO')}>No</div>
            </div>
            {trayectoria.recibeInforme === 'SI' && (
              <input
                type="text"
                id="anexo1-trayectoria-informeProcedencia"
                className="form-control"
                placeholder="Institución que lo provee"
                value={trayectoria.informeProcedencia || ''}
                onChange={e => handleChange('trayectoria', 'informeProcedencia', e.target.value)}
              />
            )}
          </div>
        </div>
        
        <div className="form-group">
          <label>¿Asiste a programas extracurriculares o complementarios?</label>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${trayectoria.programasComplementarios === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'programasComplementarios', 'SI')}>Sí</div>
              <div className={`radio-card ${trayectoria.programasComplementarios === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('trayectoria', 'programasComplementarios', 'NO')}>No</div>
            </div>
            {trayectoria.programasComplementarios === 'SI' && (
              <input
                type="text"
                id="anexo1-trayectoria-programasCuales"
                className="form-control"
                placeholder="Ej. Deportes, música, etc."
                value={trayectoria.programasCuales || ''}
                onChange={e => handleChange('trayectoria', 'programasCuales', e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      <hr className="section-divider" />
      <h5 className="section-subtitle" style={{ fontSize: '0.95rem' }}>Información de la Institución Educativa Actual</h5>
      
      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="anexo1-institucion-nombreIE">Nombre de la Institución Educativa</label>
          <input
            type="text"
            id="anexo1-institucion-nombreIE"
            className="form-control"
            placeholder="Ej. I.E. El Vallejo"
            value={institucion.nombreIE || ''}
            onChange={e => handleChange('institucion', 'nombreIE', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-institucion-sede">Sede</label>
          <input
            type="text"
            id="anexo1-institucion-sede"
            className="form-control"
            placeholder="Sede"
            value={institucion.sede || ''}
            onChange={e => handleChange('institucion', 'sede', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-institucion-medioTransporte">Medio de transporte usado</label>
          <input
            type="text"
            id="anexo1-institucion-medioTransporte"
            className="form-control"
            placeholder="Ej. Caminando, Moto"
            value={institucion.medioTransporte || ''}
            onChange={e => handleChange('institucion', 'medioTransporte', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-institucion-distanciaTiempo">Distancia y tiempo aproximado</label>
          <input
            type="text"
            id="anexo1-institucion-distanciaTiempo"
            className="form-control"
            placeholder="Ej. 15 minutos / 1 km"
            value={institucion.distanciaTiempo || ''}
            onChange={e => handleChange('institucion', 'distanciaTiempo', e.target.value)}
          />
        </div>
      </div>
      
      <hr className="section-divider no-print" />

      <div className="no-print">
        <h5 className="section-subtitle" style={{ fontSize: '0.95rem', marginTop: 20 }}>Firmas de Valoración (Web)</h5>
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
    </div>
  );
}
