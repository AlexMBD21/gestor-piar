// Cálculos compartidos de progreso y tono de puntaje para Aula Adaptativa IA
// Unifica la lógica usada en StudentAulaPage, StudentAdaptivePortal, TeacherTelemetryAnalytics y AulaAdaptativaSuite.
import { getPackageGames } from './aulaGames';

/**
 * Devuelve la clase de tono visual para un porcentaje de evaluación.
 * @param {number|null|undefined} pct
 * @param {{ allowEmpty?: boolean }} [options]
 * @returns {'high'|'mid'|'low'|'empty'}
 */
export function getScoreTone(pct, { allowEmpty = false } = {}) {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) {
    return allowEmpty ? 'empty' : 'low';
  }
  const value = Number(pct);
  if (value >= 80) return 'high';
  if (value >= 50) return 'mid';
  return 'low';
}

/**
 * Calcula las métricas completas de progreso de un paquete de estudio y su actividad.
 */
export function computePackageMetrics(pkg, activity, { includeReviewCount = false } = {}) {
  const totalSlides = pkg?.slides?.length || 5;
  const slidesViewedCount = activity?.slidesViewed?.length || 0;
  const slidesPct = Math.min(100, Math.round((slidesViewedCount / totalSlides) * 100));

  const videoPct = activity?.videoMaxPercent || 0;
  const videoDone = Boolean(activity?.videoCompleted || videoPct >= 90);

  const gamesList = getPackageGames(pkg);
  const totalGames = gamesList.length || 4;
  const gamesCompletedList = Array.isArray(activity?.gamesCompleted) ? activity.gamesCompleted : [];
  const gamesCompletedCount = gamesCompletedList.filter((id) =>
    gamesList.some((g) => g.id === id)
  ).length;
  const gamesPct = Math.min(100, Math.round((gamesCompletedCount / totalGames) * 100));
  const gamesMaxPercent = Math.max(activity?.gamesProgress || 0, gamesPct);

  const attempts = Array.isArray(activity?.attempts) ? activity.attempts : [];
  const attemptsCount = attempts.length;
  const maxAttempts = pkg?.maxAttempts || 3;
  const quizDone = attemptsCount > 0;
  const bestQuizPct =
    attemptsCount > 0
      ? Math.max(...attempts.map((a) => Number(a?.percentage) || 0))
      : null;

  const overallPct = Math.round(
    (slidesPct + (videoDone ? 100 : videoPct) + gamesPct + (quizDone ? 100 : 0)) / 4
  );

  let status = 'pending'; // 'pending' | 'progress' | 'mastered'
  if (slidesPct >= 100 && videoDone && gamesCompletedCount >= totalGames && quizDone) {
    status = 'mastered';
  } else if (slidesPct > 0 || videoDone || videoPct > 0 || gamesCompletedCount > 0 || quizDone) {
    status = 'progress';
  }

  let reviewSlidesCount = 0;
  if (includeReviewCount && pkg?.id && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`piar_slide_mastery_${pkg.id}`);
      if (raw) {
        const map = JSON.parse(raw);
        reviewSlidesCount = Object.values(map).filter((v) => v === 'review').length;
      }
    } catch {
      // Ignorar restricciones de almacenamiento
    }
  }

  return {
    totalSlides,
    slidesViewedCount,
    slidesPct,
    videoPct,
    videoDone,
    gamesList,
    totalGames,
    gamesDone: gamesCompletedCount,
    gamesCompletedCount,
    gamesPct,
    gamesMaxPercent,
    attempts,
    attemptsCount,
    maxAttempts,
    quizDone,
    bestQuizPct,
    overallPct,
    status,
    reviewSlidesCount
  };
}
