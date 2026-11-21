import { useEffect, useMemo, useRef, useState } from 'react';
import { getPackageGames } from '../../lib/aulaGames';
import { hydrateCoherentPackage } from '../../lib/piarAiEngine';
import AdaptiveSlidesViewer from './AdaptiveSlidesViewer';
import AdaptiveVideoGuide from './AdaptiveVideoGuide';
import AdaptiveGamesArena from './AdaptiveGamesArena';
import AdaptiveQuizMultiAttempt from './AdaptiveQuizMultiAttempt';

const VALID_STUDENT_MODULES = new Set(['slides', 'video', 'games', 'quiz']);

function loadSavedStudentModule() {
  try {
    const saved = window.sessionStorage.getItem('piar_student_active_module');
    if (saved && VALID_STUDENT_MODULES.has(saved)) return saved;
  } catch {
    // Ignorar restricciones de almacenamiento
  }
  return 'slides';
}

export default function StudentAdaptivePortal({
  pkg: rawPkg,
  activity,
  isMirrorPreview = false,
  hideStandaloneBar = false,
  externalFullscreen = false,
  onToggleExternalFullscreen,
  studentProfile,
  onBackToSubjects,
  onSignOutStudent
}) {
  const pkg = useMemo(() => hydrateCoherentPackage(rawPkg), [rawPkg]);
  const [activeModule, setActiveModule] = useState(loadSavedStudentModule); // 'slides' | 'video' | 'games' | 'quiz'
  const [remediationFocus, setRemediationFocus] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const portalContainerRef = useRef(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    const el = portalContainerRef.current;
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

  useEffect(() => {
    try {
      window.sessionStorage.setItem('piar_student_active_module', activeModule);
    } catch {
      // Ignorar restricciones de almacenamiento
    }
  }, [activeModule]);

  if (!pkg) {
    return (
      <div className="aia-bento-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)' }}>
          auto_awesome
        </span>
        <h3 style={{ marginTop: '12px' }}>Preparando tu Aula Adaptativa...</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '8px auto 0' }}>
          Tu profesor aún no ha publicado una misión de refuerzo activa para este periodo.
        </p>
      </div>
    );
  }

  const studentDiag = pkg.studentDiagnosis || {};
  const totalSlides = pkg.slides?.length || 5;
  const slidesPct = Math.min(
    100,
    Math.round(((activity?.slidesViewed?.length || 1) / totalSlides) * 100)
  );
  const videoPct = activity?.videoMaxPercent || 0;
  const gamesList = getPackageGames(pkg);
  const totalGames = gamesList.length || 4;
  const gamesCompletedCount = (activity?.gamesCompleted || []).filter((id) =>
    gamesList.some((g) => g.id === id)
  ).length;
  const gamesPct = activity?.gamesMaxPercent || 0;
  const attempts = activity?.attempts || [];
  const quizCompleted = attempts.length > 0;

  const handleNavigateFromQuiz = (targetModule, context = null) => {
    const safeTarget = targetModule === 'audio' ? 'slides' : targetModule;
    if (safeTarget === 'slides' && context) {
      setRemediationFocus(context);
    } else {
      setRemediationFocus(null);
    }
    setActiveModule(safeTarget);
  };

  const modules = [
    {
      id: 'slides',
      step: '01',
      icon: 'slideshow',
      label: 'Diapositivas',
      metric: `${slidesPct}%`,
      progress: slidesPct,
      done: slidesPct >= 100
    },
    {
      id: 'video',
      step: '02',
      icon: 'smart_display',
      label: 'Video YouTube',
      metric: videoPct > 0 ? `${videoPct}%` : 'Ver video',
      progress: videoPct,
      done: videoPct >= 90
    },
    {
      id: 'games',
      step: '03',
      icon: 'sports_esports',
      label: 'Juegos',
      metric: gamesCompletedCount > 0 ? `${gamesCompletedCount}/${totalGames}` : 'Jugar',
      progress: gamesPct,
      done: gamesCompletedCount >= totalGames
    },
    {
      id: 'quiz',
      step: '04',
      icon: 'quiz',
      label: 'Mi Examen',
      metric: quizCompleted ? 'Realizado' : `${pkg.maxAttempts || 3} int.`,
      progress: quizCompleted ? 100 : 0,
      done: quizCompleted
    }
  ];

  const isAnyFullscreen = isFullscreen || externalFullscreen;

  return (
    <div
      ref={portalContainerRef}
      className={`aia-student-portal-wrap ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* Barra superior estudiantil (solo si no la provee la página contenedora) */}
      {!isMirrorPreview && !hideStandaloneBar && !isAnyFullscreen && (
        <header className="aia-student-standalone-bar">
          <div className="aia-student-brand">
            <div className="aia-student-brand-badge">
              <span className="material-symbols-outlined">school</span>
            </div>
            <div>
              <h2>Mi Aula Adaptativa · Gestor PIAR</h2>
              <span>
                Estudiante: <strong>{pkg.studentName || studentProfile?.nombreCompleto}</strong> · Grado{' '}
                {pkg.studentGrade || studentProfile?.grado}
              </span>
            </div>
          </div>

          {onSignOutStudent && (
            <button type="button" className="aia-btn-secondary" onClick={onSignOutStudent}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                logout
              </span>
              <span>Salir de Mi Aula</span>
            </button>
          )}
        </header>
      )}

      {/* Franja de Foco de Estudio y Guía Pedagógica Adaptativa (permanente, se oculta en pantalla completa) */}
      {!isAnyFullscreen && (
        <section className="aia-friendly-diag-card">
          <div className="aia-friendly-diag-top">
            <div className="aia-friendly-diag-badges">
              {onBackToSubjects && (
                <button
                  type="button"
                  className="aia-back-subjects-btn"
                  onClick={onBackToSubjects}
                  title="Volver a la lista de tus materias"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    arrow_back
                  </span>
                  <span>Mis Materias</span>
                </button>
              )}

              <span className="aia-subject-tag">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  auto_awesome
                </span>
                <span>{pkg.subject}</span>
              </span>

              {isMirrorPreview && (
                <span className="aia-mirror-indicator">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    visibility
                  </span>
                  <span>Vista Estudiante · {pkg.studentFirstName || 'Alumno'}</span>
                </span>
              )}
            </div>
          </div>

          <div className="aia-focus-topic-row">
            <span className="aia-focus-topic-kicker">Hoy fortaleces:</span>
            <strong className="aia-focus-topic-text">{pkg.topic}</strong>
          </div>

          <div className="aia-friendly-expanded-body">
            <div className="aia-friendly-header-line">
              <h3 className="aia-friendly-title">{studentDiag.greetingTitle}</h3>
            </div>
            {studentDiag.encouragementMessage && (
              <p className="aia-friendly-message">{studentDiag.encouragementMessage}</p>
            )}

            <div className="aia-friendly-highlights">
              <div className="aia-friendly-pill-box">
                <div className="aia-friendly-pill-icon goal">
                  <span className="material-symbols-outlined">flag</span>
                </div>
                <div className="aia-friendly-pill-content">
                  <small>Tu Meta de Hoy</small>
                  <strong>{studentDiag.learningGoal || 'Completar tu ruta de refuerzo paso a paso.'}</strong>
                </div>
              </div>
              <div className="aia-friendly-pill-box">
                <div className="aia-friendly-pill-icon tip">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div className="aia-friendly-pill-content">
                  <small>Consejo Personalizado</small>
                  <strong>{studentDiag.superpowerTip || 'Aprende a tu propio ritmo con calma.'}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stepper compacto de los 4 pasos + botón de Pantalla Completa integrado al lado */}
      <div className="aia-stepper-with-fs">
        <nav className="aia-student-module-grid aia-stepper-compact" aria-label="Ruta de estudio y evaluación">
          {modules.map((m) => {
            const isActive = activeModule === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (m.id !== 'slides') setRemediationFocus(null);
                  setActiveModule(m.id);
                }}
                aria-current={isActive ? 'step' : undefined}
                className={`aia-module-nav-card ${isActive ? 'active' : ''} ${m.done ? 'completed' : ''}`}
              >
                <div className="aia-module-nav-inline">
                  <span className="aia-module-icon-wrap">
                    <span className="material-symbols-outlined aia-module-icon">{m.icon}</span>
                  </span>
                  <div className="aia-module-text-stack">
                    <div className="aia-module-nav-top">
                      <span className="aia-module-step aia-tabular">PASO {m.step}</span>
                      <span className={`aia-module-metric aia-tabular ${m.done ? 'done' : ''}`}>
                        {m.done ? `✓ ${m.metric}` : m.metric}
                      </span>
                    </div>
                    <span className="aia-module-label">{m.label}</span>
                  </div>
                </div>
                <div className="aia-module-mini-bar" aria-hidden="true">
                  <div
                    className="aia-module-mini-bar-fill"
                    style={{ width: `${Math.max(isActive ? 14 : 0, m.progress)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className={`aia-stepper-fs-btn ${isAnyFullscreen ? 'active' : ''}`}
          onClick={onToggleExternalFullscreen ? onToggleExternalFullscreen : handleToggleFullscreen}
          title={isAnyFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ver en pantalla completa'}
          aria-label={isAnyFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
        >
          <span className="material-symbols-outlined">
            {isAnyFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
          <span>{isAnyFullscreen ? 'Salir' : 'Ampliar'}</span>
        </button>
      </div>

      {/* Escenario Activo */}
      <div className="aia-student-stage-container">
        {activeModule === 'slides' && (
          <AdaptiveSlidesViewer
            pkg={pkg}
            activity={activity}
            isMirrorPreview={isMirrorPreview}
            remediationFocus={remediationFocus}
            onClearRemediation={() => setRemediationFocus(null)}
            onReturnToQuiz={() => {
              setRemediationFocus(null);
              setActiveModule('quiz');
            }}
            onCompleteSlides={() => {
              setRemediationFocus(null);
              setActiveModule('video');
            }}
          />
        )}
        {activeModule === 'video' && (
          <AdaptiveVideoGuide
            pkg={pkg}
            activity={activity}
            isMirrorPreview={isMirrorPreview}
            onCompleteVideo={() => setActiveModule('games')}
          />
        )}
        {activeModule === 'games' && (
          <AdaptiveGamesArena
            pkg={pkg}
            activity={activity}
            isMirrorPreview={isMirrorPreview}
            onCompleteGames={() => setActiveModule('quiz')}
          />
        )}
        {activeModule === 'quiz' && (
          <AdaptiveQuizMultiAttempt
            pkg={pkg}
            activity={activity}
            isMirrorPreview={isMirrorPreview}
            onNavigateToMedia={handleNavigateFromQuiz}
          />
        )}
      </div>
    </div>
  );
}
