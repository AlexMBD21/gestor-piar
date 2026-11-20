import { useState, useRef } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';

function parseTargetSlideIndex(remediationRef, fallbackIdx, totalSlides) {
  const safeTotal = Math.max(1, totalSlides || 5);
  const match = String(remediationRef || '').match(/diapositivas?\s*(\d+)/i);
  if (match?.[1]) {
    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      return Math.min(parsed - 1, safeTotal - 1);
    }
  }
  return fallbackIdx % safeTotal;
}

export default function AdaptiveQuizMultiAttempt({ pkg, activity, onNavigateToMedia }) {
  const { submitQuizAttempt } = useAulaIa();
  const questions = Array.isArray(pkg?.quizQuestions) ? pkg.quizQuestions : [];
  const attempts = Array.isArray(activity?.attempts) ? activity.attempts : [];
  const maxAttempts = pkg?.maxAttempts || 3;

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [lastSubmittedAttempt, setLastSubmittedAttempt] = useState(
    () => attempts[attempts.length - 1] || null
  );
  const [isTakingNewAttempt, setIsTakingNewAttempt] = useState(() => attempts.length === 0);
  const startTimeRef = useRef(Date.now());

  if (questions.length === 0) return null;

  const bestScorePct =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;
  const attemptsUsed = attempts.length;
  const canRetry = attemptsUsed < maxAttempts || bestScorePct < 100;

  const handleSelectOption = (qIdx, optIdx) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleStartNewAttempt = () => {
    setSelectedAnswers({});
    startTimeRef.current = Date.now();
    setIsTakingNewAttempt(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const durationSec = Math.max(
      15,
      Math.round((Date.now() - startTimeRef.current) / 1000)
    );
    const createdAttempt = submitQuizAttempt(pkg, selectedAnswers, durationSec);
    if (createdAttempt) {
      setLastSubmittedAttempt(createdAttempt);
      setIsTakingNewAttempt(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === questions.length;
  const displayedAttempt = lastSubmittedAttempt || attempts[attempts.length - 1];

  return (
    <div className="aia-media-surface">
      {/* Cabecera de intentos y mejor puntaje */}
      <div className="aia-media-header">
        <div className="aia-media-title-group">
          <span className="aia-step-pill">Examen Final de Refuerzo</span>
          <span className="aia-badge-soft aia-tabular">
            Intentos realizados: {attemptsUsed} de {maxAttempts}
          </span>
        </div>

        <div className="aia-telemetry-chip">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            emoji_events
          </span>
          <span className="aia-tabular">Mejor logro: {bestScorePct}%</span>
        </div>
      </div>

      {/* Historial compacto de intentos previos del estudiante */}
      {attempts.length > 0 && (
        <div className="aia-attempts-strip">
          <span className="aia-attempts-strip-label">Tu progreso por intento:</span>
          <div className="aia-attempts-pills">
            {attempts.map((att, idx) => {
              const prevPct = idx > 0 ? attempts[idx - 1].percentage : null;
              const improved = prevPct !== null && att.percentage > prevPct;
              return (
                <button
                  key={att.attemptNumber}
                  type="button"
                  onClick={() => {
                    setLastSubmittedAttempt(att);
                    setIsTakingNewAttempt(false);
                  }}
                  className={`aia-attempt-pill aia-tabular ${
                    !isTakingNewAttempt && displayedAttempt?.attemptNumber === att.attemptNumber
                      ? 'active'
                      : ''
                  }`}
                >
                  <span>Intento {att.attemptNumber}:</span>
                  <strong>{att.percentage}%</strong>
                  {improved && (
                    <span className="aia-improvement-tag">
                      +{att.percentage - prevPct}% ↑
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!isTakingNewAttempt && canRetry && (
            <button
              type="button"
              className="aia-btn-primary aia-btn-sm"
              onClick={handleStartNewAttempt}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                refresh
              </span>
              <span>Realizar Intento #{attemptsUsed + 1}</span>
            </button>
          )}
        </div>
      )}

      {/* Modo 1: Estudiante respondiendo un intento activo */}
      {isTakingNewAttempt ? (
        <form onSubmit={handleSubmit} className="aia-quiz-form">
          <div className="aia-quiz-intro-banner">
            <div>
              <strong>
                Estás presentando tu Intento #{attemptsUsed + 1}
              </strong>
              <p>
                Lee cada pregunta con calma y tómate tu tiempo para elegir la mejor respuesta.
              </p>
            </div>
            <span className="aia-tabular aia-quiz-progress-badge">
              {answeredCount}/{questions.length} respondidas
            </span>
          </div>

          <div className="aia-questions-stack">
            {questions.map((q, qIdx) => {
              const chosenIdx = selectedAnswers[qIdx];
              return (
                <div key={q.id || qIdx} className="aia-question-card">
                  <div className="aia-question-card-top">
                    <div className="aia-question-meta">
                      <span className="aia-question-num aia-tabular">P{qIdx + 1}</span>
                      <span className="aia-question-skill">{q.skillTag}</span>
                    </div>
                  </div>

                  <p className="aia-question-text">{q.question}</p>

                  <div className="aia-options-grid">
                    {(q.options || []).map((optText, optIdx) => {
                      const isSelected = chosenIdx === optIdx;
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(qIdx, optIdx)}
                          className={`aia-option-btn ${isSelected ? 'selected' : ''}`}
                        >
                          <span className="aia-option-letter">{letter}</span>
                          <span className="aia-option-label">{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="aia-slide-footer">
            <span className="aia-slide-counter">
              {allAnswered
                ? '✓ Todas las preguntas respondidas. ¡Listo para calificar!'
                : `Responde las ${questions.length - answeredCount} preguntas restantes para finalizar.`}
            </span>
            <button
              type="submit"
              className="aia-btn-primary"
              disabled={!allAnswered}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                send
              </span>
              <span>Finalizar y Calificar Intento #{attemptsUsed + 1}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Modo 2: Revisión Formativa del Intento Seleccionado */
        displayedAttempt && (
          <div className="aia-attempt-review">
            <div className="aia-attempt-summary-card">
              <div className="aia-attempt-score-circle aia-tabular">
                <strong>{displayedAttempt.percentage}%</strong>
                <span>
                  {displayedAttempt.score}/{displayedAttempt.totalQuestions} aciertos
                </span>
              </div>

              <div className="aia-attempt-summary-info">
                <h4>
                  Resultado del Intento #{displayedAttempt.attemptNumber}:{' '}
                  {displayedAttempt.percentage === 100
                    ? '¡Dominio Completo Logrado! 🌟'
                    : displayedAttempt.percentage >= 60
                      ? '¡Muy buen avance! Revisa las pistas para llegar al 100%'
                      : 'Buen punto de partida · Repasemos juntos dónde mejorar'}
                </h4>
                <p>
                  En este intento tu participación previa con el material era:{' '}
                  <strong>
                    Diapositivas {displayedAttempt.mediaSnapshot?.slidesPercent || 0}%
                  </strong>{' '}
                  ·{' '}
                  <strong>
                    Audio {displayedAttempt.mediaSnapshot?.audioPercent || 0}%
                  </strong>{' '}
                  ·{' '}
                  <strong>
                    Video {displayedAttempt.mediaSnapshot?.videoPercent || 0}%
                  </strong>
                  .
                </p>
              </div>

              <div className="aia-attempt-summary-actions">
                <button
                  type="button"
                  className="aia-btn-primary"
                  onClick={handleStartNewAttempt}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    replay
                  </span>
                  <span>Intentar de Nuevo (Intento #{attemptsUsed + 1})</span>
                </button>
              </div>
            </div>

            {/* Desglose pregunta por pregunta con pistas de andamiaje */}
            <div className="aia-questions-stack">
              {questions.map((q, qIdx) => {
                const studentChoice = displayedAttempt.answers?.[qIdx];
                const isCorrect = studentChoice === q.correctIndex;
                return (
                  <div
                    key={q.id || qIdx}
                    className={`aia-question-card ${isCorrect ? 'review-correct' : 'review-failed'}`}
                  >
                    <div className="aia-question-card-top">
                      <div className="aia-question-meta">
                        <span className="aia-question-num aia-tabular">P{qIdx + 1}</span>
                        <span className="aia-question-skill">{q.skillTag}</span>
                      </div>
                      <span className={`aia-review-status ${isCorrect ? 'ok' : 'fail'}`}>
                        {isCorrect ? '✓ Acertada' : '✗ Para reforzar'}
                      </span>
                    </div>

                    <p className="aia-question-text">{q.question}</p>

                    <div className="aia-review-feedback-box">
                      {isCorrect ? (
                        <p className="aia-review-ok-text">
                          <strong>¡Excelente!</strong> {q.explanation}
                        </p>
                      ) : (
                        <div className="aia-review-hint-content">
                          <p>
                            <strong>💡 Pista de Andamiaje para tu siguiente intento:</strong>{' '}
                            {q.hint}
                          </p>
                          <div className="aia-remediation-row">
                            <span>Recurso recomendado: {q.remediationRef}</span>
                            {onNavigateToMedia && (
                              <div className="aia-remediation-btns">
                                {(() => {
                                  const targetSlideIdx = parseTargetSlideIndex(
                                    q.remediationRef,
                                    qIdx,
                                    pkg?.slides?.length || 5
                                  );
                                  return (
                                    <button
                                      type="button"
                                      className="aia-link-pill"
                                      onClick={() =>
                                        onNavigateToMedia('slides', {
                                          slideIndex: targetSlideIdx,
                                          skillTag: q.skillTag,
                                          hint: q.hint,
                                          question: q.question,
                                          remediationRef: q.remediationRef
                                        })
                                      }
                                    >
                                      📊 Repasar Lámina {targetSlideIdx + 1}
                                    </button>
                                  );
                                })()}
                                <button
                                  type="button"
                                  className="aia-link-pill"
                                  onClick={() => onNavigateToMedia('video')}
                                >
                                  🎬 Ver Video YouTube
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}

