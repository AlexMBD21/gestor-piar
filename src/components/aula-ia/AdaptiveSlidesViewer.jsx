import { useState, useEffect, useRef, useCallback } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';
import { exportAdaptivePackageToPptx } from '../../lib/exportPiarPptx';
import { speakTextSequence, stopSpeaking } from '../../lib/speechHelper';

const VISUAL_THEMES = {
  concept: {
    label: 'Idea Principal',
    icon: 'hub',
    accent: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.11)'
  },
  steps: {
    label: 'Paso a Paso',
    icon: 'alt_route',
    accent: '#059669',
    soft: 'rgba(5, 150, 105, 0.11)'
  },
  comparison: {
    label: 'Evitar vs. Aplicar',
    icon: 'compare',
    accent: '#d97706',
    soft: 'rgba(217, 119, 6, 0.11)'
  },
  example: {
    label: 'Ejemplo Guiado',
    icon: 'lightbulb',
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.11)'
  },
  summary: {
    label: 'Resumen Clave',
    icon: 'verified',
    accent: '#0284c7',
    soft: 'rgba(2, 132, 199, 0.11)'
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

function cleanSlideShortTitle(title = '', fallback = '') {
  const stripped = String(title || '')
    .replace(/^\d+\.\s*/, '')
    .trim();
  return stripped || fallback;
}

function loadMasteryMap(storageKey) {
  if (!storageKey) return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function SlideKeyPoints({ visualType, bullets, theme, activeStepIdx, onSelectStep }) {
  if (!Array.isArray(bullets) || bullets.length === 0) return null;

  if (visualType === 'steps') {
    return (
      <div className="aia-calm-steps-list" role="list" aria-label="Pasos ordenados">
        {bullets.map((b, i) => {
          const isCurrent = i === activeStepIdx;
          const isDone = i < activeStepIdx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectStep(i)}
              className={`aia-calm-step-card ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
              style={{ '--slide-accent': theme.accent }}
            >
              <span className="aia-calm-step-num aia-tabular">
                {isDone ? '✓' : i + 1}
              </span>
              <span className="aia-calm-step-body">
                <small>Paso {i + 1}</small>
                <strong>{b}</strong>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (visualType === 'comparison') {
    const avoidText =
      bullets.find((b) => /evita|no\s|error|afán|prisa|confund/i.test(b)) ||
      'Actuar con afán o pasar al siguiente paso sin observar primero la señal o dato principal.';
    const applyList = bullets.filter((b) => b !== avoidText);

    return (
      <div className="aia-calm-compare-grid">
        <div className="aia-calm-compare-card avoid">
          <div className="aia-calm-compare-head avoid">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              block
            </span>
            <span>Qué evitar</span>
          </div>
          <p>{avoidText}</p>
        </div>

        <div className="aia-calm-compare-card apply">
          <div className="aia-calm-compare-head apply">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              check_circle
            </span>
            <span>Cómo hacerlo bien</span>
          </div>
          <ul className="aia-calm-compare-list">
            {(applyList.length > 0 ? applyList : bullets).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <ul className="aia-calm-points-list">
      {bullets.map((b, i) => (
        <li key={i} className="aia-calm-point-item">
          <span
            className="aia-calm-point-num aia-tabular"
            style={{ background: theme.soft, color: theme.accent }}
          >
            {i + 1}
          </span>
          <span className="aia-calm-point-text">{b}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AdaptiveSlidesViewer({
  pkg,
  activity,
  remediationFocus = null,
  onClearRemediation,
  onReturnToQuiz,
  onCompleteSlides
}) {
  const { recordSlideTelemetry, recordAudioTelemetry } = useAulaIa();
  const slides = Array.isArray(pkg?.slides) ? pkg.slides : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [showCheckGuide, setShowCheckGuide] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(null); // null | 5..1
  const [speechError, setSpeechError] = useState(null);
  const [isExportingPptx, setIsExportingPptx] = useState(false);

  const masteryStorageKey = pkg?.id ? `piar_slide_mastery_${pkg.id}` : null;
  const [masteryByStep, setMasteryByStep] = useState(() => loadMasteryMap(masteryStorageKey));

  const countdownTimerRef = useRef(null);
  const pendingAutoSpeakRef = useRef(false);

  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, slides.length - 1));
  const currentSlide = slides[safeIndex] || slides[0];
  const viewedSlides = activity?.slidesViewed || [1];

  const clearAutoNextTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  }, []);

  const stopSpeech = useCallback(() => {
    pendingAutoSpeakRef.current = false;
    clearAutoNextTimer();
    stopSpeaking();
    setIsSpeaking(false);
  }, [clearAutoNextTimer]);

  const startSlideSpeech = useCallback(
    (slideObj, slideIdx) => {
      if (!slideObj) return;
      const slideBullets = deriveBullets(slideObj);
      const parts = [
        cleanSlideShortTitle(slideObj.title),
        slideObj.content,
        slideBullets.length > 0 ? `Puntos clave: ${slideBullets.join('. ')}` : '',
        slideObj.visualAnalogy ? `Imagínalo así: ${slideObj.visualAnalogy}` : '',
        slideObj.keyTakeaway ? `Recuerda esto para tu examen: ${slideObj.keyTakeaway}` : ''
      ].filter(Boolean);

      if (pkg?.id) {
        recordAudioTelemetry(pkg.id, {
          incrementPlay: true,
          progressPercent: Math.max(
            activity?.audioMaxPercent || 0,
            Math.round(((slideIdx + 1) / Math.max(1, slides.length)) * 100)
          ),
          addedSeconds: 3
        });
      }

      speakTextSequence(parts, {
        rate: 0.96,
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          if (pkg?.id) {
            recordAudioTelemetry(pkg.id, {
              incrementPlay: false,
              progressPercent: Math.min(
                100,
                Math.round(((slideIdx + 1) / Math.max(1, slides.length)) * 100)
              ),
              addedSeconds: 12,
              completed: slideIdx === slides.length - 1
            });
          }

          // Si hay siguiente lámina, iniciar cuenta regresiva de 5s para avanzar automáticamente
          if (slideIdx < slides.length - 1) {
            clearAutoNextTimer();
            let remaining = 5;
            setAutoNextCountdown(remaining);
            countdownTimerRef.current = setInterval(() => {
              remaining -= 1;
              if (remaining <= 0) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
                setAutoNextCountdown(null);
                pendingAutoSpeakRef.current = true;
                setShowCheckGuide(false);
                setActiveStepIdx(0);
                setCurrentIndex(slideIdx + 1);
              } else {
                setAutoNextCountdown(remaining);
              }
            }, 1000);
          }
        },
        onError: (msg) => {
          setIsSpeaking(false);
          clearAutoNextTimer();
          setSpeechError(msg || 'No se pudo activar la lectura en voz alta.');
        }
      });
    },
    [pkg?.id, activity?.audioMaxPercent, slides.length, recordAudioTelemetry, clearAutoNextTimer]
  );

  useEffect(() => {
    setMasteryByStep(loadMasteryMap(masteryStorageKey));
  }, [masteryStorageKey]);

  // Salto automático desde un error del examen a la diapositiva exacta
  useEffect(() => {
    if (!remediationFocus || slides.length === 0) return;
    const targetIdx = Math.min(
      Math.max(0, Number(remediationFocus.slideIndex) || 0),
      slides.length - 1
    );
    setCurrentIndex(targetIdx);
    setActiveStepIdx(0);
    setShowCheckGuide(false);
    stopSpeech();
  }, [remediationFocus, slides.length, stopSpeech]);

  // Si avanzó automáticamente al terminar el temporizador de audio, leer la nueva lámina
  useEffect(() => {
    if (!pendingAutoSpeakRef.current || !currentSlide) return;
    pendingAutoSpeakRef.current = false;
    startSlideSpeech(currentSlide, safeIndex);
  }, [safeIndex, currentSlide, startSlideSpeech]);

  useEffect(() => {
    if (!pkg?.id || !currentSlide?.step) return;
    recordSlideTelemetry(pkg.id, currentSlide.step, Math.max(1, slides.length));
  }, [pkg?.id, currentSlide?.step, slides.length, recordSlideTelemetry]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      stopSpeaking();
    };
  }, []);

  if (slides.length === 0) return null;

  const progressPct = Math.round((viewedSlides.length / slides.length) * 100);
  const visualType = resolveVisualType(currentSlide, safeIndex);
  const theme = VISUAL_THEMES[visualType] || VISUAL_THEMES.concept;
  const bullets = deriveBullets(currentSlide);
  const slideKey = String(currentSlide.step || safeIndex + 1);
  const currentMastery = masteryByStep[slideKey] || null; // 'understood' | 'review' | null

  const reviewCount = slides.filter((s, idx) => {
    const key = String(s.step || idx + 1);
    return masteryByStep[key] === 'review';
  }).length;

  const selectSlide = (idx) => {
    if (idx < 0 || idx >= slides.length) return;
    stopSpeech();
    setShowCheckGuide(false);
    setActiveStepIdx(0);
    setCurrentIndex(idx);
  };

  const goPrev = () => selectSlide(safeIndex - 1);

  const goNext = () => {
    stopSpeech();
    if (safeIndex < slides.length - 1) {
      selectSlide(safeIndex + 1);
    } else if (onCompleteSlides) {
      onCompleteSlides();
    }
  };

  const handleSetMastery = (status) => {
    const nextMap = { ...masteryByStep, [slideKey]: status };
    setMasteryByStep(nextMap);
    if (masteryStorageKey) {
      try {
        window.localStorage.setItem(masteryStorageKey, JSON.stringify(nextMap));
      } catch {
        // Ignorar cuota de almacenamiento
      }
    }
  };

  const handleToggleSpeech = () => {
    setSpeechError(null);
    if (isSpeaking || autoNextCountdown !== null) {
      stopSpeech();
      return;
    }
    startSlideSpeech(currentSlide, safeIndex);
  };

  const handleAdvanceNowWithSpeech = () => {
    clearAutoNextTimer();
    if (safeIndex < slides.length - 1) {
      const nextIdx = safeIndex + 1;
      setShowCheckGuide(false);
      setActiveStepIdx(0);
      setCurrentIndex(nextIdx);
      startSlideSpeech(slides[nextIdx], nextIdx);
    }
  };

  const handleDownloadPptx = async () => {
    if (isExportingPptx) return;
    setIsExportingPptx(true);
    try {
      await exportAdaptivePackageToPptx(pkg);
    } catch {
      // Silencioso si el navegador bloquea la descarga
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleJumpToNextReview = () => {
    const idx = slides.findIndex((s, i) => {
      const key = String(s.step || i + 1);
      return masteryByStep[key] === 'review' && i !== safeIndex;
    });
    if (idx >= 0) {
      selectSlide(idx);
      return;
    }
    const firstIdx = slides.findIndex((s, i) => masteryByStep[String(s.step || i + 1)] === 'review');
    if (firstIdx >= 0) selectSlide(firstIdx);
  };

  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (safeIndex < slides.length - 1) selectSlide(safeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (safeIndex > 0) selectSlide(safeIndex - 1);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="aia-media-surface aia-ppt-shell"
    >
      {/* Banner de Foco de Refuerzo cuando llega desde un error en el examen */}
      {remediationFocus && (
        <div className="aia-remediation-focus-bar" role="status">
          <div className="aia-remediation-focus-info">
            <span className="material-symbols-outlined aia-remediation-focus-icon">
              target
            </span>
            <div>
              <div className="aia-remediation-focus-title">
                Repasando tu punto a fortalecer:{' '}
                <strong>{remediationFocus.skillTag || 'Concepto del examen'}</strong>
              </div>
              {remediationFocus.hint && (
                <p className="aia-remediation-focus-hint">{remediationFocus.hint}</p>
              )}
            </div>
          </div>

          <div className="aia-remediation-focus-actions">
            {onReturnToQuiz && (
              <button
                type="button"
                className="aia-btn-primary aia-btn-sm"
                onClick={onReturnToQuiz}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  quiz
                </span>
                <span>Volver al examen</span>
              </button>
            )}
            {onClearRemediation && (
              <button
                type="button"
                className="aia-btn-secondary aia-btn-sm"
                onClick={onClearRemediation}
                title="Cerrar aviso de repaso"
                aria-label="Cerrar aviso de repaso"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  close
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra superior limpia: Voz + Descarga PowerPoint real (.pptx) + Pantalla completa */}
      <div className="aia-ppt-toolbar">
        <div className="aia-media-title-group">
          <span className="aia-step-pill aia-tabular">
            Lámina {safeIndex + 1} de {slides.length}
          </span>
          <span className="aia-telemetry-chip aia-tabular">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              check_circle
            </span>
            <span>{progressPct}% explorado</span>
          </span>
          {reviewCount > 0 && (
            <button
              type="button"
              className="aia-review-counter-pill aia-tabular"
              onClick={handleJumpToNextReview}
              title="Ir a una lámina marcada para repasar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                bookmark
              </span>
              <span>{reviewCount} por repasar</span>
            </button>
          )}
        </div>

        <div className="aia-ppt-toolbar-actions">
          <button
            type="button"
            className={`aia-tts-btn ${isSpeaking || autoNextCountdown !== null ? 'speaking' : ''}`}
            onClick={handleToggleSpeech}
            title={
              isSpeaking || autoNextCountdown !== null
                ? 'Detener lectura en voz alta'
                : 'Escuchar esta lámina en voz alta'
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              {isSpeaking || autoNextCountdown !== null ? 'stop_circle' : 'volume_up'}
            </span>
            <span>
              {isSpeaking
                ? 'Detener voz'
                : autoNextCountdown !== null
                  ? `Siguiente en ${autoNextCountdown}s`
                  : 'Escuchar lámina'}
            </span>
          </button>

          <button
            type="button"
            className="aia-btn-secondary aia-btn-sm"
            onClick={handleDownloadPptx}
            disabled={isExportingPptx}
            title="Descargar esta presentación como archivo PowerPoint (.pptx) para repasar sin internet"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {isExportingPptx ? 'hourglass_top' : 'download'}
            </span>
            <span>{isExportingPptx ? 'Generando .pptx...' : 'Descargar PowerPoint'}</span>
          </button>
        </div>
      </div>

      {/* Temporizador suave de paso automático al finalizar la lectura en voz alta */}
      {autoNextCountdown !== null && safeIndex < slides.length - 1 && (
        <div className="aia-auto-next-banner" role="status" aria-live="polite">
          <div className="aia-auto-next-info">
            <span className="aia-auto-next-badge aia-tabular">{autoNextCountdown}s</span>
            <span>
              Dictado completado · Pasando a la{' '}
              <strong>Lámina {safeIndex + 2}</strong> en{' '}
              <strong className="aia-tabular">{autoNextCountdown}</strong>{' '}
              {autoNextCountdown === 1 ? 'segundo' : 'segundos'}...
            </span>
          </div>

          <div className="aia-auto-next-actions">
            <button
              type="button"
              className="aia-btn-secondary aia-btn-sm"
              onClick={clearAutoNextTimer}
            >
              Quedarme aquí
            </button>
            <button
              type="button"
              className="aia-btn-primary aia-btn-sm"
              onClick={handleAdvanceNowWithSpeech}
            >
              <span>Pasar ahora</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Aviso si el navegador/sistema bloquea la síntesis de voz */}
      {speechError && (
        <div className="aia-access-feedback warning" role="alert">
          {speechError}
        </div>
      )}

      {/* Lienzo Educativo Limpio */}
      <div className="aia-ppt-workspace aia-stage-scroll-body">
        {/* Índice lateral limpio de capítulos */}
        <aside className="aia-ppt-sidebar" aria-label="Índice de láminas">
          {slides.map((s, idx) => {
            const vType = resolveVisualType(s, idx);
            const vTheme = VISUAL_THEMES[vType] || VISUAL_THEMES.concept;
            const sKey = String(s.step || idx + 1);
            const mastery = masteryByStep[sKey];
            const isViewed = viewedSlides.includes(s.step);
            const isCurrent = idx === safeIndex;
            const shortTitle = cleanSlideShortTitle(s.title, s.badge || `Lámina ${idx + 1}`);

            return (
              <button
                key={s.step || idx}
                type="button"
                onClick={() => selectSlide(idx)}
                aria-current={isCurrent ? 'true' : undefined}
                className={`aia-ppt-chapter ${isCurrent ? 'current' : ''} ${
                  mastery === 'review' ? 'needs-review' : ''
                } ${mastery === 'understood' ? 'understood' : ''}`}
                style={{ '--chapter-accent': vTheme.accent }}
              >
                <span className="aia-ppt-chapter-num aia-tabular">
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <span className="aia-ppt-chapter-info">
                  <span className="aia-ppt-chapter-badge">{s.badge || vTheme.label}</span>
                  <strong className="aia-ppt-chapter-title">{shortTitle}</strong>
                </span>

                <span className="aia-ppt-chapter-status" aria-hidden="true">
                  {mastery === 'review' ? (
                    <span className="material-symbols-outlined review-mark" title="Marcada para repasar">
                      bookmark
                    </span>
                  ) : mastery === 'understood' || isViewed ? (
                    <span className="material-symbols-outlined ok-mark" title="Vista / Entendida">
                      check_circle
                    </span>
                  ) : (
                    <span className="aia-ppt-chapter-dot" />
                  )}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Lienzo principal calmado: 2 zonas sin texto repetido ni truncado */}
        <div className="aia-ppt-stage">
          <article className="aia-ppt-canvas" key={currentSlide.step}>
            <div className="aia-ppt-canvas-accent" style={{ background: theme.accent }} />

            <div className="aia-ppt-canvas-top">
              <span
                className="aia-ppt-slide-badge"
                style={{ background: theme.soft, color: theme.accent }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  {theme.icon}
                </span>
                <span>{currentSlide.badge || theme.label}</span>
              </span>

              <span className="aia-ppt-deck-brand aia-tabular">
                {pkg?.subject} · Lámina {safeIndex + 1} de {slides.length}
              </span>
            </div>

            <div className="aia-ppt-canvas-body">
              {/* Zona 1: Comprensión Principal */}
              <div className="aia-ppt-text-col">
                <h3 className="aia-ppt-slide-title">
                  {cleanSlideShortTitle(currentSlide.title, currentSlide.badge)}
                </h3>

                {currentSlide.content && (
                  <p className="aia-ppt-slide-lead">{currentSlide.content}</p>
                )}

                <SlideKeyPoints
                  visualType={visualType}
                  bullets={bullets}
                  theme={theme}
                  activeStepIdx={activeStepIdx}
                  onSelectStep={setActiveStepIdx}
                />
              </div>

              {/* Zona 2: Tarjetas Ancla (Analogía + Llave para tu examen, sin duplicar bullets) */}
              <div className="aia-ppt-anchor-col">
                {currentSlide.visualAnalogy && (
                  <div className="aia-calm-analogy-card">
                    <div className="aia-calm-card-head">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        lightbulb
                      </span>
                      <span>Imagínalo así</span>
                    </div>
                    <p className="aia-calm-analogy-text">{currentSlide.visualAnalogy}</p>
                  </div>
                )}

                {currentSlide.keyTakeaway && (
                  <div
                    className="aia-calm-takeaway-card"
                    style={{ '--slide-accent': theme.accent, '--slide-soft': theme.soft }}
                  >
                    <div className="aia-calm-card-head takeaway">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        verified
                      </span>
                      <span>Recuerda esto para tu examen</span>
                    </div>
                    <strong className="aia-calm-takeaway-text">{currentSlide.keyTakeaway}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Pie interactivo de Autoverificación real */}
            {currentSlide.checkQuestion && (
              <div className="aia-calm-check-box">
                <div className="aia-calm-check-row">
                  <div className="aia-calm-check-q-wrap">
                    <span className="aia-calm-check-kicker">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        psychology_alt
                      </span>
                      <span>Comprueba si quedó claro</span>
                    </span>
                    <p className="aia-calm-check-question">{currentSlide.checkQuestion}</p>
                  </div>

                  {!showCheckGuide && (
                    <button
                      type="button"
                      className="aia-calm-check-reveal-btn"
                      onClick={() => setShowCheckGuide(true)}
                    >
                      <span>Ver idea guía</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        visibility
                      </span>
                    </button>
                  )}
                </div>

                {showCheckGuide && (
                  <div className="aia-calm-check-answer">
                    <p className="aia-calm-check-guide-text">
                      <strong>Idea guía:</strong>{' '}
                      {currentSlide.keyTakeaway || bullets[0] || currentSlide.content}
                    </p>

                    <div className="aia-calm-mastery-actions">
                      <span className="aia-calm-mastery-prompt">¿Cómo te sientes con esta lámina?</span>
                      <div className="aia-calm-mastery-btns">
                        <button
                          type="button"
                          className={`aia-mastery-btn ok ${
                            currentMastery === 'understood' ? 'selected' : ''
                          }`}
                          onClick={() => handleSetMastery('understood')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            check_circle
                          </span>
                          <span>Ya lo entendí</span>
                        </button>

                        <button
                          type="button"
                          className={`aia-mastery-btn review ${
                            currentMastery === 'review' ? 'selected' : ''
                          }`}
                          onClick={() => handleSetMastery('review')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            bookmark_add
                          </span>
                          <span>Marcar para repasar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        </div>
      </div>

      {/* Navegación inferior calmada */}
      <div className="aia-slide-footer">
        <button
          type="button"
          className="aia-btn-secondary"
          onClick={goPrev}
          disabled={safeIndex === 0}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_back
          </span>
          <span>Anterior</span>
        </button>

        <div className="aia-slide-dots-nav" aria-label="Progreso de láminas">
          {slides.map((s, idx) => {
            const sKey = String(s.step || idx + 1);
            const mastery = masteryByStep[sKey];
            return (
              <button
                key={s.step || idx}
                type="button"
                onClick={() => selectSlide(idx)}
                className={`aia-slide-dot ${idx === safeIndex ? 'active' : ''} ${
                  mastery === 'review' ? 'review' : mastery === 'understood' ? 'done' : ''
                }`}
                aria-label={`Ir a lámina ${idx + 1}`}
                title={`Lámina ${idx + 1}: ${cleanSlideShortTitle(s.title, s.badge)}`}
              />
            );
          })}
        </div>

        <button type="button" className="aia-btn-primary" onClick={goNext}>
          <span>
            {safeIndex < slides.length - 1 ? 'Siguiente lámina' : 'Ir a Video YouTube'}
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {safeIndex < slides.length - 1 ? 'arrow_forward' : 'smart_display'}
          </span>
        </button>
      </div>
    </div>
  );
}
