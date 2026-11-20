import { useState, useEffect, useRef } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';

const VISUAL_THEMES = {
  concept: {
    label: 'Mapa Conceptual',
    icon: 'hub',
    accent: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)'
  },
  steps: {
    label: 'Ruta Paso a Paso',
    icon: 'alt_route',
    accent: '#059669',
    soft: 'rgba(5, 150, 105, 0.12)'
  },
  comparison: {
    label: 'Contraste Visual',
    icon: 'compare',
    accent: '#d97706',
    soft: 'rgba(217, 119, 6, 0.12)'
  },
  example: {
    label: 'Ejemplo Guiado',
    icon: 'lightbulb',
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.12)'
  },
  summary: {
    label: 'Resumen Ejecutivo',
    icon: 'verified',
    accent: '#0284c7',
    soft: 'rgba(2, 132, 199, 0.12)'
  }
};

const VISUAL_TYPES_ORDER = ['concept', 'steps', 'comparison', 'example', 'summary'];

function resolveVisualType(slide, idx) {
  const candidate = typeof slide?.visualType === 'string' ? slide.visualType.toLowerCase().trim() : '';
  if (VISUAL_THEMES[candidate]) return candidate;
  return VISUAL_TYPES_ORDER[idx % VISUAL_TYPES_ORDER.length];
}

function deriveBullets(slide) {
  if (Array.isArray(slide?.bullets) && slide.bullets.length > 0) {
    return slide.bullets.filter(Boolean).slice(0, 4);
  }
  const sentences = String(slide?.content || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 2);
  if (slide?.keyTakeaway) sentences.push(slide.keyTakeaway);
  return sentences.slice(0, 3);
}

/**
 * Convierte enlaces compartidos de Google Slides / PowerPoint Online / Canva en URL embebible.
 */
