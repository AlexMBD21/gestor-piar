import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion, smoothScrollToElement } from '../../lib/motionCraft';

export default function PackageAccordionList({
  sectionRef,
  packages,
  expandedPkgId,
  profile,
  isLoading = false,
  isGenerating = false,
  generatingSubject = '',
  onToggleExpand,
  onSupervise,
  onTogglePublish,
  onRequestDelete
}) {
  const cardRefs = useRef({});

  useEffect(() => {
    if (!expandedPkgId) return undefined;
    const cardEl = cardRefs.current[expandedPkgId];
    if (!cardEl) return undefined;

    const bodyEl = cardEl.querySelector('.aia-collapsible-pkg-body');
    let scrollCleanup = () => {};
    let ctx = null;

    if (bodyEl && !prefersReducedMotion()) {
      ctx = gsap.context(() => {
        gsap.fromTo(
          bodyEl,
          { height: 0, opacity: 0, overflow: 'hidden' },
          {
            height: 'auto',
            opacity: 1,
            duration: 0.36,
            ease: 'power3.out',
            clearProps: 'height,opacity,overflow'
          }
        );
      }, cardEl);
    }

    const timerId = setTimeout(() => {
      scrollCleanup = smoothScrollToElement(cardEl, { offset: 18, duration: 0.65 });
    }, 90);

    return () => {
      clearTimeout(timerId);
      scrollCleanup();
      if (ctx) ctx.revert();
    };
  }, [expandedPkgId]);

  const hasPackages = Array.isArray(packages) && packages.length > 0;
  if (!hasPackages && !isLoading && !isGenerating) return null;

  return (
    <div ref={sectionRef} className="aia-generated-results-section">
      <div className="aia-materials-header">
        <h4 className="aia-materials-heading">
          <span>Materiales generados</span>
          {hasPackages && (
            <span className="aia-materials-count-pill aia-tabular">{packages.length}</span>
          )}
        </h4>
      </div>

      <div className="aia-packages-accordion-stack aia-packages-compact-list">
        {isGenerating && (
          <div
            className="aia-bento-card aia-skel-pkg-card is-generating"
            role="status"
            aria-live="polite"
            aria-label={generatingSubject ? `Generando material de ${generatingSubject}` : 'Generando material'}
          >
            <div className="aia-skel-pkg-left">
              <span className="aia-skel" style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }} />
              <div className="aia-skel-pkg-lines">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="aia-skel" style={{ width: '165px', height: '14px' }} />
                  <span className="aia-skel aia-skel-pill" style={{ width: '78px', height: '20px' }} />
                  <span className="aia-skel" style={{ width: '185px', height: '11px' }} />
                </div>
                <span className="aia-skel" style={{ width: '50%', height: '12px' }} />
              </div>
            </div>
            <div className="aia-skel-pkg-actions">
              <span className="aia-skel" style={{ width: '96px', height: '32px', borderRadius: '8px' }} />
              <span className="aia-skel" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            </div>
          </div>
        )}

        {isLoading && !hasPackages
          ? [0, 1].map((idx) => (
              <div
                key={`pkg-skel-${idx}`}
                className="aia-bento-card aia-skel-pkg-card"
                role="status"
                aria-label="Cargando materiales generados"
              >
                <div className="aia-skel-pkg-left">
                  <span className="aia-skel" style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }} />
                  <div className="aia-skel-pkg-lines">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="aia-skel" style={{ width: idx === 0 ? '138px' : '182px', height: '14px' }} />
                      <span className="aia-skel aia-skel-pill" style={{ width: '74px', height: '20px' }} />
                      <span className="aia-skel" style={{ width: '185px', height: '11px' }} />
                    </div>
                    <span className="aia-skel" style={{ width: idx === 0 ? '44%' : '52%', height: '12px' }} />
                  </div>
                </div>
                <div className="aia-skel-pkg-actions">
                  <span className="aia-skel" style={{ width: '96px', height: '32px', borderRadius: '8px' }} />
                  {idx === 0 && (
                    <span className="aia-skel" style={{ width: '104px', height: '32px', borderRadius: '8px' }} />
                  )}
                  <span className="aia-skel" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                </div>
              </div>
            ))
          : (packages || []).map((pkg) => {
          const isExpanded = expandedPkgId === pkg.id;
          const pkgDiag = pkg.teacherDiagnosis || {};
          const isPublished = pkg.status === 'published';

          return (
            <div
              key={pkg.id}
              ref={(el) => {
                if (el) cardRefs.current[pkg.id] = el;
                else delete cardRefs.current[pkg.id];
              }}
              className={`aia-bento-card aia-collapsible-pkg-card aia-pkg-row-compact ${
                isExpanded ? 'expanded' : 'collapsed'
              }`}
            >
              {/* Cabecera compacta de 2 líneas por materia */}
              <div className="aia-collapsible-pkg-header">
                <button
                  type="button"
                  className="aia-collapsible-pkg-trigger"
                  onClick={() => onToggleExpand(pkg.id)}
                  aria-expanded={isExpanded}
                  title={
                    isExpanded
                      ? `Contraer diagnóstico de ${pkg.subject}`
                      : `Desplegar diagnóstico de ${pkg.subject}`
                  }
                >
                  <span className="aia-collapsible-pkg-icon">
                    <span className="material-symbols-outlined">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </span>

                  <div className="aia-collapsible-pkg-title-wrap aia-pkg-two-line">
                    <div className="aia-pkg-line-top">
                      <strong className="aia-collapsible-pkg-subject">{pkg.subject}</strong>
                      <span
                        className={`aia-pkg-status-pill ${isPublished ? 'published' : 'draft'}`}
                        title={
                          isPublished
                            ? 'Publicado y activo en el Portal del Estudiante'
                            : 'En Supervisión Docente (Oculto al estudiante)'
                        }
                      >
                        <span className="aia-pkg-status-dot" aria-hidden="true" />
                        <span>{isPublished ? 'Publicado' : 'En revisión'}</span>
                      </span>
                      <span className="aia-pkg-inline-meta">
                        Diapositivas · Video · Juegos didácticos · Examen
                        {pkg.engineMode === 'local' ? ' · Respaldo local' : ''}
                      </span>
                    </div>
                    <span className="aia-collapsible-pkg-topic">{pkg.topic}</span>
                  </div>
                </button>

                <div className="aia-collapsible-pkg-actions">
                  <button
                    type="button"
                    className={
                      isPublished ? 'aia-btn-secondary aia-btn-sm' : 'aia-btn-primary aia-btn-sm'
                    }
                    onClick={() => onSupervise(pkg.id)}
                    title={`Entrar a supervisar los materiales didácticos de ${pkg.subject} como los verá el estudiante`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      visibility
                    </span>
                    <span>Supervisar</span>
                  </button>

                  {isPublished && (
                    <button
                      type="button"
                      className="aia-btn-secondary aia-btn-sm"
                      onClick={() => onTogglePublish(pkg)}
                      title={`Despublicar ${pkg.subject} del portal del estudiante`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        visibility_off
                      </span>
                      <span>Despublicar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="aia-btn-danger-icon"
                    onClick={() => onRequestDelete(pkg)}
                    title={`Eliminar material de ${pkg.subject}`}
                    aria-label={`Eliminar material de ${pkg.subject}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      delete
                    </span>
                  </button>
                </div>
              </div>

              {/* Cuerpo Desplegable del Área */}
              {isExpanded && (
                <div className="aia-collapsible-pkg-body">
                  <div className="aia-teacher-report-stack">
                    <div className="aia-report-block">
                      <span className="aia-report-block-label">
                        1. Carencias Detectadas y Causa Raíz (Evaluación Automática del PIAR)
                      </span>
                      <p className="aia-report-block-text">{pkgDiag.rootCauseAnalysis}</p>
                    </div>

                    <div className="aia-form-row-2">
                      <div className="aia-report-block">
                        <span className="aia-report-block-label">
                          2. Calibración Cognitiva ({profile.edad} años · Grado {profile.grado})
                        </span>
                        <p className="aia-report-block-text">{pkgDiag.cognitiveCalibration}</p>
                      </div>

                      <div className="aia-report-block">
                        <span className="aia-report-block-label">
                          3. Estrategia DUA Aplicada en los Materiales Didácticos
                        </span>
                        <p className="aia-report-block-text">{pkgDiag.pedagogicalStrategy}</p>
                      </div>
                    </div>

                    <div className="aia-report-two-cols">
                      <div className="aia-report-list-box strengths">
                        <strong>✓ Fortalezas del PIAR Apalancadas por la IA</strong>
                        <ul>
                          {(pkgDiag.detectedStrengths || []).map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="aia-report-list-box barriers">
                        <strong>⚡ Carencias y Barreras Atendidas por la IA</strong>
                        <ul>
                          {(pkgDiag.detectedBarriers || []).map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
