export default function StudioPiarCard({
  profile,
  detectedAreas,
  selectedAreaIndex,
  onSelectAreaIndex,
  hasPackageForArea,
  activeArea,
  isGenerating,
  shortGenerationLabel,
  onGenerate
}) {
  return (
    <div className="aia-bento-card">
      <div className="aia-dna-header-row">
        <h3 className="aia-bento-title">Expediente PIAR · {profile.nombreCompleto}</h3>

        <span className="aia-status-badge readonly aia-tabular">
          {profile.contextCompleteness}% contexto
        </span>
      </div>

      <div className="aia-piar-dna-grid" style={{ marginBottom: '14px' }}>
        <div className="aia-dna-item">
          <span className="aia-dna-label">Anexo 1 · Perfil, Grado y Entorno Familiar</span>
          <strong className="aia-dna-value">
            {profile.edad} años · Grado {profile.grado} ({profile.institucionEducativa})
          </strong>
          <p className="aia-dna-text" style={{ marginTop: '4px' }}>
            <strong>Núcleo familiar:</strong> {profile.apoyoFamiliar}
          </p>
        </div>
        <div className="aia-dna-item">
          <span className="aia-dna-label">Anexo 1 · Salud, Terapias y Productos de Apoyo</span>
          <strong className="aia-dna-value">{profile.diagnosticoSalud}</strong>
          <p className="aia-dna-text" style={{ marginTop: '4px' }}>
            <strong>Apoyos / Terapias:</strong>{' '}
            {profile.terapiasActivas?.length > 0
              ? `${profile.terapiasActivas.join(', ')} · ${profile.productosApoyo}`
              : profile.productosApoyo}
          </p>
        </div>
        <div className="aia-dna-item full">
          <span className="aia-dna-label">
            Anexo 1 y 2 · Trayectoria Educativa y Características Psicopedagógicas
          </span>
          <p className="aia-dna-text">{profile.caracteristicas}</p>
          {profile.observacionesTrayectoria && (
            <p className="aia-dna-text" style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
              <strong>Trayectoria (Anexo 1):</strong> {profile.observacionesTrayectoria}
            </p>
          )}
        </div>
        <div className="aia-dna-item full">
          <span className="aia-dna-label">
            Anexo 2 (PMI) y Anexo 3 · Directrices de Aula y Acuerdos con Hogar
          </span>
          <p className="aia-dna-text">{profile.compromisosAula}</p>
        </div>
      </div>

      {/* Selector de Área del PIAR (sin contenedor anidado) */}
      <div className="aia-area-selector-section">
        <span className="aia-dna-label">Área del PIAR ({detectedAreas.length})</span>
        <div className="aia-package-pills" style={{ marginTop: '8px', marginBottom: '12px' }}>
          {detectedAreas.map((ar, idx) => {
            const alreadyGenerated = hasPackageForArea(ar.displayArea);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectAreaIndex(idx)}
                className={`aia-pkg-pill ${selectedAreaIndex === idx ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  {alreadyGenerated ? 'check_circle' : 'auto_awesome'}
                </span>
                <span>{ar.displayArea}</span>
              </button>
            );
          })}
        </div>

        {activeArea && (
          <div className="aia-area-goal-line">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', color: 'var(--primary)' }}
            >
              flag
            </span>
            <span>
              <strong>Meta PIAR:</strong> {activeArea.objetivos}
            </span>
          </div>
        )}
      </div>

      {/* Botón Único de Generación Automática con Gemini IA */}
      <button
        type="button"
        className={`aia-btn-primary aia-btn-full ${isGenerating ? 'aia-btn-generating' : ''}`}
        disabled={isGenerating}
        aria-busy={isGenerating}
        onClick={() => onGenerate(activeArea)}
      >
        {isGenerating ? (
          <>
            <span className="aia-btn-spinner" aria-hidden="true" />
            <span>{shortGenerationLabel}</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
              auto_awesome
            </span>
            <span>Generar Material IA · {activeArea.displayArea}</span>
          </>
        )}
      </button>
    </div>
  );
}