function normalizePresentationEmbedUrl(rawUrl = '') {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    if (parsed.hostname.includes('docs.google.com') && parsed.pathname.includes('/presentation/d/')) {
      const idMatch = parsed.pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
      if (idMatch?.[1]) {
        return `https://docs.google.com/presentation/d/${idMatch[1]}/embed?start=false&loop=false&delayms=5000`;
      }
      if (parsed.pathname.includes('/presentation/d/e/')) {
        return withProto.replace(/\/pub\b/, '/embed');
      }
    }

    if (parsed.hostname.includes('canva.com') && !parsed.searchParams.has('embed')) {
      parsed.searchParams.set('embed', '');
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function SlideVisualDiagram({ visualType, slide, bullets }) {
  const theme = VISUAL_THEMES[visualType] || VISUAL_THEMES.concept;
  const shortPills = bullets.slice(0, 3).map((b) => (b.length > 34 ? `${b.slice(0, 32)}…` : b));

  if (visualType === 'steps') {
    const stepColors = ['#16a34a', '#d97706', '#2563eb'];
    const labels = ['PASO 1 · OBSERVAR', 'PASO 2 · EJECUTAR', 'PASO 3 · VALIDAR'];
    return (
      <div className="aia-ppt-diagram" style={{ '--slide-accent': theme.accent }}>
        <div className="aia-ppt-diagram-head">
          <span className="material-symbols-outlined">{theme.icon}</span>
          <span>{theme.label}</span>
        </div>
        <div className="aia-ppt-steps-visual">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aia-ppt-step-node" style={{ borderLeftColor: stepColors[i] }}>
              <span className="aia-ppt-step-num" style={{ background: stepColors[i] }}>
                {i + 1}
              </span>
              <div>
                <small style={{ color: stepColors[i] }}>{labels[i]}</small>
                <strong>{shortPills[i] || slide?.keyTakeaway || 'Avanza en orden'}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visualType === 'comparison') {
    return (
      <div className="aia-ppt-diagram" style={{ '--slide-accent': theme.accent }}>
        <div className="aia-ppt-diagram-head">
          <span className="material-symbols-outlined">{theme.icon}</span>
          <span>{theme.label}</span>
        </div>
        <div className="aia-ppt-compare-grid">
          <div className="aia-ppt-compare-card avoid">
            <div className="aia-ppt-compare-badge avoid">✕ Evitar</div>
            <p>Actuar por afán o mezclar datos sin observar primero.</p>
          </div>
          <div className="aia-ppt-compare-card apply">
            <div className="aia-ppt-compare-badge apply">✓ Aplicar</div>
            <p>{shortPills[0] || slide?.keyTakeaway}</p>
          </div>
        </div>
      </div>
    );
  }

  if (visualType === 'example') {
    return (
      <div className="aia-ppt-diagram" style={{ '--slide-accent': theme.accent }}>
        <div className="aia-ppt-diagram-head">
          <span className="material-symbols-outlined">{theme.icon}</span>
          <span>{theme.label}</span>
        </div>
        <div className="aia-ppt-flow-svg">
          <svg viewBox="0 0 280 130" className="aia-ppt-svg" aria-hidden="true">
            <defs>
              <marker id="aiaArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#7c3aed" />
              </marker>
            </defs>
            <rect x="8" y="28" width="72" height="54" rx="10" fill="rgba(124,58,237,0.14)" stroke="#7c3aed" strokeWidth="1.8" />
            <text x="44" y="51" textAnchor="middle" fill="#7c3aed" fontSize="10" fontWeight="800">INICIO</text>
            <text x="44" y="66" textAnchor="middle" fill="currentColor" fontSize="9">Observar</text>
            <line x1="82" y1="55" x2="100" y2="55" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#aiaArrow)" />

            <rect x="104" y="28" width="72" height="54" rx="10" fill="rgba(124,58,237,0.2)" stroke="#7c3aed" strokeWidth="1.8" />
            <text x="140" y="51" textAnchor="middle" fill="#7c3aed" fontSize="10" fontWeight="800">PROCESO</text>
            <text x="140" y="66" textAnchor="middle" fill="currentColor" fontSize="9">Aplicar guía</text>
            <line x1="178" y1="55" x2="196" y2="55" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#aiaArrow)" />

            <rect x="200" y="28" width="72" height="54" rx="10" fill="rgba(22,163,74,0.16)" stroke="#16a34a" strokeWidth="1.8" />
            <text x="236" y="51" textAnchor="middle" fill="#16a34a" fontSize="10" fontWeight="800">LOGRO</text>
            <text x="236" y="66" textAnchor="middle" fill="currentColor" fontSize="9">Verificar ✓</text>
          </svg>
          <p className="aia-ppt-diagram-caption">{shortPills[1] || slide?.keyTakeaway}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aia-ppt-diagram" style={{ '--slide-accent': theme.accent }}>
      <div className="aia-ppt-diagram-head">
        <span className="material-symbols-outlined">{theme.icon}</span>
        <span>{theme.label}</span>
      </div>
      <div className="aia-ppt-concept-hub">
        <div className="aia-ppt-hub-core" style={{ background: theme.soft, borderColor: theme.accent, color: theme.accent }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{theme.icon}</span>
          <strong>{slide?.badge || 'Idea Central'}</strong>
        </div>
        <div className="aia-ppt-hub-branches">
          {(shortPills.length > 0 ? shortPills : [slide?.keyTakeaway || 'Idea clave']).map((pill, i) => (
            <div key={i} className="aia-ppt-hub-branch">
              <span className="aia-ppt-hub-dot" style={{ background: theme.accent }} />
              <span>{pill}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdaptiveSlidesViewer({
  pkg,
  activity,
  isMirrorPreview = false,
  onCompleteSlides
}) {
  const { recordSlideTelemetry } = useAulaIa();
  const slides = Array.isArray(pkg?.slides) ? pkg.slides : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCheckAnswer, setShowCheckAnswer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deckMode, setDeckMode] = useState('native'); // 'native' | 'external'
  const [showEmbedForm, setShowEmbedForm] = useState(false);

  const storageKey = pkg?.id ? `piar_slide_embed_${pkg.id}` : null;
  const [externalUrl, setExternalUrl] = useState(() => {
    if (pkg?.presentationUrl) return pkg.presentationUrl;
    if (!storageKey) return '';
    try {
      return window.localStorage.getItem(storageKey) || '';
    } catch {
      return '';
    }
  });
  const [embedInput, setEmbedInput] = useState(externalUrl);
  const [embedFeedback, setEmbedFeedback] = useState(null);

  const deckContainerRef = useRef(null);

  const currentSlide = slides[currentIndex] || slides[0];
  const viewedSlides = activity?.slidesViewed || [1];

  useEffect(() => {
    if (!pkg?.id || !currentSlide?.step) return;
    recordSlideTelemetry(pkg.id, currentSlide.step, Math.max(1, slides.length));
  }, [pkg?.id, currentSlide?.step, slides.length, recordSlideTelemetry]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (slides.length === 0) return null;

  const progressPct = Math.round((viewedSlides.length / slides.length) * 100);
  const visualType = resolveVisualType(currentSlide, currentIndex);
  const theme = VISUAL_THEMES[visualType] || VISUAL_THEMES.concept;
  const bullets = deriveBullets(currentSlide);
  const normalizedEmbed = normalizePresentationEmbedUrl(externalUrl);

  const selectSlide = (idx) => {
    if (idx < 0 || idx >= slides.length) return;
    setShowCheckAnswer(false);
    setCurrentIndex(idx);
  };

  const goPrev = () => selectSlide(currentIndex - 1);

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      selectSlide(currentIndex + 1);
    } else if (onCompleteSlides) {
      onCompleteSlides();
    }
  };

  const handleToggleFullscreen = async () => {
    const el = deckContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }
    } catch {
      // Fallback CSS fullscreen si el entorno restringe requestFullscreen
    }
    setIsFullscreen((prev) => !prev);
  };

  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentIndex < slides.length - 1) selectSlide(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentIndex > 0) selectSlide(currentIndex - 1);
    }
  };

  const handleSaveEmbed = (e) => {
    e.preventDefault();
    const valid = normalizePresentationEmbedUrl(embedInput);
    if (!valid) {
      setEmbedFeedback({
        type: 'error',
        text: 'Pega un enlace válido de Google Slides, PowerPoint Online o Canva.'
      });
      return;
    }
    setExternalUrl(valid);
    setEmbedInput(valid);
    setDeckMode('external');
    setShowEmbedForm(false);
    setEmbedFeedback(null);
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, valid);
      } catch {
        // Ignorar cuota de almacenamiento
      }
    }
  };

  const handleClearEmbed = () => {
    setExternalUrl('');
    setEmbedInput('');
    setDeckMode('native');
    setShowEmbedForm(false);
    if (storageKey) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignorar
      }
    }
  };

  return (
    <div
      ref={deckContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`aia-media-surface aia-ppt-shell ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* Barra superior estilo PowerPoint / Google Slides */}
      <div className="aia-ppt-toolbar">
        <div className="aia-media-title-group">
          <span className="aia-step-pill aia-tabular">
            Diapositiva {currentIndex + 1} de {slides.length}
          </span>
          <span className="aia-badge-soft">{pkg?.subject} · Presentación Visual</span>
          <span className="aia-telemetry-chip aia-tabular">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              visibility
            </span>
            <span>{progressPct}% completado</span>
          </span>
        </div>

        <div className="aia-ppt-toolbar-actions">
          {normalizedEmbed && (
            <div className="aia-video-mode-tabs" role="tablist" aria-label="Fuente de diapositivas">
              <button
                type="button"
                onClick={() => setDeckMode('native')}
                className={`aia-video-mode-btn ${deckMode === 'native' ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  slideshow
                </span>
                <span>Láminas IA</span>
              </button>
              <button
                type="button"
                onClick={() => setDeckMode('external')}
                className={`aia-video-mode-btn ${deckMode === 'external' ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  co_present
                </span>
                <span>Google Slides / PPT</span>
              </button>
            </div>
          )}

          {isMirrorPreview && (
            <button
              type="button"
              className="aia-btn-secondary aia-btn-sm"
              onClick={() => setShowEmbedForm((v) => !v)}
              title="Vincular una presentación externa de Google Slides o PowerPoint"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                add_link
              </span>
              <span>{normalizedEmbed ? 'Editar Slides Externo' : 'Vincular Google Slides / PPT'}</span>
            </button>
          )}

          <button
            type="button"
            className="aia-btn-secondary aia-btn-sm"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en modo presentación'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {isFullscreen ? 'fullscreen_exit' : 'present_to_all'}
            </span>
            <span>{isFullscreen ? 'Salir' : 'Presentar'}</span>
          </button>
        </div>
      </div>

      {/* Formulario opcional docente para incrustar Google Slides / PowerPoint */}
      {isMirrorPreview && showEmbedForm && (
        <form onSubmit={handleSaveEmbed} className="aia-yt-teacher-bar">
          <div className="aia-yt-teacher-bar-head">
            <span className="aia-yt-teacher-tag">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                co_present
              </span>
              <span>Vincular Presentación de Google Slides, PowerPoint Online o Canva</span>
            </span>
          </div>
          <div className="aia-yt-input-row">
            <input
              type="url"
              className="aia-input-compact"
              placeholder="Pega el enlace compartido de Google Slides (docs.google.com/presentation/...)"
              value={embedInput}
              onChange={(e) => {
                setEmbedInput(e.target.value);
                setEmbedFeedback(null);
              }}
            />
            <button type="submit" className="aia-btn-primary aia-btn-sm">
              Incrustar presentación
            </button>
            {normalizedEmbed && (
              <button
                type="button"
                className="aia-btn-secondary aia-btn-sm"
                onClick={handleClearEmbed}
              >
                Quitar enlace
              </button>
            )}
          </div>
          {embedFeedback && (
            <p className={`aia-yt-feedback ${embedFeedback.type}`}>{embedFeedback.text}</p>
          )}
        </form>
      )}

      {/* Modo Presentación Externa incrustada o Estudio Interactivo PowerPoint */}
      {deckMode === 'external' && normalizedEmbed ? (
        <div className="aia-ppt-external-shell">
          <iframe
            className="aia-yt-iframe"
            src={normalizedEmbed}
            title={`Presentación ${pkg?.topic || pkg?.subject}`}
            allowFullScreen
          />
        </div>
      ) : (
        <div className="aia-ppt-workspace">
          {/* Tira lateral izquierda de miniaturas estilo PowerPoint */}
          <aside className="aia-ppt-sidebar" aria-label="Diapositivas de la presentación">
            {slides.map((s, idx) => {
              const vType = resolveVisualType(s, idx);
              const vTheme = VISUAL_THEMES[vType] || VISUAL_THEMES.concept;
              const isViewed = viewedSlides.includes(s.step);
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={s.step || idx}
                  type="button"
                  onClick={() => selectSlide(idx)}
                  className={`aia-ppt-thumb ${isCurrent ? 'current' : ''} ${isViewed ? 'viewed' : ''}`}
                >
                  <div className="aia-ppt-thumb-num aia-tabular">
                    <span>{String(idx + 1).padStart(2, '0')}</span>
                    {isViewed && <span className="aia-ppt-thumb-check">✓</span>}
                  </div>
                  <div className="aia-ppt-thumb-preview">
                    <span
                      className="aia-ppt-thumb-ribbon"
                      style={{ background: vTheme.accent }}
                    />
                    <span className="aia-ppt-thumb-title">{s.badge || `Lámina ${idx + 1}`}</span>
                    <div className="aia-ppt-thumb-lines" aria-hidden="true">
                      <i />
                      <i />
                      <i className="short" />
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Lienzo principal 16:9 */}
          <div className="aia-ppt-stage">
            <article className="aia-ppt-canvas" key={currentSlide.step}>
              <div
                className="aia-ppt-canvas-accent"
                style={{ background: theme.accent }}
              />

              <div className="aia-ppt-canvas-top">
                <span
                  className="aia-ppt-slide-badge"
                  style={{ background: theme.soft, color: theme.accent }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    {theme.icon}
                  </span>
                  <span>{currentSlide.badge}</span>
                </span>
                <span className="aia-ppt-deck-brand aia-tabular">
                  {pkg?.subject} · Lámina {currentIndex + 1}/{slides.length}
                </span>
              </div>

              <div className="aia-ppt-canvas-body">
                <div className="aia-ppt-text-col">
                  <h3 className="aia-ppt-slide-title">{currentSlide.title}</h3>
                  <p className="aia-ppt-slide-lead">{currentSlide.content}</p>

                  {bullets.length > 0 && (
                    <ul className="aia-ppt-bullets">
                      {bullets.map((b, i) => (
                        <li key={i}>
                          <span
                            className="aia-ppt-bullet-dot"
                            style={{ background: theme.accent }}
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="aia-ppt-visual-col">
                  <SlideVisualDiagram
                    visualType={visualType}
                    slide={currentSlide}
                    bullets={bullets}
                  />
                </div>
              </div>

              {/* Zona inferior de la diapositiva: Analogía, Llave y Autoverificación */}
              <div className="aia-ppt-canvas-footer">
                <div className="aia-analogy-box">
                  <span className="aia-analogy-icon" aria-hidden="true">
                    <span className="material-symbols-outlined">lightbulb</span>
                  </span>
                  <div>
                    <div className="aia-analogy-label">Analogía Visual</div>
                    <p className="aia-analogy-text">{currentSlide.visualAnalogy}</p>
                  </div>
                </div>

                <div className="aia-slide-bottom-grid">
                  <div className="aia-takeaway-card">
                    <div className="aia-takeaway-header">
                      <span
                        className="material-symbols-outlined aia-takeaway-icon"
                        style={{ fontSize: '16px' }}
                      >
                        verified
                      </span>
                      <span className="aia-takeaway-caption">Llave para tu examen</span>
                    </div>
                    <strong className="aia-takeaway-value">{currentSlide.keyTakeaway}</strong>
                  </div>

                  <div className="aia-microcheck-card">
                    <div className="aia-microcheck-header">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        psychology_alt
                      </span>
                      <span>Autoverificación rápida</span>
                    </div>
                    <p className="aia-microcheck-q">{currentSlide.checkQuestion}</p>
                    <button
                      type="button"
                      className={`aia-microcheck-btn ${showCheckAnswer ? 'verified' : ''}`}
                      onClick={() => setShowCheckAnswer((v) => !v)}
                    >
                      {showCheckAnswer
                        ? '✓ ¡Excelente! Concepto verificado'
                        : 'Ya pensé mi respuesta · Verificar'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* Controles de navegación tipo Presentador */}
      <div className="aia-slide-footer">
        <button
          type="button"
          className="aia-btn-secondary"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_back
          </span>
          <span>Anterior</span>
        </button>

        <span className="aia-slide-counter aia-tabular">
          Lectura activa: {activity?.slidesTimeSec || 12}s · Usa flechas ← / →
        </span>

        <button type="button" className="aia-btn-primary" onClick={goNext}>
          <span>
            {currentIndex < slides.length - 1 ? 'Siguiente Diapositiva' : 'Ir a Cápsula de Audio'}
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {currentIndex < slides.length - 1 ? 'arrow_forward' : 'headphones'}
          </span>
        </button>
      </div>
    </div>
  );
}
