export default function Anexo1Hogar({ hogar, handleChange }) {
  return (
    <div className="card print-page">
      <div className="card-title-container">
        <h3 className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          3. Entorno Hogar
        </h3>
      </div>

      <div className="form-grid-2">
        {/* Madre */}
        <div style={{ borderRight: '1px dashed var(--border-color)', paddingRight: 20 }}>
          <h5 className="section-subtitle" style={{ fontSize: '0.95rem' }}>Información de la Madre</h5>
          <div className="form-group">
            <label htmlFor="anexo1-hogar-nombreMadre">Nombre de la Madre</label>
            <input
              type="text"
              id="anexo1-hogar-nombreMadre"
              className="form-control"
              placeholder="Nombre completo"
              value={hogar.nombreMadre || ''}
              onChange={e => handleChange('hogar', 'nombreMadre', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="anexo1-hogar-ocupacionMadre">Ocupación</label>
            <input
              type="text"
              id="anexo1-hogar-ocupacionMadre"
              className="form-control"
              placeholder="Ej. Comerciante, Ama de casa"
              value={hogar.ocupacionMadre || ''}
              onChange={e => handleChange('hogar', 'ocupacionMadre', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="anexo1-hogar-nivelMadre">Nivel Educativo Alcanzado</label>
            <input
              type="text"
              id="anexo1-hogar-nivelMadre"
              className="form-control"
              placeholder="Ej. Bachiller, Profesional"
              value={hogar.nivelMadre || ''}
              onChange={e => handleChange('hogar', 'nivelMadre', e.target.value)}
            />
          </div>
        </div>
        
        {/* Padre */}
        <div style={{ paddingLeft: 10 }}>
          <h5 className="section-subtitle" style={{ fontSize: '0.95rem' }}>Información del Padre</h5>
          <div className="form-group">
            <label htmlFor="anexo1-hogar-nombrePadre">Nombre del Padre</label>
            <input
              type="text"
              id="anexo1-hogar-nombrePadre"
              className="form-control"
              placeholder="Nombre completo"
              value={hogar.nombrePadre || ''}
              onChange={e => handleChange('hogar', 'nombrePadre', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="anexo1-hogar-ocupacionPadre">Ocupación</label>
            <input
              type="text"
              id="anexo1-hogar-ocupacionPadre"
              className="form-control"
              placeholder="Ej. Constructor, Ingeniero"
              value={hogar.ocupacionPadre || ''}
              onChange={e => handleChange('hogar', 'ocupacionPadre', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="anexo1-hogar-nivelPadre">Nivel Educativo Alcanzado</label>
            <input
              type="text"
              id="anexo1-hogar-nivelPadre"
              className="form-control"
              placeholder="Ej. Prim/Bto/Téc/Tecn/univ."
              value={hogar.nivelPadre || ''}
              onChange={e => handleChange('hogar', 'nivelPadre', e.target.value)}
            />
          </div>
        </div>
      </div>

      <hr className="section-divider" />

      <h5 className="section-subtitle" style={{ fontSize: '0.95rem' }}>Información del Cuidador (Si aplica)</h5>
      <div className="form-grid-3">
        <div className="form-group">
          <label htmlFor="anexo1-hogar-nombreCuidador">Nombre del Cuidador</label>
          <input
            type="text"
            id="anexo1-hogar-nombreCuidador"
            className="form-control"
            placeholder="Nombre completo"
            value={hogar.nombreCuidador || ''}
            onChange={e => handleChange('hogar', 'nombreCuidador', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-hogar-parentescoCuidador">Parentesco</label>
          <input
            type="text"
            id="anexo1-hogar-parentescoCuidador"
            className="form-control"
            placeholder="Ej. Tía, Abuelo"
            value={hogar.parentescoCuidador || ''}
            onChange={e => handleChange('hogar', 'parentescoCuidador', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-hogar-nivelCuidador">Nivel Educativo Cuidador</label>
          <input
            type="text"
            id="anexo1-hogar-nivelCuidador"
            className="form-control"
            placeholder="Nivel escolar"
            value={hogar.nivelCuidador || ''}
            onChange={e => handleChange('hogar', 'nivelCuidador', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-hogar-telefonoCuidador">Teléfono del Cuidador</label>
          <input
            type="text"
            id="anexo1-hogar-telefonoCuidador"
            className="form-control"
            placeholder="Teléfono"
            value={hogar.telefonoCuidador || ''}
            onChange={e => handleChange('hogar', 'telefonoCuidador', e.target.value)}
          />
        </div>
        <div className="form-group col-span-2">
          <label htmlFor="anexo1-hogar-emailCuidador">Correo Electrónico</label>
          <input
            type="email"
            id="anexo1-hogar-emailCuidador"
            className="form-control"
            placeholder="cuidador@correo.com"
            value={hogar.emailCuidador || ''}
            onChange={e => handleChange('hogar', 'emailCuidador', e.target.value)}
          />
        </div>
      </div>

      <hr className="section-divider" />

      <h5 className="section-subtitle" style={{ fontSize: '0.95rem' }}>Estructura y Apoyo Familiar</h5>
      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="anexo1-hogar-numHermanos">Nº de Hermanos</label>
          <input
            type="number"
            id="anexo1-hogar-numHermanos"
            className="form-control"
            placeholder="Cantidad de hermanos"
            value={hogar.numHermanos || ''}
            onChange={e => handleChange('hogar', 'numHermanos', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-hogar-lugarHermanos">Lugar que ocupa en la familia</label>
          <input
            type="text"
            id="anexo1-hogar-lugarHermanos"
            className="form-control"
            placeholder="Ej. Mayor, Menor, 2/3"
            value={hogar.lugarHermanos || ''}
            onChange={e => handleChange('hogar', 'lugarHermanos', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-hogar-apoyanCrianza">¿Quiénes apoyan la crianza?</label>
          <input
            type="text"
            id="anexo1-hogar-apoyanCrianza"
            className="form-control"
            placeholder="Ej. Madre, Abuela"
            value={hogar.apoyanCrianza || ''}
            onChange={e => handleChange('hogar', 'apoyanCrianza', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="anexo1-hogar-personasConQuienVive">Personas con quienes vive</label>
          <input
            type="text"
            id="anexo1-hogar-personasConQuienVive"
            className="form-control"
            placeholder="Con quienes comparte el hogar"
            value={hogar.personasConQuienVive || ''}
            onChange={e => handleChange('hogar', 'personasConQuienVive', e.target.value)}
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-group">
          <label>¿Está bajo protección del ICBF?</label>
          <div className="options-group-horizontal">
            <div className={`radio-card ${hogar.bajoProteccion === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('hogar', 'bajoProteccion', 'SI')}>Sí</div>
            <div className={`radio-card ${hogar.bajoProteccion === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('hogar', 'bajoProteccion', 'NO')}>No</div>
          </div>
        </div>
        <div className="form-group col-span-2">
          <label>¿La familia recibe algún subsidio estatal?</label>
          <div className="form-grid-3" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${hogar.recibeSubsidio === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('hogar', 'recibeSubsidio', 'SI')}>Sí</div>
              <div className={`radio-card ${hogar.recibeSubsidio === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('hogar', 'recibeSubsidio', 'NO')}>No</div>
            </div>
            {hogar.recibeSubsidio === 'SI' && (
              <input
                type="text"
                id="anexo1-hogar-subsidioCual"
                className="form-control col-span-2"
                placeholder="Ej. Renta Ciudadana"
                value={hogar.subsidioCual || ''}
                onChange={e => handleChange('hogar', 'subsidioCual', e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
