import { useState, useRef, useEffect } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';
import { speakTextSequence, stopSpeaking } from '../../lib/speechHelper';

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

export default function AdaptiveQuizMultiAttempt({
  pkg,
  activity,
  isMirrorPreview = false,
  onNavigateToMedia
}) {
  const { submitQuizAttempt } = useAulaIa();
  const questions = Array.isArray(pkg?.quizQuestions) ? pkg.quizQuestions : [];
  const attempts = isMirrorPreview ? [] : Array.isArray(activity?.attempts) ? activity.attempts : [];
  const maxAttempts = pkg?.maxAttempts || 3;

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [lastSubmittedAttempt, setLastSubmittedAttempt] = useState(
    () => attempts[attempts.length - 1] || null
  );
  const [isTakingNewAttempt, setIsTakingNewAttempt] = useState(() => attempts.length === 0);
  const startTimeRef = useRef(Date.now());

  const stopSpeech = () => {
    stopSpeaking();
    setIsSpeakingQuestion(false);
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  if (questions.length === 0) return null;

  const bestScorePct =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;
  const attemptsUsed = attempts.length;
  const remainingAttempts = Math.max(0, maxAttempts - attemptsUsed);
  const hasMastered = bestScorePct === 100;
  const canRetry = remainingAttempts > 0 && !hasMastered;

  const safeQIdx = Math.min(Math.max(0, currentQIdx), questions.length - 1);
  const currentQuestion = questions[safeQIdx];

  const handleSelectOption = (qIdx, optIdx) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleJumpQuestion = (idx) => {
    if (idx < 0 || idx >= questions.length) return;
    stopSpeech();
    setCurrentQIdx(idx);
  };

  const handleStartNewAttempt = () => {
    if (!canRetry) return;
    stopSpeech();
    setSelectedAnswers({});
    setCurrentQIdx(0);
    startTimeRef.current = Date.now();
    setIsTakingNewAttempt(true);
  };

  const handleToggleSpeakQuestion = () => {
    if (!currentQuestion) return;
    if (isSpeakingQuestion) {
      stopSpeech();
      return;
    }

    const optsParts = (currentQuestion.options || []).map(
      (opt, idx) => `Opción ${String.fromCharCode(65 + idx)}: ${opt}`
    );
    speakTextSequence([`Pregunta ${safeQIdx + 1}`, currentQuestion.question, ...optsParts], {
      rate: 0.96,
      onStart: () => setIsSpeakingQuestion(true),
      onEnd: () => setIsSpeakingQuestion(false),
      onError: () => setIsSpeakingQuestion(false)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isMirrorPreview) return;
    stopSpeech();
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
  const progressPct = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="aia-media-surface">
      {/* Cabecera de intentos y mejor puntaje (o modo vista previa no evaluativo para el docente) */}
      <div className="aia-media-header">
        <div className="aia-media-title-group">
          <span className="aia-step-pill">PASO 04 · Mi Examen de Refuerzo</span>
          {isMirrorPreview ? (
            <span className="aia-badge-soft aia-tabular">
              Vista previa · {questions.length} preguntas ({maxAttempts} intentos)
            </span>
          ) : (
            <span className="aia-badge-soft aia-tabular">
              Intentos: {attemptsUsed} de {maxAttempts}
            </span>
          )}
        </div>

        {isMirrorPreview ? (
          <div className="aia-telemetry-chip">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              visibility
            </span>
            <span>Solo vista de recursos</span>
          </div>
        ) : (
          <div className="aia-telemetry-chip">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              emoji_events
            </span>
            <span className="aia-tabular">Mejor logro: {bestScorePct}%</span>
          </div>
        )}
      </div>

      {/* Modo 1: Estudiante respondiendo 1 pregunta a la vez (o docente revisando preguntas en modo vista previa) */}
      {(isTakingNewAttempt || isMirrorPreview) && currentQuestion ? (
        <form onSubmit={handleSubmit} className="aia-quiz-form aia-quiz-fixed-shell">
          <div className="aia-stage-scroll-body aia-quiz-scroll-inner">
            <div className="aia-quiz-stepper-top">
            <div className="aia-quiz-stepper-info">
              <strong>
                {isMirrorPreview
                  ? `Vista previa · Pregunta ${safeQIdx + 1} de ${questions.length}`
                  : `Intento #${attemptsUsed + 1} de ${maxAttempts} · Pregunta ${safeQIdx + 1} de ${questions.length}`}
              </strong>
              <span className="aia-tabular">
                {answeredCount}/{questions.length} respondidas
              </span>
            </div>

            <div className="aia-progress-track">
              <div className="aia-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="aia-quiz-q-pills" role="tablist" aria-label="Preguntas del examen">
              {questions.map((q, idx) => {
                const isAnswered = selectedAnswers[idx] !== undefined;
                const isCurrent = idx === safeQIdx;
                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => handleJumpQuestion(idx)}
                    className={`aia-quiz-q-pill aia-tabular ${isCurrent ? 'current' : ''} ${
                      isAnswered ? 'answered' : ''
                    }`}
                  >
                    {isAnswered ? `✓ P${idx + 1}` : `P${idx + 1}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="aia-question-card aia-question-card-focus">
            <div className="aia-question-card-top">
              <div className="aia-question-meta">
                <span className="aia-question-num aia-tabular">P{safeQIdx + 1}</span>
                <span className="aia-question-skill">{currentQuestion.skillTag}</span>
              </div>

              <button
                type="button"
                className={`aia-tts-btn ${isSpeakingQuestion ? 'speaking' : ''}`}
                onClick={handleToggleSpeakQuestion}
                title={
                  isSpeakingQuestion
                    ? 'Detener lectura de la pregunta'
                    : 'Escuchar esta pregunta y sus opciones en voz alta'
                }
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                  {isSpeakingQuestion ? 'stop_circle' : 'volume_up'}
                </span>
                <span>{isSpeakingQuestion ? 'Detener voz' : 'Escuchar pregunta'}</span>
              </button>
            </div>

            <p className="aia-question-text aia-question-text-lg">{currentQuestion.question}</p>

            <div className="aia-options-grid">
              {(currentQuestion.options || []).map((optText, optIdx) => {
                const isSelected = selectedAnswers[safeQIdx] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(safeQIdx, optIdx)}
                    className={`aia-option-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="aia-option-letter">{letter}</span>
                    <span className="aia-option-label">{optText}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </div>

          <div className="aia-slide-footer">
            <button
              type="button"
              className="aia-btn-secondary"
              onClick={() => handleJumpQuestion(safeQIdx - 1)}
              disabled={safeQIdx === 0}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                arrow_back
              </span>
              <span>Anterior</span>
            </button>

            <span className="aia-slide-counter">
              {isMirrorPreview
                ? 'Modo vista previa · Las calificaciones se consultan en Intentos y Telemetría.'
                : allAnswered
                  ? '✓ Todas respondidas. Ya puedes calificar tu intento.'
                  : `Te faltan ${questions.length - answeredCount} por responder.`}
            </span>

            {safeQIdx < questions.length - 1 ? (
              <button
                type="button"
                className="aia-btn-primary"
                onClick={() => handleJumpQuestion(safeQIdx + 1)}
              >
                <span>Siguiente pregunta</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  arrow_forward
                </span>
              </button>
            ) : !isMirrorPreview ? (
              <button
                type="submit"
                className="aia-btn-primary"
                disabled={!allAnswered}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  send
                </span>
                <span>Calificar Intento #{attemptsUsed + 1}</span>
              </button>
            ) : (
              <button
                type="button"
                className="aia-btn-secondary"
                onClick={() => handleJumpQuestion(0)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  first_page
                </span>
                <span>Volver a P1</span>
              </button>
            )}
          </div>
        </form>
      ) : (
        /* Modo 2: Revisión Formativa del Intento Seleccionado (sin duplicar botones ni barras) */
        displayedAttempt && (
          <div className="aia-attempt-review aia-stage-scroll-body">
            <div
              className={`aia-result-hero-card ${
                displayedAttempt.percentage === 100
                  ? 'tier-mastered'
                  : displayedAttempt.percentage >= 60
                    ? 'tier-good'
                    : 'tier-grow'
              }`}
            >
              <div className="aia-result-hero-main">
                <div className="aia-result-score-box aia-tabular">
                  <strong>{displayedAttempt.percentage}%</strong>
                  <span>
                    {displayedAttempt.score}/{displayedAttempt.totalQuestions} aciertos
                  </span>
                </div>

                <div className="aia-result-hero-copy">
                  <div className="aia-result-hero-kicker aia-tabular">
                    Intento #{displayedAttempt.attemptNumber} de {maxAttempts}
                  </div>
                  <h4>
                    {displayedAttempt.percentage === 100
                      ? '¡Dominio completo logrado!'
                      : displayedAttempt.percentage >= 60
                        ? '¡Muy buen avance! Estás cerca del 100%'
                        : 'Buen comienzo · Revisemos juntos qué fortalecer'}
                  </h4>
                  <p>
                    {hasMastered
                      ? 'Completaste todas las preguntas correctamente. Tu profesor ya puede ver tu logro.'
                      : canRetry
                        ? `Te ${remainingAttempts === 1 ? 'queda 1 intento' : `quedan ${remainingAttempts} intentos`} para mejorar tu nota. Usa las pistas de abajo antes de volver a intentarlo.`
                        : `Ya realizaste los ${maxAttempts} intentos disponibles. Tu profesor recibió tu avance completo.`}
                  </p>

                  <div className="aia-result-stat-chips aia-tabular">
                    <span className="ok">
                      ✓ {displayedAttempt.score} acertadas
                    </span>
                    <span className="warn">
                      ⚠ {displayedAttempt.totalQuestions - displayedAttempt.score} por reforzar
                    </span>
                  </div>
                </div>

                {canRetry && (
                  <div className="aia-result-hero-cta">
                    <button
                      type="button"
                      className="aia-btn-primary"
                      onClick={handleStartNewAttempt}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        replay
                      </span>
                      <span>
                        Intentar de nuevo ({attemptsUsed + 1}/{maxAttempts})
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Selector de intentos solo si hay 2 o más intentos para comparar evolución */}
              {attempts.length > 1 && (
                <div className="aia-result-history-row">
                  <span className="aia-attempts-strip-label">Comparar intentos:</span>
                  <div className="aia-attempts-pills">
                    {attempts.map((att, idx) => {
                      const prevPct = idx > 0 ? attempts[idx - 1].percentage : null;
                      const improved = prevPct !== null && att.percentage > prevPct;
                      return (
                        <button
                          key={att.attemptNumber}
                          type="button"
                          onClick={() => setLastSubmittedAttempt(att)}
                          className={`aia-attempt-pill aia-tabular ${
                            displayedAttempt?.attemptNumber === att.attemptNumber ? 'active' : ''
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
                </div>
              )}
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
                            <strong>💡 Pista para tu siguiente intento:</strong> {q.hint}
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
