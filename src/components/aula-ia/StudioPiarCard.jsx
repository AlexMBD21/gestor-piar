import { useState } from 'react';

function formatAnalysisDate(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return '';
  }
}

export default function StudioPiarCard({
  profile,
  detectedAreas,
  selectedAreaIndex,
  onSelectAreaIndex,
  hasPackageForArea,
  activeArea,
  isGenerating,
  shortGenerationLabel,
  onGenerate,
  studentAnalysis = null,
  isAnalysisStale = false,
  isAnalyzingPiar = false,
  onAnalyzePiar
}) {
  const [analysisCollapsed, setAnalysisCollapsed] = useState(() => {
    try {
      return window.sessionStorage.getItem('aula_ia_analysis_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleAnalysisCollapsed = () => {
    setAnalysisCollapsed((prev) => {
      const next = !prev;
      try {
        window.sessionStorage.setItem('aula_ia_analysis_collapsed', next ? 'true' : 'false');
      } catch {
        // Ignorar restricciones de almacenamiento
      }
      return next;
    });
  };

  const realPct =
    typeof profile.realCompleteness === 'number'
      ? profile.realCompleteness
      : profile.contextCompleteness;
  const analyzedDateLabel = formatAnalysisDate(studentAnalysis?.analyzedAt);

  return (
    <div className="aia-bento-card">
      {/* Cabecera compacta con datos reales del expediente */}
      <div className="aia-dna-header-row">
        <div>
          <h3 className="aia-bento-title">Expediente PIAR · {profile.nombreCompleto}</h3>
          <p className="aia-piar-meta-line">
            Grado {profile.grado} · {profile.edad} años · {profile.institucionEducativa}
          </p>
        </div>

        <span className="aia-status-badge readonly aia-tabular" title="Porcentaje real de secciones diligenciadas en Anexos 1, 2 y 3">
          {realPct}% diligenciado
        </span>
      </div>

      {/* Bloque controlado: Resumen del Estudiante generado bajo demanda por el Agente IA */}
      <div className="aia-piar-analysis-panel">
        {isAnalyzingPiar ? (
          <div className="aia-skel-analysis" role="status" aria-live="polite" aria-label="Analizando expediente PIAR con IA">
            <div className="aia-skel-row-between">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="aia-skel aia-skel-pill" style={{ width: '124px', height: '24px' }} />
                <span className="aia-skel" style={{ width: '88px', height: '12px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="aia-skel" style={{ width: '112px', height: '26px', borderRadius: '8px' }} />
                <span className="aia-skel" style={{ width: '74px', height: '26px', borderRadius: '8px' }} />
              </div>
            </div>
            <span className="aia-skel" style={{ width: '94%', height: '13px' }} />
            <div className="aia-skel-analysis-grid">
              <div className="aia-skel-analysis-box is-strength">
                <span className="aia-skel" style={{ width: '44%', height: '10px' }} />
                <span className="aia-skel" style={{ width: '88%', height: '12px' }} />
                <span className="aia-skel" style={{ width: '72%', height: '12px' }} />
                <span className="aia-skel" style={{ width: '80%', height: '12px' }} />
              </div>
              <div className="aia-skel-analysis-box is-barrier">
                <span className="aia-skel" style={{ width: '42%', height: '10px' }} />
                <span className="aia-skel" style={{ width: '86%', height: '12px' }} />
                <span className="aia-skel" style={{ width: '76%', height: '12px' }} />
                <span className="aia-skel" style={{ width: '82%', height: '12px' }} />
              </div>
              <div className="aia-skel-analysis-box full">
                <span className="aia-skel" style={{ width: '28%', height: '10px' }} />
                <span className="aia-skel" style={{ width: '64%', height: '12px' }} />
                <span className="aia-skel" style={{ width: '58%', height: '12px' }} />
                <span className="aia-skel" style={{ width: '68%', height: '12px' }} />
              </div>
            </div>
            <span className="aia-skel" style={{ width: '54%', height: '11px' }} />
          </div>
        ) : !studentAnalysis ? (
          <div className="aia-analysis-empty">
            <div className="aia-analysis-empty-copy">
              <div className="aia-analysis-icon-badge" aria-hidden="true">
                <span className="material-symbols-outlined">psychology_alt</span>
              </div>
              <div>
                <strong className="aia-analysis-empty-title">
                  Resumen psicopedagógico del estudiante (Agente IA)
                </strong>
                <p className="aia-analysis-empty-sub">
                  Analiza los Anexos 1, 2 y 3 solo cuando lo necesites. El resumen queda guardado
                  para que no tenga que cargarse cada vez que selecciones este estudiante.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="aia-btn-secondary aia-analysis-action-btn"
              disabled={isAnalyzingPiar || isGenerating}
              aria-busy={isAnalyzingPiar}
              onClick={onAnalyzePiar}
            >
              {isAnalyzingPiar ? (
                <>
                  <span className="aia-btn-spinner aia-spinner-dark" aria-hidden="true" />
                  <span>Analizando PIAR...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                    manage_search
                  </span>
                  <span>Analizar PIAR</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="aia-analysis-bar">
              <div className="aia-analysis-bar-left">
                <span className="aia-analysis-mode-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {studentAnalysis.engineMode === 'gemini' ? 'auto_awesome' : 'summarize'}
                  </span>
                  <span>
                    {studentAnalysis.engineMode === 'gemini'
                      ? 'Análisis Agente IA'
                      : 'Resumen del PIAR'}
                  </span>
                </span>
                {analyzedDateLabel && (
                  <span className="aia-analysis-date aia-tabular">{analyzedDateLabel}</span>
                )}
                {isAnalysisStale && (
                  <span
                    className="aia-analysis-stale-pill"
                    title="El expediente PIAR fue modificado después de este análisis"
                  >
                    PIAR actualizado · conviene renovar
                  </span>
                )}
              </div>

              <div className="aia-analysis-bar-actions">
                <button
                  type="button"
                  className="aia-analysis-mini-btn"
                  disabled={isAnalyzingPiar || isGenerating}
                  aria-busy={isAnalyzingPiar}
                  onClick={onAnalyzePiar}
                  title="Volver a analizar los Anexos 1, 2 y 3 con el Agente IA"
                >
                  {isAnalyzingPiar ? (
                    <>
                      <span className="aia-btn-spinner aia-spinner-dark" aria-hidden="true" />
                      <span>Renovando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        refresh
                      </span>
                      <span>Renovar análisis</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="aia-analysis-mini-btn is-ghost"
                  onClick={handleToggleAnalysisCollapsed}
                  aria-expanded={!analysisCollapsed}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {analysisCollapsed ? 'expand_more' : 'expand_less'}
                  </span>
                  <span>{analysisCollapsed ? 'Ver resumen' : 'Ocultar'}</span>
                </button>
              </div>
            </div>

            {!analysisCollapsed && (
              <div className="aia-analysis-body">
                <p className="aia-analysis-summary-text">{studentAnalysis.resumenEjecutivo}</p>

                <div className="aia-analysis-grid">
                  {studentAnalysis.fortalezas?.length > 0 && (
                    <div className="aia-analysis-box is-strength">
                      <span className="aia-dna-label">Fortalezas y apoyos</span>
                      <ul className="aia-analysis-list">
                        {studentAnalysis.fortalezas.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {studentAnalysis.barrerasClave?.length > 0 && (
                    <div className="aia-analysis-box is-barrier">
                      <span className="aia-dna-label">Barreras detectadas</span>
                      <ul className="aia-analysis-list">
                        {studentAnalysis.barrerasClave.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {studentAnalysis.estrategiasAula?.length > 0 && (
                    <div className="aia-analysis-box full">
                      <span className="aia-dna-label">Estrategias recomendadas en aula</span>
                      <ul className="aia-analysis-list">
                        {studentAnalysis.estrategiasAula.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {studentAnalysis.acuerdoHogar && (
                  <p className="aia-analysis-home-line">
                    <strong>Hogar / Anexo 3:</strong> {studentAnalysis.acuerdoHogar}
                  </p>
                )}

                {studentAnalysis.alertasPrioritarias?.length > 0 && (
                  <div className="aia-analysis-alert-box">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      info
                    </span>
                    <div>
                      <strong>Pendiente por completar en el PIAR:</strong>{' '}
                      {studentAnalysis.alertasPrioritarias.join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Selector de Área del PIAR (independiente del análisis general) */}
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

      {/* Botón Único de Generación de Materiales con Gemini IA */}
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
