export default function Anexo1Salud({ salud, handleChange, handleTerapiaChange }) {
  return (
    <div className="card print-page">
      <div className="card-title-container">
        <h3 className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          2. Entorno Salud
        </h3>
      </div>

      <div className="form-grid-3">
        <div className="form-group">
          <label>Afiliación al Sistema de Salud</label>
          <div className="options-group-horizontal">
            <div className={`radio-card ${salud.afiliacionSalud === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'afiliacionSalud', 'SI')}>Sí</div>
            <div className={`radio-card ${salud.afiliacionSalud === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'afiliacionSalud', 'NO')}>No</div>
          </div>
        </div>

        {salud.afiliacionSalud === 'SI' && (
          <>
            <div className="form-group">
              <label htmlFor="anexo1-salud-eps">EPS</label>
              <input
                type="text"
                id="anexo1-salud-eps"
                className="form-control"
                placeholder="Nombre de EPS"
                value={salud.eps || ''}
                onChange={e => handleChange('salud', 'eps', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Régimen de Afiliación</label>
              <div className="options-group-horizontal">
                <div className={`radio-card ${salud.regimen === 'Contributivo' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'regimen', 'Contributivo')}>Contributivo</div>
                <div className={`radio-card ${salud.regimen === 'Subsidiado' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'regimen', 'Subsidiado')}>Subsidiado</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="anexo1-salud-lugarEmergencia">Lugar donde le atienden en caso de emergencia</label>
        <input
          type="text"
          id="anexo1-salud-lugarEmergencia"
          className="form-control"
          placeholder="Ej. Camu Vallejo, Centro de Salud Local"
          value={salud.lugarEmergencia || ''}
          onChange={e => handleChange('salud', 'lugarEmergencia', e.target.value)}
        />
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label>¿El estudiante está siendo atendido por el sector salud?</label>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${salud.atendidoSectorSalud === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'atendidoSectorSalud', 'SI')}>Sí</div>
              <div className={`radio-card ${salud.atendidoSectorSalud === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'atendidoSectorSalud', 'NO')}>No</div>
            </div>
            {salud.atendidoSectorSalud === 'SI' && (
              <input
                type="text"
                id="anexo1-salud-frecuenciaAtencion"
                className="form-control"
                placeholder="Frecuencia (Ej. Trimestral)"
                value={salud.frecuenciaAtencion || ''}
                onChange={e => handleChange('salud', 'frecuenciaAtencion', e.target.value)}
              />
            )}
          </div>
        </div>
        <div className="form-group">
          <label>¿Tiene diagnóstico médico oficial?</label>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${salud.diagnosticoMedico === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'diagnosticoMedico', 'SI')}>Sí</div>
              <div className={`radio-card ${salud.diagnosticoMedico === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'diagnosticoMedico', 'NO')}>No</div>
            </div>
            {salud.diagnosticoMedico === 'SI' && (
              <input
                type="text"
                id="anexo1-salud-diagnosticoCual"
                className="form-control"
                placeholder="Escribir diagnóstico (TDAH, Down, etc.)"
                value={salud.diagnosticoCual || ''}
                onChange={e => handleChange('salud', 'diagnosticoCual', e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      <hr className="section-divider" />

      <div className="form-group">
        <label>¿El estudiante asiste a terapias en la actualidad?</label>
        <div className="options-group-horizontal" style={{ width: 200, marginBottom: 12 }}>
          <div className={`radio-card ${salud.atendidoTerapias === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'atendidoTerapias', 'SI')}>Sí</div>
          <div className={`radio-card ${salud.atendidoTerapias === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'atendidoTerapias', 'NO')}>No</div>
        </div>

        {salud.atendidoTerapias === 'SI' && (
          <div className="table-wrapper">
            <table className="custom-table" id="tabla-terapias">
              <thead>
                <tr>
                  <th>¿Cuál terapia? (Ej. Física, Ocupacional, Lenguaje)</th>
                  <th>Frecuencia</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map(idx => (
                  <tr key={idx}>
                    <td data-label="¿Cuál terapia?">
                      <input
                        type="text"
                        className="table-input"
                        placeholder={`Terapia ${idx + 1}`}
                        value={salud.terapias?.[idx]?.cual || ''}
                        onChange={e => handleTerapiaChange(idx, 'cual', e.target.value)}
                      />
                    </td>
                    <td data-label="Frecuencia y días">
                      <input
                        type="text"
                        className="table-input"
                        placeholder="Frecuencia y días"
                        value={salud.terapias?.[idx]?.frecuencia || ''}
                        onChange={e => handleTerapiaChange(idx, 'frecuencia', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label>¿Recibe tratamiento médico por alguna enfermedad?</label>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${salud.tratamientoMedico === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'tratamientoMedico', 'SI')}>Sí</div>
              <div className={`radio-card ${salud.tratamientoMedico === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'tratamientoMedico', 'NO')}>No</div>
            </div>
            {salud.tratamientoMedico === 'SI' && (
              <input
                type="text"
                id="anexo1-salud-tratamientoCual"
                className="form-control"
                placeholder="¿Cuál? (Ej. Oxigenación, Insulina, etc.)"
                value={salud.tratamientoCual || ''}
                onChange={e => handleChange('salud', 'tratamientoCual', e.target.value)}
              />
            )}
          </div>
        </div>
        <div className="form-group">
          <label>¿Consume medicamentos de forma permanente?</label>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div className="options-group-horizontal">
              <div className={`radio-card ${salud.consumeMedicamentos === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'consumeMedicamentos', 'SI')}>Sí</div>
              <div className={`radio-card ${salud.consumeMedicamentos === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'consumeMedicamentos', 'NO')}>No</div>
            </div>
            {salud.consumeMedicamentos === 'SI' && (
              <textarea
                id="anexo1-salud-medicamentosFrecuencia"
                className="form-control"
                placeholder="Escribir nombre del medicamento y horarios escolares"
                value={salud.medicamentosFrecuencia || ''}
                onChange={e => handleChange('salud', 'medicamentosFrecuencia', e.target.value)}
                style={{ minHeight: 40, fontSize: '0.85rem' }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>¿Cuenta con productos de apoyo para favorecer movilidad, comunicación o independencia?</label>
        <div className="form-grid-3" style={{ gap: 10 }}>
          <div className="options-group-horizontal" style={{ maxWidth: 250 }}>
            <div className={`radio-card ${salud.productosApoyo === 'SI' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'productosApoyo', 'SI')}>Sí</div>
            <div className={`radio-card ${salud.productosApoyo === 'NO' ? 'selected' : ''}`} onClick={() => handleChange('salud', 'productosApoyo', 'NO')}>No</div>
          </div>
          {salud.productosApoyo === 'SI' && (
            <input
              type="text"
              id="anexo1-salud-productosApoyoCuales"
              className="form-control col-span-2"
              placeholder="Ej. Silla de ruedas, bastón, audífonos"
              value={salud.productosApoyoCuales || ''}
              onChange={e => handleChange('salud', 'productosApoyoCuales', e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
