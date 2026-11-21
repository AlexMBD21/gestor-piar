import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAulaIa } from '../context/AulaIaContext';
import { getPackageGames } from '../lib/aulaGames';
import StudentAdaptivePortal from '../components/aula-ia/StudentAdaptivePortal';

function getSubjectIcon(subject = '') {
  const s = String(subject || '').toLowerCase();
  if (s.includes('cienc') || s.includes('químic') || s.includes('quimic') || s.includes('biolog') || s.includes('físic')) return 'science';
  if (s.includes('matem') || s.includes('álgebr') || s.includes('geometr')) return 'calculate';
  if (s.includes('español') || s.includes('lengua') || s.includes('lectur')) return 'menu_book';
  if (s.includes('art') || s.includes('plástic') || s.includes('músic')) return 'palette';
  if (s.includes('educación física') || s.includes('educacion fisica') || s.includes('deport')) return 'sports_soccer';
  if (s.includes('social') || s.includes('histor') || s.includes('geograf') || s.includes('ética') || s.includes('ciudadan')) return 'public';
  return 'auto_stories';
}

function computePackageProgress(pkg, activity) {
  const totalSlides = pkg?.slides?.length || 5;
  const slidesPct = Math.min(
    100,
    Math.round(((activity?.slidesViewed?.length || 0) / totalSlides) * 100)
  );
  const videoPct = activity?.videoMaxPercent || 0;
  const videoDone = Boolean(activity?.videoCompleted || videoPct >= 90);
  const gamesList = getPackageGames(pkg);
  const totalGames = gamesList.length || 4;
  const gamesDone = (activity?.gamesCompleted || []).filter((id) =>
    gamesList.some((g) => g.id === id)
  ).length;
  const gamesPct = Math.min(100, Math.round((gamesDone / totalGames) * 100));
  const attempts = Array.isArray(activity?.attempts) ? activity.attempts : [];
  const quizDone = attempts.length > 0;

  const overallPct = Math.round(
    (slidesPct + (videoDone ? 100 : videoPct) + gamesPct + (quizDone ? 100 : 0)) / 4
  );

  let status = 'pending'; // 'pending' | 'progress' | 'mastered'
  if (slidesPct >= 100 && videoDone && gamesDone >= totalGames && quizDone) {
    status = 'mastered';
  } else if (slidesPct > 0 || videoDone || videoPct > 0 || gamesDone > 0 || quizDone) {
    status = 'progress';
  }

  let reviewSlidesCount = 0;
  if (pkg?.id) {
    try {
      const raw = window.localStorage.getItem(`piar_slide_mastery_${pkg.id}`);
      if (raw) {
        const map = JSON.parse(raw);
        reviewSlidesCount = Object.values(map).filter((v) => v === 'review').length;
      }
    } catch {
      // Ignorar
    }
  }

  return {
    slidesPct,
    videoPct,
    videoDone,
    gamesDone,
    totalGames,
    quizDone,
    attemptsCount: attempts.length,
    maxAttempts: pkg?.maxAttempts || 3,
    overallPct,
    status,
    reviewSlidesCount
  };
}

