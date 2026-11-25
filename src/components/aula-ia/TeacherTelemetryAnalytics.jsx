import { useState, useEffect, useRef } from 'react';
import { GAME_TYPES } from '../../lib/aulaGames';
import { getScoreTone, computePackageMetrics } from '../../lib/aulaProgress';
import { useAulaIa } from '../../context/AulaIaContext';
import { animateStaggerIn } from '../../lib/motionCraft';
import ConfirmModal from './ConfirmModal';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatAttemptDate = (iso) => {
  if (!iso) return 'Sin fecha';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Sin fecha';
  }
};

export default function TeacherTelemetryAnalytics({ pkg, activity, studentPiar }) {
  const { resetAttemptsForPackage } = useAulaIa();
  const {
    totalSlides,
    slidesViewedCount,
    slidesPct,
    videoPct,
    videoDone,
    gamesList,
    totalGames,
    gamesCompletedCount,
    gamesPct,
    attempts,
    maxAttempts,
    bestQuizPct
  } = computePackageMetrics(pkg, activity);
  const archivedCount = Array.isArray(activity?.archivedAttempts)
    ? activity.archivedAttempts.length
    : 0;
  const questions = Array.isArray(pkg?.quizQuestions) ? pkg.quizQuestions : [];

  const latestAttemptNumber = attempts[attempts.length - 1]?.attemptNumber || 1;
  const [selectedAttemptNum, setSelectedAttemptNum] = useState(latestAttemptNumber);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [nowMs] = useState(() => Date.now());
  const kpiGridRef = useRef(null);

  // Cuando cambia de materia o llega un nuevo intento en tiempo real, enfocar el más reciente
  useEffect(() => {
    setSelectedAttemptNum(latestAttemptNumber);
    setShowAllQuestions(false);
  }, [pkg?.id, latestAttemptNumber]);

  useEffect(() => {
    if (!pkg?.id || !kpiGridRef.current) return undefined;
    return animateStaggerIn(kpiGridRef.current, '.aia-telemetry-slim-card', {
      y: 8,
      duration: 0.3,
      stagger: 0.045
    });
  }, [pkg?.id]);

  if (!pkg) return null;

  const gamesScores = activity?.gamesScores || {};
  const scoredGameEntries = gamesList.map((g) => {
    const entry = gamesScores[g.id];
    const meta = GAME_TYPES[g.type] || GAME_TYPES.memory;
    const label = g.type === 'memory' ? 'Une Parejas' : meta.label;
    const done = (activity?.gamesCompleted || []).includes(g.id);
    return {
      id: g.id,
      label,
      done,
      score: entry?.score ?? null,
      total: entry?.total ?? null,
      percentage: entry?.percentage ?? (done ? 100 : null)
    };
  });

  const activeAttempt =
    attempts.find((a) => a.attemptNumber === selectedAttemptNum) ||
    attempts[attempts.length - 1] ||
    null;

  const activeAttemptIndex = activeAttempt
    ? attempts.findIndex((a) => a.attemptNumber === activeAttempt.attemptNumber)
    : -1;
  const previousAttempt = activeAttemptIndex > 0 ? attempts[activeAttemptIndex - 1] : null;
  const activeAttemptDelta =
    activeAttempt && previousAttempt
      ? (activeAttempt.percentage || 0) - (previousAttempt.percentage || 0)
      : null;

  const lastAttempt = attempts[attempts.length - 1] || null;
  const lastInteractionMs = activity?.lastInteractionAt
    ? Date.parse(activity.lastInteractionAt) || 0
    : 0;
  const lastInteractionLabel = lastInteractionMs
    ? new Date(lastInteractionMs).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Sin actividad registrada aún';

  // Habilidades por reforzar según el último intento, ordenadas por reincidencia
  const reinforceList = lastAttempt
    ? questions
        .map((q, qIdx) => {
          if (lastAttempt.answers?.[qIdx] === q.correctIndex) return null;
          const failCount = attempts.filter((a) => a.answers?.[qIdx] !== q.correctIndex).length;
          return {
            key: q.id || qIdx,
            num: qIdx + 1,
            skill: q.skillTag || `Pregunta ${qIdx + 1}`,
            failCount,
            ref: q.remediationRef || q.remediationResource || ''
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.failCount - a.failCount)
    : [];

  // Alertas accionables para el docente
  const alerts = [];
  const daysInactive = lastInteractionMs ? Math.floor((nowMs - lastInteractionMs) / DAY_MS) : 0;
  if (lastInteractionMs && daysInactive >= 3 && bestQuizPct !== 100) {
    alerts.push({ tone: 'warn', icon: 'event_busy', text: `Sin actividad hace ${daysInactive} días` });
  }
  if (
    lastAttempt &&
    (lastAttempt.mediaSnapshot?.slidesPercent || 0) < 40 &&
    (lastAttempt.mediaSnapshot?.videoPercent || 0) < 40
  ) {
    alerts.push({
      tone: 'warn',
      icon: 'visibility_off',
      text: 'Presentó el examen sin explorar el material'
    });
  }
  if (attempts.length > 1) {
    const prevPct = attempts[attempts.length - 2]?.percentage || 0;
    const lastPct = lastAttempt?.percentage || 0;
    if (lastPct < prevPct) {
      alerts.push({
        tone: 'warn',
        icon: 'trending_down',
        text: `Bajó ${prevPct - lastPct}% frente al intento anterior`
      });
    }
  }
  if (attempts.length >= maxAttempts && (bestQuizPct ?? 0) < 80) {
    alerts.push({
      tone: 'danger',
      icon: 'block',
      text: 'Agotó los intentos sin dominar el tema'
    });
  }
  if (bestQuizPct === 100) {
    alerts.push({ tone: 'ok', icon: 'workspace_premium', text: 'Dominó el tema' });
  }

  const handleConfirmReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    await resetAttemptsForPackage(pkg.id, studentPiar);
    setIsResetting(false);
    setConfirmReset(false);
  };

  const renderQuestionFull = (q, qIdx) => {
    const chosenIdx = activeAttempt.answers?.[qIdx];
    const hasChosen = typeof chosenIdx === 'number' && chosenIdx >= 0;
    const isCorrect = hasChosen && chosenIdx === q.correctIndex;
    const prevFailed = previousAttempt && previousAttempt.answers?.[qIdx] !== q.correctIndex;
    const recoveredNow = isCorrect && prevFailed;
    const chosenLetter = hasChosen ? String.fromCharCode(65 + chosenIdx) : '—';
    const chosenText = hasChosen
      ? q.options?.[chosenIdx] || `Opción ${chosenLetter}`
      : 'Sin respuesta registrada';
    const correctLetter = String.fromCharCode(65 + (q.correctIndex ?? 0));
    const correctText = q.options?.[q.correctIndex] || `Opción ${correctLetter}`;
    const refText = q.remediationRef || q.remediationResource || '';

    return (
      <div
        key={q.id || qIdx}
        className={`aia-attempt-q-card ${isCorrect ? 'is-pass' : 'is-fail'}`}
      >
        <div className="aia-attempt-q-top">
          <div className="aia-attempt-q-id">
            <span className="aia-attempt-q-num aia-tabular">P{qIdx + 1}</span>
            <span className="aia-attempt-q-skill">{q.skillTag}</span>
          </div>

          <div className="aia-attempt-q-badges">
            {recoveredNow && (
              <span className="aia-attempt-recovered-pill">
                ↑ Superada vs Intento #{previousAttempt.attemptNumber}
              </span>
            )}
            <span className={`aia-matrix-cell-badge ${isCorrect ? 'pass' : 'fail'}`}>
              {isCorrect ? '✓ Acertó' : '✕ Falló'}
            </span>
          </div>
        </div>

        <p className="aia-attempt-q-prompt">{q.question}</p>

        <div className="aia-attempt-answer-grid">
          <div
            className={`aia-attempt-answer-box ${isCorrect ? 'chosen-pass' : 'chosen-fail'}`}
          >
            <span className="aia-attempt-answer-label">Respondió el estudiante</span>
            <div className="aia-attempt-answer-value">
              <span className="aia-attempt-opt-letter">{chosenLetter}</span>
              <span>{chosenText}</span>
            </div>
          </div>

          {!isCorrect && (
            <div className="aia-attempt-answer-box expected-pass">
              <span className="aia-attempt-answer-label">Respuesta correcta</span>
              <div className="aia-attempt-answer-value">
                <span className="aia-attempt-opt-letter">{correctLetter}</span>
                <span>{correctText}</span>
              </div>
            </div>
          )}
        </div>

        {!isCorrect && refText && (
          <div className="aia-attempt-q-remediation">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              menu_book
            </span>
            <span>
              Refuerzo sugerido: <strong>{refText}</strong>
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderQuestionSlim = (q, qIdx) => {
    const chosenIdx = activeAttempt.answers?.[qIdx];
    const hasChosen = typeof chosenIdx === 'number' && chosenIdx >= 0;
    const isCorrect = hasChosen && chosenIdx === q.correctIndex;
    const chosenLetter = hasChosen ? String.fromCharCode(65 + chosenIdx) : '—';
    const chosenText = hasChosen
      ? q.options?.[chosenIdx] || `Opción ${chosenLetter}`
      : 'Sin respuesta registrada';
    const prevFailed = previousAttempt && previousAttempt.answers?.[qIdx] !== q.correctIndex;
    const recoveredNow = isCorrect && prevFailed;

    return (
      <div
        key={q.id || qIdx}
        className={`aia-attempt-q-slim ${isCorrect ? 'is-pass' : 'is-fail'}`}
      >
        <span className="aia-attempt-q-num aia-tabular">P{qIdx + 1}</span>
        <span className="aia-attempt-q-skill">{q.skillTag}</span>
        <span className="aia-attempt-q-slim-answer">
          {hasChosen ? `${chosenLetter}. ${chosenText}` : chosenText}
        </span>
        {recoveredNow && <span className="aia-attempt-recovered-pill">↑ Superada</span>}
        <span className={`aia-matrix-cell-badge ${isCorrect ? 'pass' : 'fail'}`}>
          {isCorrect ? '✓ Acertó' : '✕ Falló'}
        </span>
      </div>
    );
  };

  return (
    <div className="aia-analytics-layout">
      {/* Banner Compacto: tema activo + 4 KPIs de avance + desglose de juegos + alertas */}
      <div className="aia-bento-card aia-telemetry-context-card aia-telemetry-compact">
        <div className="aia-telemetry-context-top">
          <h3 className="aia-telemetry-context-topic">{pkg.topic}</h3>

          <span className="aia-telemetry-last-seen aia-tabular">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              schedule
            </span>
            <span>Última actividad: {lastInteractionLabel}</span>
          </span>
        </div>

        <div ref={kpiGridRef} className="aia-telemetry-bento-grid aia-telemetry-slim-grid">
          {/* Paso 01: Diapositivas */}
          <div className="aia-telemetry-slim-card">
            <div className="aia-telemetry-slim-row">
              <div className="aia-telemetry-icon-box slides">
                <span className="material-symbols-outlined">slideshow</span>
              </div>
              <div className="aia-telemetry-slim-copy">
                <span className="aia-telemetry-slim-title">Diapositivas</span>
                <span className="aia-telemetry-slim-meta aia-tabular">
                  {slidesViewedCount}/{totalSlides} láminas · {activity?.slidesTimeSec || 0}s
                  {(activity?.audioPlayCount || 0) > 0 ? ` · Voz ${activity.audioPlayCount}x` : ''}
                </span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${slidesPct >= 80 ? 'high' : 'mid'}`}>
                {slidesPct}%
              </span>
            </div>
            <div className="aia-progress-track aia-slim-track">
              <div className="aia-progress-fill" style={{ width: `${slidesPct}%` }} />
            </div>
          </div>

          {/* Paso 02: Video YouTube */}
          <div className="aia-telemetry-slim-card">
            <div className="aia-telemetry-slim-row">
              <div className="aia-telemetry-icon-box video">
                <span className="material-symbols-outlined">smart_display</span>
              </div>
              <div className="aia-telemetry-slim-copy">
                <span className="aia-telemetry-slim-title">Video YouTube</span>
                <span className="aia-telemetry-slim-meta aia-tabular">
                  {videoDone ? 'Confirmado por el alumno' : 'Sin confirmar'}
                </span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${videoDone ? 'high' : 'mid'}`}>
                {videoDone ? 'Confirmado ✓' : 'Pendiente'}
              </span>
            </div>
            <div className="aia-progress-track aia-slim-track">
              <div className="aia-progress-fill" style={{ width: `${videoDone ? 100 : videoPct}%` }} />
            </div>
          </div>

          {/* Paso 03: Juegos Didácticos */}
          <div className="aia-telemetry-slim-card">
            <div className="aia-telemetry-slim-row">
              <div className="aia-telemetry-icon-box games">
                <span className="material-symbols-outlined">sports_esports</span>
              </div>
              <div className="aia-telemetry-slim-copy">
                <span className="aia-telemetry-slim-title">Juegos IA</span>
                <span className="aia-telemetry-slim-meta aia-tabular">
                  {gamesCompletedCount}/{totalGames} hechos · {activity?.gamesTimeSec || 0}s
                </span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${gamesPct >= 80 ? 'high' : 'mid'}`}>
                {gamesPct}%
              </span>
            </div>
            <div className="aia-progress-track aia-slim-track">
              <div className="aia-progress-fill" style={{ width: `${gamesPct}%` }} />
            </div>
          </div>

          {/* Paso 04: Examen de Refuerzo */}
          <div className="aia-telemetry-slim-card">
            <div className="aia-telemetry-slim-row">
              <div className="aia-telemetry-icon-box audio">
                <span className="material-symbols-outlined">quiz</span>
              </div>
              <div className="aia-telemetry-slim-copy">
                <span className="aia-telemetry-slim-title">Examen</span>
                <span className="aia-telemetry-slim-meta aia-tabular">
                  {attempts.length}/{maxAttempts} intentos
                  {bestQuizPct === 100 ? ' · Dominado' : ''}
                </span>
              </div>
              <span
                className={`aia-telemetry-pill aia-tabular ${
                  bestQuizPct !== null && bestQuizPct >= 80 ? 'high' : 'mid'
                }`}
              >
                {bestQuizPct !== null ? `Mejor ${bestQuizPct}%` : 'Sin intentos'}
              </span>
            </div>
            <div className="aia-progress-track aia-slim-track">
              <div className="aia-progress-fill" style={{ width: `${bestQuizPct ?? 0}%` }} />
            </div>
          </div>
        </div>

        {/* Desglose de calificación por cada Juego Didáctico (solo cuando hay actividad) */}
        {(gamesCompletedCount > 0 || Object.keys(gamesScores).length > 0) && (
          <div className="aia-telemetry-games-breakdown">
            <span className="aia-telemetry-games-label">Juegos:</span>
            <div className="aia-telemetry-games-pills aia-tabular">
              {scoredGameEntries.map((g) => (
                <span
                  key={g.id}
                  className={`aia-telemetry-game-chip ${
                    g.percentage === null ? 'pending' : g.percentage >= 80 ? 'high' : 'warn'
                  }`}
                >
                  <strong>{g.label}:</strong>{' '}
                  {g.score !== null && g.total !== null
                    ? `${g.score}/${g.total} (${g.percentage}%)`
                    : g.done
                      ? 'Realizado ✓'
                      : 'Pendiente'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Alertas accionables */}
        {alerts.length > 0 && (
          <div className="aia-telemetry-alerts" role="status">
            {alerts.map((al) => (
              <span key={al.text} className={`aia-telemetry-alert ${al.tone}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  {al.icon}
                </span>
                <span>{al.text}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* BLOQUE 2: Resultados del examen */}
      <div className="aia-bento-card">
        <div className="aia-bento-header">
          <div>
            <h3 className="aia-bento-title">Resultados del examen</h3>
          </div>

          <div className="aia-header-inline-actions">
            {archivedCount > 0 && (
              <span
                className="aia-telemetry-archive-pill aia-tabular"
                title="Intentos de rondas anteriores guardados como historial"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  history
                </span>
                <span>{archivedCount} archivados</span>
              </span>
            )}
            {attempts.length > 0 && (
              <button
                type="button"
                className="aia-btn-secondary aia-btn-sm"
                onClick={() => setConfirmReset(true)}
                title="Archivar los intentos actuales y devolver todos los intentos al estudiante"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  restart_alt
                </span>
                <span>Reiniciar Intentos</span>
              </button>
            )}
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="aia-empty-attempts">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
              pending_actions
            </span>
            <p>
              El estudiante aún no ha enviado su primer intento en <strong>{pkg.subject}</strong>.
              Cuando lo presente desde su Aula, los resultados aparecerán aquí automáticamente en tiempo real.
            </p>
          </div>
        ) : (
          <>
            {/* Habilidades por reforzar según el último intento */}
            {reinforceList.length > 0 ? (
              <div className="aia-reinforce-strip">
                <span className="aia-reinforce-label">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    flag
                  </span>
                  Por reforzar
                </span>
                <div className="aia-reinforce-chips">
                  {reinforceList.map((r) => (
                    <span key={r.key} className="aia-reinforce-chip">
                      <strong>{r.skill}</strong>
                      {r.failCount > 1 && (
                        <span className="aia-reinforce-count aia-tabular">{r.failCount}×</span>
                      )}
                      {r.ref && <span className="aia-reinforce-ref">{r.ref}</span>}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="aia-reinforce-strip is-clear">
                <span className="aia-reinforce-label">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    verified
                  </span>
                  Sin habilidades pendientes en el último intento
                </span>
              </div>
            )}

            {/* Selector táctil segmentado por intento (solo cuando hay más de 1 intento) */}
            {attempts.length > 1 && (
              <div
                className="aia-attempt-segmented-bar"
                role="tablist"
                aria-label="Seleccionar intento del estudiante"
              >
                <div className="aia-attempt-segmented-meta">
                  <span className="aia-attempt-segmented-label">Intentos</span>
                </div>
                <div className="aia-attempt-segmented-track">
                  {attempts.map((att) => {
                    const isActive = activeAttempt?.attemptNumber === att.attemptNumber;
                    const tone = getScoreTone(att.percentage || 0);
                    return (
                      <button
                        key={att.attemptNumber}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSelectedAttemptNum(att.attemptNumber)}
                        className={`aia-attempt-segment aia-tabular ${isActive ? 'is-active' : ''}`}
                      >
                        <span className={`aia-attempt-dot ${tone}`} aria-hidden="true" />
                        <span className="aia-attempt-seg-title">Intento #{att.attemptNumber}</span>
                        <span className={`aia-attempt-seg-score ${tone}`}>
                          {att.score}/{att.totalQuestions} · {att.percentage}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vista del intento seleccionado */}
            {activeAttempt && (
              <div
                key={`attempt-detail-${activeAttempt.attemptNumber}`}
                className="aia-attempt-detail-panel"
                role="tabpanel"
              >
                <div className="aia-attempt-bento-grid aia-attempt-bento-duo">
                  {/* Resultado del intento */}
                  <div
                    className={`aia-attempt-kpi-card tone-${getScoreTone(activeAttempt.percentage || 0)}`}
                  >
                    <div className="aia-attempt-kpi-head">
                      <span className="aia-attempt-kpi-label">
                        Resultado · Intento #{activeAttempt.attemptNumber}
                      </span>
                      {activeAttemptDelta !== null && (
                        <span
                          className={`aia-attempt-delta-pill aia-tabular ${
                            activeAttemptDelta > 0 ? 'up' : activeAttemptDelta < 0 ? 'down' : 'flat'
                          }`}
                        >
                          {activeAttemptDelta > 0
                            ? `↑ +${activeAttemptDelta}%`
                            : activeAttemptDelta < 0
                              ? `↓ ${activeAttemptDelta}%`
                              : '= 0%'}{' '}
                          vs #{previousAttempt.attemptNumber}
                        </span>
                      )}
                    </div>

                    <div className="aia-attempt-score-row aia-tabular">
                      <strong className="aia-attempt-score-big">{activeAttempt.percentage}%</strong>
                      <span className="aia-attempt-score-frac">
                        {activeAttempt.score} de {activeAttempt.totalQuestions} aciertos
                      </span>
                    </div>

                    <div className="aia-progress-track">
                      <div
                        className={`aia-progress-fill tone-${getScoreTone(activeAttempt.percentage || 0)}`}
                        style={{ width: `${activeAttempt.percentage || 0}%` }}
                      />
                    </div>

                    <div className="aia-attempt-kpi-foot aia-tabular">
                      <span>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          schedule
                        </span>
                        {formatAttemptDate(activeAttempt.timestamp)}
                      </span>
                      <span title="Tiempo aproximado: se registra con un mínimo de 15 s">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          timer
                        </span>
                        ≈ {activeAttempt.durationSec || 60}s
                      </span>
                    </div>
                  </div>

                  {/* Gráfica comparativa interactiva entre intentos */}
                  <div className="aia-attempt-kpi-card">
                    <div className="aia-attempt-kpi-head">
                      <span className="aia-attempt-kpi-label">Comparativa entre intentos</span>
                    </div>

                    <div
                      className="aia-attempt-bar-chart"
                      role="group"
                      aria-label="Gráfica comparativa de puntaje por intento"
                    >
                      {Array.from({ length: Math.max(maxAttempts, attempts.length) }).map(
                        (_, idx) => {
                          const num = idx + 1;
                          const att = attempts.find((a) => a.attemptNumber === num) || null;
                          const isCurrent = activeAttempt?.attemptNumber === num;
                          const pct = att ? att.percentage || 0 : 0;
                          const tone = att ? getScoreTone(pct) : 'empty';

                          return (
                            <button
                              key={num}
                              type="button"
                              disabled={!att}
                              onClick={() => att && setSelectedAttemptNum(num)}
                              className={`aia-chart-col ${isCurrent ? 'is-active' : ''} ${
                                !att ? 'is-empty' : ''
                              }`}
                              title={
                                att
                                  ? `Intento #${num}: ${pct}% (${att.score}/${att.totalQuestions}) — Clic para inspeccionar`
                                  : `Intento #${num}: Pendiente`
                              }
                            >
                              <span className="aia-chart-val aia-tabular">
                                {att ? `${pct}%` : '—'}
                              </span>
                              <div className="aia-chart-track">
                                <div
                                  className={`aia-chart-bar tone-${tone}`}
                                  style={{ height: att ? `${Math.max(8, pct)}%` : '0%' }}
                                />
                              </div>
                              <span className="aia-chart-axis aia-tabular">#{num}</span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                {/* Respuestas del intento: todas compactas por defecto, desplegables en 1 clic */}
                <div className="aia-attempt-q-section">
                  <div className="aia-attempt-q-section-head">
                    <h4 className="aia-matrix-title" style={{ margin: 0 }}>
                      Respuestas del Intento #{activeAttempt.attemptNumber}
                    </h4>
                    <div className="aia-attempt-q-head-actions">
                      <span className="aia-attempt-q-counter aia-tabular">
                        {activeAttempt.score}/{questions.length} correctas
                      </span>
                      {questions.length > 0 && (
                        <button
                          type="button"
                          className="aia-attempt-q-toggle"
                          onClick={() => setShowAllQuestions((v) => !v)}
                          aria-expanded={showAllQuestions}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                            {showAllQuestions ? 'unfold_less' : 'unfold_more'}
                          </span>
                          <span>
                            {showAllQuestions ? 'Compactar respuestas' : 'Ver detalle completo'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="aia-attempt-q-list">
                    {questions.map((q, qIdx) =>
                      showAllQuestions
                        ? renderQuestionFull(q, qIdx)
                        : renderQuestionSlim(q, qIdx)
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmación antes de reiniciar intentos */}
      <ConfirmModal
        isOpen={confirmReset}
        titleId="aia-reset-attempts-title"
        icon="restart_alt"
        title="¿Reiniciar los intentos?"
        cancelLabel="Cancelar"
        confirmLabel={isResetting ? 'Reiniciando...' : 'Reiniciar intentos'}
        confirmIcon="restart_alt"
        confirmVariant="primary"
        confirmDisabled={isResetting}
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleConfirmReset}
      >
        <p>
          Los {attempts.length}{' '}
          {attempts.length === 1 ? 'intento actual' : 'intentos actuales'} de{' '}
          <strong>{pkg.subject}</strong> se guardarán como historial archivado y el estudiante
          volverá a tener sus {maxAttempts} intentos disponibles.
        </p>
      </ConfirmModal>
    </div>
  );
}
