import { useState, useEffect } from 'react';
import { getPackageGames, GAME_TYPES } from '../../lib/aulaGames';
import { useAulaIa } from '../../context/AulaIaContext';

export default function TeacherTelemetryAnalytics({ pkg, activity, studentPiar }) {
  const { resetAttemptsForPackage } = useAulaIa();
  const attempts = Array.isArray(activity?.attempts) ? activity.attempts : [];
  const questions = Array.isArray(pkg?.quizQuestions) ? pkg.quizQuestions : [];
  const totalSlides = pkg?.slides?.length || 5;
  const maxAttempts = pkg?.maxAttempts || 3;
  const gamesList = getPackageGames(pkg);
  const totalGames = gamesList.length || 4;

  const latestAttemptNumber = attempts[attempts.length - 1]?.attemptNumber || 1;
  const [selectedAttemptNum, setSelectedAttemptNum] = useState(latestAttemptNumber);

  // Cuando cambia de materia o llega un nuevo intento en tiempo real, enfocar el más reciente
  useEffect(() => {
    setSelectedAttemptNum(latestAttemptNumber);
  }, [pkg?.id, latestAttemptNumber]);

  if (!pkg) return null;

  const slidesViewedCount = activity?.slidesViewed?.length || 0;
  const slidesPct = Math.min(100, Math.round((slidesViewedCount / totalSlides) * 100));
  const videoPct = activity?.videoMaxPercent || 0;
  const videoDone = Boolean(activity?.videoCompleted || videoPct >= 90);
  const gamesCompletedCount = (activity?.gamesCompleted || []).filter((id) =>
    gamesList.some((g) => g.id === id)
  ).length;
  const gamesPct = Math.min(100, Math.round((gamesCompletedCount / totalGames) * 100));
  const gamesScores = activity?.gamesScores || {};
  const scoredGameEntries = gamesList
    .map((g) => {
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
  const gamesWithPct = scoredGameEntries.filter((e) => e.percentage !== null);
  const avgGamesScorePct =
    gamesWithPct.length > 0
      ? Math.round(gamesWithPct.reduce((acc, e) => acc + e.percentage, 0) / gamesWithPct.length)
      : null;
  const bestQuizPct =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : null;

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

  const getScoreTone = (pct) => {
    if (pct >= 80) return 'high';
    if (pct >= 50) return 'mid';
    return 'low';
  };

  const firstAttemptPct = attempts[0]?.percentage ?? null;
  const latestAttemptPct = attempts[attempts.length - 1]?.percentage ?? null;
  const netImprovement =
    firstAttemptPct !== null && latestAttemptPct !== null && attempts.length > 1
      ? latestAttemptPct - firstAttemptPct
      : null;

  const lastInteractionLabel = activity?.lastInteractionAt
    ? new Date(activity.lastInteractionAt).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Sin actividad registrada aún';

  return (
    <div className="aia-analytics-layout">
      {/* Banner de Contexto Claro: qué asignatura y tema se está analizando */}
      <div className="aia-bento-card aia-telemetry-context-card">
        <div className="aia-telemetry-context-top">
          <div className="aia-telemetry-context-badges">
            <span className="aia-subject-tag">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                menu_book
              </span>
              <span>{pkg.subject}</span>
            </span>
            <span className={`aia-status-badge ${pkg.status === 'published' ? 'ok' : 'warn'}`}>
              {pkg.status === 'published' ? 'Publicado al estudiante' : 'En borrador'}
            </span>
          </div>

          <span className="aia-telemetry-last-seen aia-tabular">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              schedule
            </span>
            <span>Última actividad: {lastInteractionLabel}</span>
          </span>
        </div>

        <h3 className="aia-telemetry-context-topic">{pkg.topic}</h3>

        {/* 4 Tarjetas alineadas 100% a los 4 pasos reales del estudiante */}
        <div className="aia-telemetry-bento-grid">
          {/* Paso 01: Diapositivas */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box slides">
                <span className="material-symbols-outlined">slideshow</span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${slidesPct >= 80 ? 'high' : 'mid'}`}>
                {slidesPct}% Visto
              </span>
            </div>
            <div className="aia-telemetry-stat-title">1. Diapositivas Interactivas</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Láminas abiertas: <strong>{slidesViewedCount}/{totalSlides}</strong>
              </span>
              <span>
                Lectura: <strong>{activity?.slidesTimeSec || 0}s</strong>
                {(activity?.audioPlayCount || 0) > 0
                  ? ` · Voz: ${activity.audioPlayCount}x`
                  : ''}
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${slidesPct}%` }} />
            </div>
          </div>

          {/* Paso 02: Video YouTube */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box video">
                <span className="material-symbols-outlined">smart_display</span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${videoDone ? 'high' : 'mid'}`}>
                {videoDone ? 'Confirmado ✓' : 'Pendiente'}
              </span>
            </div>
            <div className="aia-telemetry-stat-title">2. Video YouTube de Apoyo</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Estado: <strong>{videoDone ? 'Visto por el alumno' : 'Sin confirmar'}</strong>
              </span>
              <span>
                Interacciones: <strong>{activity?.videoPlayCount || 0}</strong>
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${videoDone ? 100 : videoPct}%` }} />
            </div>
          </div>

          {/* Paso 03: Juegos Didácticos */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box games">
                <span className="material-symbols-outlined">sports_esports</span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${gamesPct >= 80 ? 'high' : 'mid'}`}>
                {gamesPct}% Listo
              </span>
            </div>
            <div className="aia-telemetry-stat-title">3. Juegos Didácticos IA</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Realizados: <strong>{gamesCompletedCount}/{totalGames}</strong>
              </span>
              <span>
                {avgGamesScorePct !== null
                  ? `Calificación: ${avgGamesScorePct}%`
                  : `Tiempo: ${activity?.gamesTimeSec || 0}s`}
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${gamesPct}%` }} />
            </div>
          </div>

          {/* Paso 04: Examen de Refuerzo */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box audio">
                <span className="material-symbols-outlined">quiz</span>
              </div>
              <span
                className={`aia-telemetry-pill aia-tabular ${
                  bestQuizPct !== null && bestQuizPct >= 80 ? 'high' : 'mid'
                }`}
              >
                {bestQuizPct !== null ? `Mejor: ${bestQuizPct}%` : 'Sin intentos'}
              </span>
            </div>
            <div className="aia-telemetry-stat-title">4. Examen de Refuerzo</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Intentos: <strong>{attempts.length}/{maxAttempts}</strong>
              </span>
              <span>
                {netImprovement !== null
                  ? `Mejora: ${netImprovement >= 0 ? `+${netImprovement}%` : `${netImprovement}%`}`
                  : bestQuizPct === 100
                    ? '¡Dominado!'
                    : 'En seguimiento'}
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${bestQuizPct ?? 0}%` }} />
            </div>
          </div>
        </div>

        {/* Desglose de calificación por cada Juego Didáctico (visible solo para el profesor) */}
        <div className="aia-telemetry-games-breakdown">
          <span className="aia-telemetry-games-label">
            Desempeño por Juego Didáctico:
          </span>
          <div className="aia-telemetry-games-pills aia-tabular">
            {scoredGameEntries.map((g) => (
              <span
                key={g.id}
                className={`aia-telemetry-game-chip ${
                  g.percentage === null
                    ? 'pending'
                    : g.percentage >= 80
                      ? 'high'
                      : 'warn'
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
      </div>

      {/* BLOQUE 2: Análisis de Intentos y Debilidades por Micro-Habilidad */}
      <div className="aia-bento-card">
        <div className="aia-bento-header">
          <div>
            <span className="aia-eyebrow">EVALUACIÓN DE {pkg.subject.toUpperCase()}</span>
            <h3 className="aia-bento-title">
              Análisis de Intentos, Debilidades por Micro-Habilidad y Evolución
            </h3>
          </div>

          <div className="aia-header-inline-actions">
            {netImprovement !== null && (
              <span className="aia-improvement-banner-pill aia-tabular">
                Evolución: {netImprovement >= 0 ? `+${netImprovement}%` : `${netImprovement}%`}
              </span>
            )}
            {attempts.length > 0 && (
              <button
                type="button"
                className="aia-btn-secondary aia-btn-sm"
                onClick={() => resetAttemptsForPackage(pkg.id, studentPiar)}
                title="Reiniciar contador de intentos a 0 para este estudiante"
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
            {/* Selector táctil segmentado por intento (Intento #1, #2, #3...) */}
            <div className="aia-attempt-segmented-bar" role="tablist" aria-label="Seleccionar intento del estudiante">
              <div className="aia-attempt-segmented-meta">
                <span className="aia-attempt-segmented-label">
                  Inspeccionar intento
                </span>
                <span className="aia-attempt-segmented-hint">
                  Haz clic en cada intento para ver sus respuestas exactas y contexto
                </span>
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

            {/* Vista completa del intento seleccionado con micro-transición */}
            {activeAttempt && (
              <div
                key={`attempt-detail-${activeAttempt.attemptNumber}`}
                className="aia-attempt-detail-panel"
                role="tabpanel"
              >
                {/* Bento de 3 tarjetas resumen del Intento #N */}
                <div className="aia-attempt-bento-grid">
                  {/* Card 1: Resultado y tiempo */}
                  <div className={`aia-attempt-kpi-card tone-${getScoreTone(activeAttempt.percentage || 0)}`}>
                    <div className="aia-attempt-kpi-head">
                      <span className="aia-attempt-kpi-label">
                        Resultado · Intento #{activeAttempt.attemptNumber}
                      </span>
                      {activeAttemptDelta !== null && (
                        <span
                          className={`aia-attempt-delta-pill aia-tabular ${
                            activeAttemptDelta > 0
                              ? 'up'
                              : activeAttemptDelta < 0
                                ? 'down'
                                : 'flat'
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
                      <strong className="aia-attempt-score-big">
                        {activeAttempt.percentage}%
                      </strong>
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
                      <span>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          timer
                        </span>
                        {activeAttempt.durationSec || 60}s
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Preparación previa al intento */}
                  <div className="aia-attempt-kpi-card">
                    <div className="aia-attempt-kpi-head">
                      <span className="aia-attempt-kpi-label">
                        Preparación previa al Intento #{activeAttempt.attemptNumber}
                      </span>
                    </div>

                    <div className="aia-attempt-prep-list aia-tabular">
                      {[
                        {
                          icon: 'slideshow',
                          label: 'Diapositivas',
                          pct: activeAttempt.mediaSnapshot?.slidesPercent ?? 0
                        },
                        {
                          icon: 'smart_display',
                          label: 'Video YouTube',
                          pct: activeAttempt.mediaSnapshot?.videoPercent ?? 0
                        },
                        {
                          icon: 'sports_esports',
                          label: 'Juegos IA',
                          pct: activeAttempt.mediaSnapshot?.gamesPercent ?? 0
                        }
                      ].map((item) => (
                        <div key={item.label} className="aia-attempt-prep-row">
                          <span className="aia-attempt-prep-name">
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                              {item.icon}
                            </span>
                            {item.label}
                          </span>
                          <div className="aia-attempt-prep-bar">
                            <div style={{ width: `${Math.min(100, item.pct)}%` }} />
                          </div>
                          <strong>{item.pct}%</strong>
                        </div>
                      ))}
                    </div>

                    <div className="aia-attempt-prep-note">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {(activeAttempt.mediaSnapshot?.slidesPercent || 0) < 40 &&
                        (activeAttempt.mediaSnapshot?.videoPercent || 0) < 40
                          ? 'warning'
                          : 'verified'}
                      </span>
                      <span>
                        {(activeAttempt.mediaSnapshot?.slidesPercent || 0) < 40 &&
                        (activeAttempt.mediaSnapshot?.videoPercent || 0) < 40
                          ? 'Presentó este intento con poca exploración previa del material.'
                          : 'Exploró el material de apoyo antes de responder este intento.'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Balance y micro-habilidades a reforzar */}
                  <div className="aia-attempt-kpi-card">
                    <div className="aia-attempt-kpi-head">
                      <span className="aia-attempt-kpi-label">
                        Micro-habilidades · Intento #{activeAttempt.attemptNumber}
                      </span>
                    </div>

                    <div className="aia-attempt-balance-chips aia-tabular">
                      <span className="aia-balance-chip pass">
                        ✓ {activeAttempt.score} acertadas
                      </span>
                      <span className="aia-balance-chip fail">
                        ✕ {Math.max(0, activeAttempt.totalQuestions - activeAttempt.score)} falladas
                      </span>
                    </div>

                    {activeAttempt.failedSkills?.length === 0 ? (
                      <div className="aia-attempt-mastered-box">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          workspace_premium
                        </span>
                        <span>
                          Dominó todas las habilidades evaluadas en este intento.
                        </span>
                      </div>
                    ) : (
                      <div className="aia-attempt-skills-tags">
                        {(activeAttempt.failedSkills || []).map((sk, i) => (
                          <span key={i} className="aia-attempt-skill-pill">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desglose completo pregunta por pregunta del Intento #N */}
                <div className="aia-attempt-q-section">
                  <div className="aia-attempt-q-section-head">
                    <h4 className="aia-matrix-title" style={{ margin: 0 }}>
                      Respuestas del Estudiante en el Intento #{activeAttempt.attemptNumber}
                    </h4>
                    <span className="aia-attempt-q-counter aia-tabular">
                      {activeAttempt.score}/{questions.length} correctas
                    </span>
                  </div>

                  <div className="aia-attempt-q-list">
                    {questions.map((q, qIdx) => {
                      const chosenIdx = activeAttempt.answers?.[qIdx];
                      const hasChosen = typeof chosenIdx === 'number' && chosenIdx >= 0;
                      const isCorrect = hasChosen && chosenIdx === q.correctIndex;
                      const prevFailed =
                        previousAttempt &&
                        previousAttempt.answers?.[qIdx] !== q.correctIndex;
                      const recoveredNow = isCorrect && prevFailed;
                      const chosenLetter = hasChosen ? String.fromCharCode(65 + chosenIdx) : '—';
                      const chosenText = hasChosen
                        ? q.options?.[chosenIdx] || `Opción ${chosenLetter}`
                        : 'Sin respuesta registrada';
                      const correctLetter = String.fromCharCode(65 + (q.correctIndex ?? 0));
                      const correctText =
                        q.options?.[q.correctIndex] || `Opción ${correctLetter}`;

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
                              <span
                                className={`aia-matrix-cell-badge ${isCorrect ? 'pass' : 'fail'}`}
                              >
                                {isCorrect ? '✓ Acertó' : '✕ Falló'}
                              </span>
                            </div>
                          </div>

                          <p className="aia-attempt-q-prompt">{q.question}</p>

                          <div className="aia-attempt-answer-grid">
                            <div
                              className={`aia-attempt-answer-box ${
                                isCorrect ? 'chosen-pass' : 'chosen-fail'
                              }`}
                            >
                              <span className="aia-attempt-answer-label">
                                Respondió el estudiante
                              </span>
                              <div className="aia-attempt-answer-value">
                                <span className="aia-attempt-opt-letter">{chosenLetter}</span>
                                <span>{chosenText}</span>
                              </div>
                            </div>

                            {!isCorrect && (
                              <div className="aia-attempt-answer-box expected-pass">
                                <span className="aia-attempt-answer-label">
                                  Respuesta correcta
                                </span>
                                <div className="aia-attempt-answer-value">
                                  <span className="aia-attempt-opt-letter">{correctLetter}</span>
                                  <span>{correctText}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {!isCorrect && q.remediationResource && (
                            <div className="aia-attempt-q-remediation">
                              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                menu_book
                              </span>
                              <span>
                                Refuerzo sugerido: <strong>{q.remediationResource}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Matriz comparativa pregunta por pregunta (solo si hay 2+ intentos para comparar evolución) */}
            {attempts.length > 1 && (
              <div className="aia-matrix-wrapper">
                <h4 className="aia-matrix-title">
                  Evolución Comparativa entre Intentos · {pkg.subject}
                </h4>
                <table className="aia-matrix-table">
                  <thead>
                    <tr>
                      <th>Pregunta / Micro-Habilidad Evaluada</th>
                      {attempts.map((att) => (
                        <th
                          key={att.attemptNumber}
                          className={`aia-tabular ${
                            activeAttempt?.attemptNumber === att.attemptNumber
                              ? 'is-selected-col'
                              : ''
                          }`}
                        >
                          Intento #{att.attemptNumber} ({att.percentage}%)
                        </th>
                      ))}
                      <th className="aia-tabular">Fallos</th>
                      <th>Estado Pedagógico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, qIdx) => {
                      let failCount = 0;
                      attempts.forEach((att) => {
                        const passed = att.answers?.[qIdx] === q.correctIndex;
                        if (!passed) failCount += 1;
                      });
                      const lastAttempt = attempts[attempts.length - 1];
                      const masteredLatest = lastAttempt?.answers?.[qIdx] === q.correctIndex;

                      return (
                        <tr key={q.id || qIdx}>
                          <td>
                            <strong>P{qIdx + 1}:</strong> {q.skillTag}
                          </td>
                          {attempts.map((att) => {
                            const passed = att.answers?.[qIdx] === q.correctIndex;
                            return (
                              <td
                                key={att.attemptNumber}
                                className={`aia-tabular ${
                                  activeAttempt?.attemptNumber === att.attemptNumber
                                    ? 'is-selected-col'
                                    : ''
                                }`}
                              >
                                <span
                                  className={`aia-matrix-cell-badge ${passed ? 'pass' : 'fail'}`}
                                >
                                  {passed ? '✓ Acertó' : '✕ Falló'}
                                </span>
                              </td>
                            );
                          })}
                          <td className="aia-tabular">
                            <strong>{failCount}</strong> {failCount === 1 ? 'vez' : 'veces'}
                          </td>
                          <td>
                            {masteredLatest ? (
                              <span className="aia-mastery-tag ok">
                                {failCount > 0
                                  ? 'Superado tras refuerzo ↑'
                                  : 'Dominado desde el 1° ✓'}
                              </span>
                            ) : (
                              <span className="aia-mastery-tag pending">
                                Requiere refuerzo adicional
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