export default function StudentAulaPage() {
  const { studentSession, refreshStudentSession, signOut } = useAuth();
  const {
    packagesByStudent,
    activityByPackage,
    hydrateFromStudentLogin
  } = useAulaIa();

  const [selectedPkgId, setSelectedPkgId] = useState(() => {
    try {
      return window.sessionStorage.getItem('piar_student_selected_pkg') || null;
    } catch {
      return null;
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const didAutoRefreshRef = useRef(false);
  const pageShellRef = useRef(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    const el = pageShellRef.current || document.documentElement;
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
      // Fallback CSS fullscreen si el navegador lo restringe
    }
    setIsFullscreen((prev) => !prev);
  };

  useEffect(() => {
    try {
      if (selectedPkgId) window.sessionStorage.setItem('piar_student_selected_pkg', selectedPkgId);
      else window.sessionStorage.removeItem('piar_student_selected_pkg');
    } catch {
      // Ignorar
    }
  }, [selectedPkgId]);

  // Hidratar inmediatamente desde la sesión del estudiante
  useEffect(() => {
    if (!studentSession?.piarId) return;
    hydrateFromStudentLogin({
      piarId: studentSession.piarId,
      publishedPackages: studentSession.publishedPackages || [],
      activityMap: studentSession.activityMap || {}
    });
  }, [
    studentSession?.piarId,
    studentSession?.publishedPackages,
    studentSession?.activityMap,
    hydrateFromStudentLogin
  ]);

  // Refrescar sesión al entrar, cada 15s y al volver a la pestaña:
  // trae nuevas materias publicadas e interrumpe automáticamente la sesión si el docente cambió el PIN o pausó el acceso
  useEffect(() => {
    if (!studentSession?.studentDoc) return undefined;
    if (!didAutoRefreshRef.current) {
      didAutoRefreshRef.current = true;
      refreshStudentSession();
    }

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshStudentSession();
      }
    }, 15000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshStudentSession();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [studentSession?.studentDoc, refreshStudentSession]);

  const piarId = studentSession?.piarId || '';
  const publishedPackages = useMemo(() => {
    const fromCtx = packagesByStudent[piarId];
    const source = Array.isArray(fromCtx) && fromCtx.length > 0
      ? fromCtx
      : studentSession?.publishedPackages || [];
    return source.filter((p) => p?.status === 'published');
  }, [packagesByStudent, piarId, studentSession?.publishedPackages]);

  const activePkg = selectedPkgId
    ? publishedPackages.find((p) => p.id === selectedPkgId) || null
    : null;
  const activeActivity = activePkg?.id ? activityByPackage[activePkg.id] : null;

  const studentProfile = useMemo(
    () => ({
      nombreCompleto: studentSession?.studentName || 'Estudiante',
      primerNombre: String(studentSession?.studentName || 'Estudiante').split(/\s+/)[0],
      grado: studentSession?.studentGrade || '',
      numeroIdentificacion: studentSession?.studentDoc || ''
    }),
    [studentSession]
  );

  // Resumen global para la portada "Mi Aula"
  const dashboardStats = useMemo(() => {
    const cards = publishedPackages.map((pkg) => ({
      pkg,
      metrics: computePackageProgress(pkg, activityByPackage[pkg.id])
    }));
    const completedCount = cards.filter((c) => c.metrics.status === 'mastered').length;
    const avgProgress =
      cards.length > 0
        ? Math.round(cards.reduce((acc, c) => acc + c.metrics.overallPct, 0) / cards.length)
        : 0;
    const totalReviews = cards.reduce((acc, c) => acc + c.metrics.reviewSlidesCount, 0);
    return { cards, completedCount, avgProgress, totalReviews };
  }, [publishedPackages, activityByPackage]);

  const handleManualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await refreshStudentSession();
    setRefreshing(false);
  };

  return (
    <div
      ref={pageShellRef}
      className={`aia-student-page-shell ${isFullscreen ? 'is-page-fullscreen' : ''}`}
    >
      {/* Topbar fija superior a ancho completo (se oculta en pantalla completa para máxima concentración) */}
      {!isFullscreen && (
        <header className="aia-student-topbar">
        <div className="aia-student-topbar-inner">
          <button
            type="button"
            className="aia-student-brand aia-student-brand-btn"
            onClick={() => setSelectedPkgId(null)}
            title="Volver al inicio de Mi Aula"
          >
            <div className="aia-student-brand-badge">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '22px', color: '#ffffff' }}
              >
                school
              </span>
            </div>
            <div>
              <h2>Mi Aula Adaptativa</h2>
              <span>
                <strong>{studentProfile.nombreCompleto}</strong>
                {studentProfile.grado ? ` · Grado ${studentProfile.grado}` : ''}
                {studentProfile.numeroIdentificacion
                  ? ` · Doc. ${studentProfile.numeroIdentificacion}`
                  : ''}
              </span>
            </div>
          </button>

          <div className="aia-student-bar-actions">
            <button
              type="button"
              className="aia-btn-secondary aia-btn-sm"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Actualizar materias publicadas por tu profesor"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                {refreshing ? 'hourglass_top' : 'sync'}
              </span>
              <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            <button
              type="button"
              className="aia-btn-secondary aia-btn-sm"
              onClick={() => {
                setSelectedPkgId(null);
                signOut();
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                logout
              </span>
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>
      )}

      <div className="aia-student-scroll-viewport">
        <div className="aia-student-page-inner">

        {/* VISTA A: Portada "Mi Aula" (Tablero de todas las materias asociadas a su documento) */}
        {!activePkg ? (
          <main className="aia-student-home">
            <section className="aia-student-hero-card aia-student-hero-refined">
              <div className="aia-student-hero-text">
                <span className="aia-subject-tag">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    auto_awesome
                  </span>
                  <span>Tu espacio de aprendizaje a tu ritmo</span>
                </span>
                <h1>¡Hola, {studentProfile.primerNombre}!</h1>
                <p>
                  Elige una materia para explorar sus láminas, ver el video, practicar con juegos y
                  completar tu examen con calma.
                </p>
              </div>

              <div className="aia-student-hero-stats aia-student-hero-stats-compact">
                <div className="aia-student-kpi-pill">
                  <span className="aia-student-kpi-icon">
                    <span className="material-symbols-outlined">menu_book</span>
                  </span>
                  <div>
                    <strong className="aia-tabular">{publishedPackages.length}</strong>
                    <small>{publishedPackages.length === 1 ? 'Materia' : 'Materias'}</small>
                  </div>
                </div>
                <div className="aia-student-kpi-pill is-ok">
                  <span className="aia-student-kpi-icon">
                    <span className="material-symbols-outlined">task_alt</span>
                  </span>
                  <div>
                    <strong className="aia-tabular">{dashboardStats.completedCount}</strong>
                    <small>Completadas</small>
                  </div>
                </div>
                <div className="aia-student-kpi-pill">
                  <span className="aia-student-kpi-icon">
                    <span className="material-symbols-outlined">trending_up</span>
                  </span>
                  <div>
                    <strong className="aia-tabular">{dashboardStats.avgProgress}%</strong>
                    <small>Avance total</small>
                  </div>
                </div>
              </div>
            </section>

            {dashboardStats.totalReviews > 0 && (
              <div className="aia-student-review-notice">
                <span className="material-symbols-outlined">bookmark</span>
                <span>
                  Tienes <strong>{dashboardStats.totalReviews}</strong>{' '}
                  {dashboardStats.totalReviews === 1
                    ? 'lámina marcada'
                    : 'láminas marcadas'}{' '}
                  para repasar. Entra a tu materia para fortalecerlas.
                </span>
              </div>
            )}

            {publishedPackages.length === 0 ? (
              <div className="aia-bento-card aia-student-empty-state">
                <span className="material-symbols-outlined aia-student-empty-icon">
                  menu_book
                </span>
                <h3>Aún no tienes materias publicadas</h3>
                <p>
                  Tu cuenta está activa con el documento{' '}
                  <strong className="aia-tabular">{studentProfile.numeroIdentificacion}</strong>.
                  Cuando tu profesor publique un material de estudio para ti, aparecerá aquí
                  automáticamente.
                </p>
                <button
                  type="button"
                  className="aia-btn-primary"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    sync
                  </span>
                  <span>Comprobar si hay nuevas materias</span>
                </button>
              </div>
            ) : (
              <div className="aia-student-subjects-section">
                <div className="aia-student-subjects-head">
                  <h2>Tus materias asignadas</h2>
                  <span className="aia-mirror-count-pill aia-tabular">
                    {dashboardStats.completedCount}/{publishedPackages.length} completadas
                  </span>
                </div>

                <section className="aia-student-subjects-grid" aria-label="Mis materias publicadas">
                  {dashboardStats.cards.map(({ pkg, metrics }) => {
                    const statusLabel =
                      metrics.status === 'mastered'
                        ? '✓ Completada'
                        : metrics.status === 'progress'
                          ? 'En progreso'
                          : 'Nueva';

                    const ctaLabel =
                      metrics.status === 'mastered'
                        ? 'Repasar materia'
                        : metrics.status === 'progress'
                          ? 'Continuar estudiando'
                          : 'Empezar a estudiar';

                    return (
                      <article
                        key={pkg.id}
                        className={`aia-student-subject-card aia-student-subject-card-pro ${metrics.status}`}
                      >
                        <div className="aia-student-subject-top">
                          <span className="aia-subject-tag">
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                              {getSubjectIcon(pkg.subject)}
                            </span>
                            <span>{pkg.subject}</span>
                          </span>
                          <span className={`aia-student-status-pill ${metrics.status}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <h3 className="aia-student-subject-title">{pkg.topic}</h3>

                        <div className="aia-student-subject-progress">
                          <div className="aia-student-subject-progress-head aia-tabular">
                            <span>Recorrido completado</span>
                            <strong>{metrics.overallPct}%</strong>
                          </div>
                          <div className="aia-progress-track aia-slim-track">
                            <div
                              className={`aia-progress-fill ${
                                metrics.status === 'mastered' ? 'tone-high' : ''
                              }`}
                              style={{ width: `${metrics.overallPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="aia-student-subject-chips aia-tabular">
                          <span className={metrics.slidesPct >= 100 ? 'done' : ''}>
                            {metrics.slidesPct >= 100 ? '✓ Láminas' : `Láminas ${metrics.slidesPct}%`}
                          </span>
                          <span className={metrics.videoDone ? 'done' : ''}>
                            {metrics.videoDone ? '✓ Video' : 'Video'}
                          </span>
                          <span className={metrics.gamesDone >= metrics.totalGames ? 'done' : ''}>
                            {metrics.gamesDone >= metrics.totalGames
                              ? `✓ Juegos ${metrics.gamesDone}/${metrics.totalGames}`
                              : `Juegos ${metrics.gamesDone}/${metrics.totalGames}`}
                          </span>
                          <span className={metrics.quizDone ? 'done' : ''}>
                            {metrics.quizDone ? '✓ Examen' : 'Examen'}
                          </span>
                        </div>

                        {metrics.reviewSlidesCount > 0 && (
                          <div className="aia-student-card-bookmark">
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                              bookmark
                            </span>
                            <span>{metrics.reviewSlidesCount} por repasar</span>
                          </div>
                        )}

                        <button
                          type="button"
                          className={`aia-student-subject-cta ${
                            metrics.status === 'mastered' ? 'aia-btn-secondary' : 'aia-btn-primary'
                          }`}
                          onClick={() => setSelectedPkgId(pkg.id)}
                        >
                          <span>{ctaLabel}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            arrow_forward
                          </span>
                        </button>
                      </article>
                    );
                  })}
                </section>
              </div>
            )}
          </main>
        ) : (
          /* VISTA B: Espacio de Estudio de la Materia seleccionada */
          <main className="aia-student-workspace-wrap">
            {publishedPackages.length > 1 && (
              <div className="aia-package-bar" style={{ marginBottom: '12px' }}>
                <div className="aia-package-bar-left">
                  <span className="aia-package-bar-label">Cambiar de materia:</span>
                  <div className="aia-package-pills">
                    {publishedPackages.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPkgId(p.id)}
                        className={`aia-pkg-pill ${activePkg?.id === p.id ? 'active' : ''}`}
                      >
                        <span>{p.subject}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <StudentAdaptivePortal
              pkg={activePkg}
              activity={activeActivity}
              isMirrorPreview={false}
              hideStandaloneBar={true}
              externalFullscreen={isFullscreen}
              onToggleExternalFullscreen={handleToggleFullscreen}
              studentProfile={studentProfile}
              onBackToSubjects={() => setSelectedPkgId(null)}
              onSignOutStudent={signOut}
            />
          </main>
        )}
        </div>
      </div>
    </div>
  );
}
