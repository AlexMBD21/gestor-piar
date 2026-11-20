import { useState } from 'react';
import { getPackageGames } from '../../lib/aulaGames';
import { useAulaIa } from '../../context/AulaIaContext';

export default function TeacherTelemetryAnalytics({ pkg, activity }) {
  const { resetAttemptsForPackage } = useAulaIa();
  const attempts = Array.isArray(activity?.attempts) ? activity.attempts : [];
  const questions = Array.isArray(pkg?.quizQuestions) ? pkg.quizQuestions : [];
  const totalSlides = pkg?.slides?.length || 5;
  const gamesList = getPackageGames(pkg);
  const totalGames = gamesList.length || 4;

  const [selectedAttemptNum, setSelectedAttemptNum] = useState(
    () => attempts[attempts.length - 1]?.attemptNumber || 1
  );

  const slidesViewedCount = activity?.slidesViewed?.length || 0;
  const slidesPct = Math.min(100, Math.round((slidesViewedCount / totalSlides) * 100));
  const audioPct = activity?.audioMaxPercent || 0;
  const videoPct = activity?.videoMaxPercent || 0;
  const gamesCompletedCount = (activity?.gamesCompleted || []).filter((id) =>
    gamesList.some((g) => g.id === id)
  ).length;
  const gamesPct = activity?.gamesMaxPercent || 0;

  const activeAttempt =
    attempts.find((a) => a.attemptNumber === selectedAttemptNum) ||
    attempts[attempts.length - 1] ||
    null;

  const firstAttemptPct = attempts[0]?.percentage ?? null;
  const latestAttemptPct = attempts[attempts.length - 1]?.percentage ?? null;
  const netImprovement =
    firstAttemptPct !== null && latestAttemptPct !== null && attempts.length > 1
      ? latestAttemptPct - firstAttemptPct
      : null;

  return (
    <div className="aia-analytics-layout">
      {/* BLOQUE 1: Verificación de Participación Real con Materiales Audiovisuales */}
      <div className="aia-bento-card">
        <div className="aia-bento-header">
          <div>
            <span className="aia-eyebrow">TELEMETRÍA MULTIMODAL EN TIEMPO REAL</span>
            <h3 className="aia-bento-title">
              1. Verificación de Participación con Materiales Audiovisuales
            </h3>
          </div>
          <span className="aia-status-badge ok">Sensores Activos</span>
        </div>

        <div className="aia-telemetry-bento-grid">
          {/* Diapositivas */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box slides">
                <span className="material-symbols-outlined">slideshow</span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${slidesPct >= 80 ? 'high' : 'mid'}`}>
                {slidesPct}% Visto
              </span>
            </div>
            <div className="aia-telemetry-stat-title">Diapositivas Interactivas</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Láminas abiertas: <strong>{slidesViewedCount}/{totalSlides}</strong>
              </span>
              <span>
                Tiempo de lectura: <strong>{activity?.slidesTimeSec || 0}s</strong>
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${slidesPct}%` }} />
            </div>
          </div>

          {/* Lectura en Voz Alta integrada en Diapositivas */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box audio">
                <span className="material-symbols-outlined">volume_up</span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${audioPct >= 80 ? 'high' : 'mid'}`}>
                {audioPct}% Escuchado
              </span>
            </div>
            <div className="aia-telemetry-stat-title">Lectura en Voz Alta (Láminas)</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Activaciones: <strong>{activity?.audioPlayCount || 0} veces</strong>
              </span>
              <span>
                Estado: <strong>{activity?.audioCompleted ? 'Completado ✓' : 'En progreso'}</strong>
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${audioPct}%` }} />
            </div>
          </div>

          {/* Video YouTube */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box video">
                <span className="material-symbols-outlined">smart_display</span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${videoPct >= 80 ? 'high' : 'mid'}`}>
                {videoPct}% Visto
              </span>
            </div>
            <div className="aia-telemetry-stat-title">Video YouTube de Apoyo</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Interacciones: <strong>{activity?.videoPlayCount || 0} veces</strong>
              </span>
              <span>
                Estado: <strong>{activity?.videoCompleted ? 'Confirmado ✓' : 'Pendiente'}</strong>
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${videoPct}%` }} />
            </div>
          </div>

          {/* Juegos Didácticos Interactivos */}
          <div className="aia-telemetry-stat-card">
            <div className="aia-telemetry-stat-top">
              <div className="aia-telemetry-icon-box games">
                <span className="material-symbols-outlined">sports_esports</span>
              </div>
              <span className={`aia-telemetry-pill aia-tabular ${gamesPct >= 80 ? 'high' : 'mid'}`}>
                {gamesPct}% Completado
              </span>
            </div>
            <div className="aia-telemetry-stat-title">Juegos Didácticos IA</div>
            <div className="aia-telemetry-stat-metrics aia-tabular">
              <span>
                Juegos superados: <strong>{gamesCompletedCount}/{totalGames}</strong>
              </span>
              <span>
                Tiempo activo: <strong>{activity?.gamesTimeSec || 0}s</strong>
              </span>
            </div>
            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${gamesPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE 2: Evolución de Intentos en el Examen Final y Dónde Falló */}
      <div className="aia-bento-card">
        <div className="aia-bento-header">
          <div>
            <span className="aia-eyebrow">TRAZABILIDAD DE EVALUACIÓN ADAPTATIVA</span>
            <h3 className="aia-bento-title">
              2. Análisis de Intentos, Fallos por Micro-Habilidad y Curva de Mejora
            </h3>
          </div>

          <div className="aia-header-inline-actions">
            {netImprovement !== null && (
              <span className="aia-improvement-banner-pill aia-tabular">
                Evolución neta: {netImprovement >= 0 ? `+${netImprovement}%` : `${netImprovement}%`} entre
                1° y último intento
              </span>
            )}
            {attempts.length > 0 && (
              <button
                type="button"
                className="aia-btn-secondary aia-btn-sm"
                onClick={() => resetAttemptsForPackage(pkg.id)}
                title="Reiniciar contador de intentos para este estudiante"
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
              El estudiante aún no ha enviado su primer intento del examen. Puedes probarlo tú mismo en la pestaña{' '}
              <strong>&ldquo;👁️ Ver como Estudiante&rdquo;</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* Selector de intentos */}
            <div className="aia-attempts-selector-bar">
              <span className="aia-attempts-selector-label">
                Selecciona un intento para inspeccionar su detalle:
              </span>
              <div className="aia-attempts-pills">
                {attempts.map((att) => (
                  <button
                    key={att.attemptNumber}
                    type="button"
                    onClick={() => setSelectedAttemptNum(att.attemptNumber)}
                    className={`aia-attempt-pill aia-tabular ${
                      activeAttempt?.attemptNumber === att.attemptNumber ? 'active' : ''
                    }`}
                  >
                    <span>Intento #{att.attemptNumber}</span>
                    <strong>
                      {att.score}/{att.totalQuestions} ({att.percentage}%)
                    </strong>
                  </button>
                ))}
              </div>
            </div>

            {/* Detalle del intento seleccionado cruzado con telemetría */}
            {activeAttempt && (
              <div className="aia-attempt-inspector">
                <div className="aia-inspector-col">
                  <span className="aia-inspector-label">Puntaje en Intento #{activeAttempt.attemptNumber}</span>
                  <strong className="aia-inspector-big aia-tabular">
                    {activeAttempt.percentage}% ({activeAttempt.score} de {activeAttempt.totalQuestions})
                  </strong>
                  <span className="aia-inspector-sub aia-tabular">
                    Tiempo empleado en examen: {activeAttempt.durationSec || 60}s
                  </span>
                </div>

                <div className="aia-inspector-col">
                  <span className="aia-inspector-label">
                    Consumo Audiovisual al momento de este intento
                  </span>
                  <div className="aia-inspector-snapshot aia-tabular">
                    <span>📊 Slides: {activeAttempt.mediaSnapshot?.slidesPercent ?? 0}%</span>
                    <span>
                      🎧 Audio: {activeAttempt.mediaSnapshot?.audioPercent ?? 0}% (
                      {activeAttempt.mediaSnapshot?.audioPlayCount ?? 0} Play)
                    </span>
                    <span>
                      🎬 Video: {activeAttempt.mediaSnapshot?.videoPercent ?? 0}% (
                      {activeAttempt.mediaSnapshot?.videoPlayCount ?? 0} Play)
                    </span>
                    <span>🎮 Juegos: {activeAttempt.mediaSnapshot?.gamesPercent ?? 0}%</span>
                  </div>
                  <span className="aia-inspector-sub">
                    {(activeAttempt.mediaSnapshot?.videoPercent || 0) < 30 &&
                    (activeAttempt.mediaSnapshot?.audioPercent || 0) < 30
                      ? '⚠️ Presentó este intento con baja interacción audiovisual previa.'
                      : '✓ Interactuó con el material audiovisual antes de presentar este intento.'}
                  </span>
                </div>

                <div className="aia-inspector-col">
                  <span className="aia-inspector-label">Dónde falló en este intento</span>
                  {activeAttempt.failedSkills?.length === 0 ? (
                    <span className="aia-inspector-ok">
                      ✓ Ningún fallo · Dominó las {activeAttempt.totalQuestions} habilidades evaluadas.
                    </span>
                  ) : (
                    <ul className="aia-failed-skills-list">
                      {activeAttempt.failedSkills.map((sk, i) => (
                        <li key={i}>✗ {sk}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Matriz comparativa pregunta por pregunta a través de todos los intentos */}
            <div className="aia-matrix-wrapper">
              <h4 className="aia-matrix-title">
                Matriz de Superación de Carencias por Pregunta y Habilidad
              </h4>
              <table className="aia-matrix-table">
                <thead>
                  <tr>
                    <th>Pregunta / Micro-Habilidad Evaluada</th>
                    {attempts.map((att) => (
                      <th key={att.attemptNumber} className="aia-tabular">
                        Intento #{att.attemptNumber} ({att.percentage}%)
                      </th>
                    ))}
                    <th className="aia-tabular">Veces que falló</th>
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
                            <td key={att.attemptNumber} className="aia-tabular">
                              <span className={`aia-matrix-cell-badge ${passed ? 'pass' : 'fail'}`}>
                                {passed ? '✓ Acertó' : '✗ Falló'}
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
                              {failCount > 0 ? 'Superado tras refuerzo ↑' : 'Dominado desde el 1° ✓'}
                            </span>
                          ) : (
                            <span className="aia-mastery-tag pending">Requiere refuerzo adicional</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

