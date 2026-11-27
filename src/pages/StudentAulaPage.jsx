import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAulaIa } from '../context/AulaIaContext';
import { computePackageMetrics } from '../lib/aulaProgress';
import { supabase } from '../lib/supabaseClient';
import {
  getStudentAccessChannelName,
  LOCAL_CREDS_KEY,
  STUDENT_ACCESS_REVOKED_EVENT
} from '../lib/studentAccessService';
import { animateStaggerIn, runViewTransition } from '../lib/motionCraft';
import { useFullscreenToggle } from '../components/aula-ia/useFullscreenToggle';
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

export default function StudentAulaPage() {
  const { studentSession, refreshStudentSession, revokeStudentSession, signOut } = useAuth();
  const {
    ready: aulaReady,
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
  const didAutoRefreshRef = useRef(false);
  const didAnimateKpisRef = useRef(false);
  const pageShellRef = useRef(null);
  const homeMainRef = useRef(null);
  const { isFullscreen, toggleFullscreen: handleToggleFullscreen } = useFullscreenToggle(
    pageShellRef,
    { fallbackToDocument: true }
  );

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

  // Refrescar sesión al entrar, en tiempo real (Supabase Broadcast + storage entre pestañas),
  // cada 10s y al volver a la pestaña: trae nuevas materias publicadas e interrumpe
  // automáticamente la sesión si el docente cambió el PIN o pausó el acceso
  useEffect(() => {
    if (!studentSession?.studentDoc || !studentSession?.piarId) return undefined;
    if (!didAutoRefreshRef.current) {
      didAutoRefreshRef.current = true;
      refreshStudentSession();
    }

    const channel = supabase
      .channel(getStudentAccessChannelName(studentSession.piarId))
      .on('broadcast', { event: 'access_updated' }, ({ payload }) => {
        if (payload && payload.isActive === false) {
          revokeStudentSession(
            'Tu profesor pausó temporalmente el acceso a tu Aula. Consulta con él para reactivarlo.'
          );
          return;
        }
        refreshStudentSession();
      })
      .subscribe();

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshStudentSession();
      }
    }, 10000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshStudentSession();
      }
    };

    const handleStorageChange = (event) => {
      if (event.key === LOCAL_CREDS_KEY) {
        refreshStudentSession();
      }
    };

    const handleRevokedEvent = () => {
      refreshStudentSession();
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(STUDENT_ACCESS_REVOKED_EVENT, handleRevokedEvent);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(STUDENT_ACCESS_REVOKED_EVENT, handleRevokedEvent);
    };
  }, [
    studentSession?.studentDoc,
    studentSession?.piarId,
    refreshStudentSession,
    revokeStudentSession
  ]);

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
      metrics: computePackageMetrics(pkg, activityByPackage[pkg.id], { includeReviewCount: true })
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

  const handleSelectPackage = (pkgId) => {
    runViewTransition(() => setSelectedPkgId(pkgId));
  };

  const isHomeView = !activePkg;
  const publishedCount = publishedPackages.length;

  useEffect(() => {
    if (!isHomeView || !homeMainRef.current) return undefined;
    const cleanups = [];
    if (!didAnimateKpisRef.current) {
      didAnimateKpisRef.current = true;
      cleanups.push(
        animateStaggerIn(homeMainRef.current, '.aia-student-kpi-pill', {
          y: 8,
          duration: 0.3,
          stagger: 0.05
        })
      );
    }
    if (publishedCount > 0) {
      cleanups.push(
        animateStaggerIn(homeMainRef.current, '.aia-student-subject-card', {
          y: 12,
          duration: 0.34,
          stagger: 0.045,
          delay: 0.04
        })
      );
    }
    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [isHomeView, publishedCount]);

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
            onClick={() => handleSelectPackage(null)}
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
            <div
              className="header-role-chip is-student"
              title={
                studentProfile.grado
                  ? `Estudiante · ${studentProfile.nombreCompleto} (Grado ${studentProfile.grado})`
                  : `Estudiante · ${studentProfile.nombreCompleto}`
              }
            >
              <span className="header-role-avatar" aria-hidden="true">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  school
                </span>
              </span>
              <span className="header-role-label">Estudiante</span>
            </div>

            <button
              type="button"
              className="aia-student-logout-btn"
              onClick={() => {
                setSelectedPkgId(null);
                signOut();
              }}
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                logout
              </span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>
      )}

      <div className="aia-student-scroll-viewport">
        <div className="aia-student-page-inner">

        {/* VISTA A: Portada "Mi Aula" (Tablero de todas las materias asociadas a su documento) */}
        {!activePkg ? (
          <main ref={homeMainRef} className="aia-student-home">
            <section className="aia-student-hero-card aia-student-hero-refined">
              <div className="aia-student-hero-text">
                <h1>¡Hola, {studentProfile.primerNombre}!</h1>
                <p>Elige una materia para avanzar a tu ritmo.</p>
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

            {publishedPackages.length === 0 && (!aulaReady || refreshing) ? (
              <div className="aia-student-subjects-section" role="status" aria-live="polite" aria-label="Cargando materias asignadas">
                <div className="aia-student-subjects-head">
                  <span className="aia-skel" style={{ width: '190px', height: '20px' }} />
                </div>
                <section className="aia-student-subjects-grid">
                  {[0, 1, 2].map((idx) => (
                    <article key={idx} className="aia-skel-student-card">
                      <div className="aia-skel-row-between">
                        <span className="aia-skel aia-skel-pill" style={{ width: '128px', height: '26px' }} />
                        <span className="aia-skel aia-skel-pill" style={{ width: '76px', height: '24px' }} />
                      </div>
                      <span className="aia-skel" style={{ width: '88%', height: '18px' }} />
                      <span className="aia-skel" style={{ width: '62%', height: '14px' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="aia-skel-row-between">
                          <span className="aia-skel" style={{ width: '120px', height: '12px' }} />
                          <span className="aia-skel" style={{ width: '34px', height: '12px' }} />
                        </div>
                        <span className="aia-skel aia-skel-pill" style={{ width: '100%', height: '7px' }} />
                      </div>
                      <div className="aia-skel-chips-row">
                        <span className="aia-skel aia-skel-pill" style={{ width: '74px', height: '24px' }} />
                        <span className="aia-skel aia-skel-pill" style={{ width: '58px', height: '24px' }} />
                        <span className="aia-skel aia-skel-pill" style={{ width: '78px', height: '24px' }} />
                        <span className="aia-skel aia-skel-pill" style={{ width: '64px', height: '24px' }} />
                      </div>
                      <span className="aia-skel" style={{ width: '100%', height: '40px', borderRadius: '10px', marginTop: 'auto' }} />
                    </article>
                  ))}
                </section>
              </div>
            ) : publishedPackages.length === 0 ? (
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
                          {metrics.reviewSlidesCount > 0 && (
                            <span className="aia-chip-review">
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                bookmark
                              </span>
                              {metrics.reviewSlidesCount} por repasar
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className={`aia-student-subject-cta ${
                            metrics.status === 'mastered' ? 'aia-btn-secondary' : 'aia-btn-primary'
                          }`}
                          onClick={() => handleSelectPackage(pkg.id)}
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
            <StudentAdaptivePortal
              pkg={activePkg}
              activity={activeActivity}
              isMirrorPreview={false}
              hideStandaloneBar={true}
              externalFullscreen={isFullscreen}
              onToggleExternalFullscreen={handleToggleFullscreen}
              studentProfile={studentProfile}
              publishedPackages={publishedPackages}
              onSelectPackage={handleSelectPackage}
              onBackToSubjects={() => handleSelectPackage(null)}
              onSignOutStudent={signOut}
            />
          </main>
        )}
        </div>
      </div>
    </div>
  );
}
