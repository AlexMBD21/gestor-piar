import { useMemo, useState } from 'react';
import { getPackageGames } from '../../lib/aulaGames';
import { hydrateCoherentPackage } from '../../lib/piarAiEngine';
import AdaptiveSlidesViewer from './AdaptiveSlidesViewer';
import AdaptiveAudioPlayer from './AdaptiveAudioPlayer';
import AdaptiveVideoGuide from './AdaptiveVideoGuide';
import AdaptiveGamesArena from './AdaptiveGamesArena';
import AdaptiveQuizMultiAttempt from './AdaptiveQuizMultiAttempt';

export default function StudentAdaptivePortal({
  pkg: rawPkg,
  activity,
  isMirrorPreview = false,
  studentProfile,
  onSignOutStudent
}) {
  const pkg = useMemo(() => hydrateCoherentPackage(rawPkg), [rawPkg]);
  const [activeModule, setActiveModule] = useState('slides'); // 'slides' | 'audio' | 'video' | 'games' | 'quiz'
  const [isWelcomeCollapsed, setIsWelcomeCollapsed] = useState(false);

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
  const audioPct = activity?.audioMaxPercent || 0;
  const videoPct = activity?.videoMaxPercent || 0;
  const gamesList = getPackageGames(pkg);
  const totalGames = gamesList.length || 4;
  const gamesCompletedCount = (activity?.gamesCompleted || []).filter((id) =>
    gamesList.some((g) => g.id === id)
  ).length;
  const gamesPct = activity?.gamesMaxPercent || 0;
  const attempts = activity?.attempts || [];
  const bestQuizPct =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : null;

  const modules = [
    {
      id: 'slides',
      step: '01',
      icon: 'slideshow',
      label: 'Diapositivas Interactivas',
      metric: `${slidesPct}% visto`,
      progress: slidesPct,
      done: slidesPct >= 100
    },
    {
      id: 'audio',
      step: '02',
      icon: 'headphones',
      label: 'Cápsula de Audio',
      metric: audioPct > 0 ? `${audioPct}% oído` : 'Escuchar',
      progress: audioPct,
      done: audioPct >= 90
    },
    {
      id: 'video',
      step: '03',
      icon: 'smart_display',
      label: 'Video / Guía Paso a Paso',
      metric: videoPct > 0 ? `${videoPct}% visto` : 'Ver guía',
      progress: videoPct,
      done: videoPct >= 90
    },
    {
      id: 'games',
      step: '04',
      icon: 'sports_esports',
      label: 'Juegos Didácticos',
      metric: gamesCompletedCount > 0 ? `${gamesCompletedCount}/${totalGames} listos` : 'Jugar',
      progress: gamesPct,
      done: gamesCompletedCount >= totalGames
    },
    {
      id: 'quiz',
      step: '05',
      icon: 'quiz',
      label: 'Mi Examen de Refuerzo',
      metric: bestQuizPct !== null ? `Mejor: ${bestQuizPct}%` : `${pkg.maxAttempts || 3} intentos`,
      progress: bestQuizPct !== null ? bestQuizPct : 0,
      done: bestQuizPct === 100
    }
  ];

  return (
    <div className="aia-student-portal-wrap">
      {/* Si es el portal directo del Rol Estudiante (no el espejo del docente), mostrar barra superior estudiantil */}
      {!isMirrorPreview && (
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

      {/* Banner de Diagnóstico Formativo Amigable (Generado por Gemini para el Estudiante) */}
      <section className={`aia-friendly-diag-card ${isWelcomeCollapsed ? 'collapsed' : ''}`}>
        <div className="aia-friendly-diag-top">
          <div className="aia-friendly-diag-badges">
            <span className="aia-subject-tag">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                auto_awesome
              </span>
              <span>{pkg.subject}</span>
            </span>
            <span className="aia-topic-tag" title={pkg.topic}>
              {pkg.topic}
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

          <div className="aia-friendly-diag-actions">
            <button
              type="button"
              className="aia-welcome-collapse-btn"
              onClick={() => setIsWelcomeCollapsed((v) => !v)}
              title={isWelcomeCollapsed ? 'Mostrar bienvenida y metas' : 'Contraer bienvenida'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isWelcomeCollapsed ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          </div>
        </div>

        <div className="aia-friendly-header-line">
          <h3 className="aia-friendly-title">{studentDiag.greetingTitle}</h3>
        </div>

        {!isWelcomeCollapsed && (
          <>
            <p className="aia-friendly-message">{studentDiag.encouragementMessage}</p>

            <div className="aia-friendly-highlights">
              <div className="aia-friendly-pill-box">
                <div className="aia-friendly-pill-icon goal">
                  <span className="material-symbols-outlined">flag</span>
                </div>
                <div className="aia-friendly-pill-content">
                  <small>Tu Meta de Hoy</small>
                  <strong>{studentDiag.learningGoal}</strong>
                </div>
              </div>
              <div className="aia-friendly-pill-box">
                <div className="aia-friendly-pill-icon tip">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div className="aia-friendly-pill-content">
                  <small>Consejo Personalizado</small>
                  <strong>{studentDiag.superpowerTip}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Selector de los 4 Módulos Didácticos con Telemetría */}
      <nav className="aia-student-module-grid" aria-label="Ruta de estudio y evaluación">
        {modules.map((m) => {
          const isActive = activeModule === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModule(m.id)}
              className={`aia-module-nav-card ${isActive ? 'active' : ''} ${m.done ? 'completed' : ''}`}
            >
              <div className="aia-module-nav-top">
                <span className="aia-module-step aia-tabular">PASO {m.step}</span>
                <span className={`aia-module-metric aia-tabular ${m.done ? 'done' : ''}`}>
                  {m.done ? `✓ ${m.metric}` : m.metric}
                </span>
              </div>
              <div className="aia-module-nav-main">
                <span className="aia-module-icon-wrap">
                  <span className="material-symbols-outlined aia-module-icon">{m.icon}</span>
                </span>
                <span className="aia-module-label">{m.label}</span>
              </div>
              <div className="aia-module-mini-bar" aria-hidden="true">
                <div
                  className="aia-module-mini-bar-fill"
                  style={{ width: `${Math.max(isActive ? 12 : 0, m.progress)}%` }}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Escenario Activo */}
      <div className="aia-student-stage-container">
        {activeModule === 'slides' && (
          <AdaptiveSlidesViewer
            pkg={pkg}
            activity={activity}
            isMirrorPreview={isMirrorPreview}
            onCompleteSlides={() => setActiveModule('audio')}
          />
        )}
        {activeModule === 'audio' && (
          <AdaptiveAudioPlayer
            pkg={pkg}
            activity={activity}
            onCompleteAudio={() => setActiveModule('video')}
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
            onCompleteGames={() => setActiveModule('quiz')}
          />
        )}
        {activeModule === 'quiz' && (
          <AdaptiveQuizMultiAttempt
            pkg={pkg}
            activity={activity}
            onNavigateToMedia={(targetModule) => setActiveModule(targetModule)}
          />
        )}
      </div>
    </div>
  );
}

