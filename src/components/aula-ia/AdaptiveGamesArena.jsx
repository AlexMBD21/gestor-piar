import { useState, useEffect, useMemo, useRef } from 'react';
import { getPackageGames, GAME_TYPES, shuffleArray } from '../../lib/aulaGames';
import { useAulaIa } from '../../context/AulaIaContext';

function loadGameState(storageKey, fallback) {
  if (!storageKey) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveGameState(storageKey, value) {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignorar cuota de almacenamiento
  }
}

function MemoryGameBoard({ storageKey, game, onWin, onNextGame }) {
  const saved = useMemo(() => loadGameState(storageKey, {}), [storageKey]);
  const [resetCount, setResetCount] = useState(0);

  // Limitar a 4 parejas máximo para no saturar la memoria de trabajo
  const basePairs = useMemo(() => (game.pairs || []).slice(0, 4), [game.pairs]);

  const leftItems = useMemo(() => {
    void resetCount;
    return basePairs.map((p, idx) => ({ pairId: idx, text: p.term }));
  }, [basePairs, resetCount]);

  const rightItems = useMemo(() => {
    void resetCount;
    return shuffleArray(basePairs.map((p, idx) => ({ pairId: idx, text: p.match })));
  }, [basePairs, resetCount]);

  const [selectedLeftId, setSelectedLeftId] = useState(null);
  const [wrongRightId, setWrongRightId] = useState(null);
  const [hintPairId, setHintPairId] = useState(null);

  const [matchedPairIds, setMatchedPairIds] = useState(() =>
    Array.isArray(saved.matchedPairIds) ? saved.matchedPairIds : []
  );
  const [moves, setMoves] = useState(() => (typeof saved.moves === 'number' ? saved.moves : 0));
  const timeoutRef = useRef(null);
  const hintTimeoutRef = useRef(null);
  const totalPairs = basePairs.length;
  const wonRef = useRef(totalPairs > 0 && matchedPairIds.length >= totalPairs);

  useEffect(() => {
    saveGameState(storageKey, { matchedPairIds, moves });
  }, [storageKey, matchedPairIds, moves]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  const isWon = totalPairs > 0 && matchedPairIds.length >= totalPairs;

  const handleReset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    wonRef.current = false;
    setSelectedLeftId(null);
    setWrongRightId(null);
    setHintPairId(null);
    setMatchedPairIds([]);
    setMoves(0);
    setResetCount((c) => c + 1);
  };

  const handleHint = () => {
    if (isWon) return;
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);

    const targetPairId =
      selectedLeftId !== null && !matchedPairIds.includes(selectedLeftId)
        ? selectedLeftId
        : basePairs.findIndex((_, idx) => !matchedPairIds.includes(idx));

    if (targetPairId < 0) return;
    setHintPairId(targetPairId);
    setSelectedLeftId(targetPairId);
    hintTimeoutRef.current = setTimeout(() => {
      setHintPairId(null);
    }, 2400);
  };

  const handlePickLeft = (pairId) => {
    if (matchedPairIds.includes(pairId)) return;
    setWrongRightId(null);
    setSelectedLeftId((prev) => (prev === pairId ? null : pairId));
  };

  const handlePickRight = (pairId) => {
    if (matchedPairIds.includes(pairId) || selectedLeftId === null) return;
    setMoves((m) => m + 1);

    if (selectedLeftId === pairId) {
      const nextMatched = [...matchedPairIds, pairId];
      setMatchedPairIds(nextMatched);
      setSelectedLeftId(null);
      setWrongRightId(null);
      setHintPairId(null);
      if (nextMatched.length >= totalPairs && !wonRef.current) {
        wonRef.current = true;
        onWin(15, { score: totalPairs, total: totalPairs });
      }
    } else {
      setWrongRightId(pairId);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setWrongRightId(null);
      }, 950);
    }
  };

  return (
    <div className="aia-game-board-wrap">
      <div className="aia-game-status-strip">
        <span className="aia-tabular">
          Parejas unidas: <strong>{matchedPairIds.length}/{totalPairs}</strong> · Intentos:{' '}
          <strong>{moves}</strong>
        </span>

        <div className="aia-game-inline-actions">
          {!isWon && (
            <button
              type="button"
              className="aia-btn-secondary aia-btn-sm"
              onClick={handleHint}
              title="Resaltar una pareja como ayuda visual"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                lightbulb
              </span>
              <span>Pista</span>
            </button>
          )}
          <button
            type="button"
            className="aia-btn-secondary aia-btn-sm"
            onClick={handleReset}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {isWon && (
        <div className="aia-game-win-banner aia-game-win-spread">
          <div className="aia-game-win-text">
            <span className="material-symbols-outlined">emoji_events</span>
            <span>¡Excelente trabajo! Uniste las {totalPairs} ideas clave con claridad.</span>
          </div>
          {onNextGame && (
            <button type="button" className="aia-btn-primary aia-btn-sm" onClick={onNextGame}>
              <span>Siguiente juego</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          )}
        </div>
      )}

      <div className="aia-guided-match-wrap">
        <p className="aia-guided-match-tip">
          {isWon
            ? '✓ Parejas guardadas y completadas.'
            : selectedLeftId === null
              ? '1. Toca una idea en la columna izquierda.'
              : '2. Ahora toca su llave correspondiente en la columna derecha.'}
        </p>

        <div className="aia-guided-match-grid">
          <div className="aia-guided-col">
            <div className="aia-guided-col-head term">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                lightbulb
              </span>
              <span>Ideas del tema</span>
            </div>
            {leftItems.map((item) => {
              const isMatched = matchedPairIds.includes(item.pairId);
              const isSelected = selectedLeftId === item.pairId;
              const isHinted = hintPairId === item.pairId;
              return (
                <button
                  key={item.pairId}
                  type="button"
                  onClick={() => handlePickLeft(item.pairId)}
                  disabled={isMatched}
                  className={`aia-guided-card term ${isSelected ? 'selected' : ''} ${
                    isMatched ? 'matched' : ''
                  } ${isHinted ? 'hinted' : ''}`}
                >
                  <span className="aia-guided-badge aia-tabular">
                    {isMatched ? '✓' : item.pairId + 1}
                  </span>
                  <span className="aia-guided-text">{item.text}</span>
                </button>
              );
            })}
          </div>

          <div className="aia-guided-col">
            <div className="aia-guided-col-head match">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                key
              </span>
              <span>Llaves para recordar</span>
            </div>
            {rightItems.map((item) => {
              const isMatched = matchedPairIds.includes(item.pairId);
              const isWrong = wrongRightId === item.pairId;
              const isHinted = hintPairId === item.pairId;
              return (
                <button
                  key={item.pairId}
                  type="button"
                  onClick={() => handlePickRight(item.pairId)}
                  disabled={isMatched || selectedLeftId === null}
                  className={`aia-guided-card match ${isMatched ? 'matched' : ''} ${
                    isWrong ? 'wrong' : ''
                  } ${isHinted ? 'hinted' : ''}`}
                >
                  <span className="aia-guided-badge aia-tabular">
                    {isMatched ? `✓ ${item.pairId + 1}` : '?'}
                  </span>
                  <span className="aia-guided-text">{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderStepsBoard({ storageKey, game, isRecorded, onWin, onNextGame }) {
  const saved = useMemo(() => loadGameState(storageKey, {}), [storageKey]);
  const initialSteps = useMemo(() => {
    const source = game.steps || [];
    if (
      Array.isArray(saved.ordered) &&
      saved.ordered.length === source.length &&
      saved.ordered.every((s) => source.includes(s))
    ) {
      return saved.ordered;
    }
    if (source.length < 2) return [...source];
    const shuffled = shuffleArray(source);
    if (shuffled.every((s, idx) => s === source[idx])) {
      return [...shuffled.slice(1), shuffled[0]];
    }
    return shuffled;
  }, [game.steps, saved.ordered]);

  const [ordered, setOrdered] = useState(initialSteps);
  const [checked, setChecked] = useState(Boolean(saved.checked));
  const correctCount = ordered.filter((s, idx) => s === game.steps?.[idx]).length;
  const allCorrect = ordered.length > 0 && correctCount === ordered.length;
  const wonRef = useRef(Boolean(isRecorded));

  useEffect(() => {
    saveGameState(storageKey, { ordered, checked });
  }, [storageKey, ordered, checked]);

  useEffect(() => {
    if (checked && !isRecorded && !wonRef.current) {
      wonRef.current = true;
      onWin(12, { score: correctCount, total: ordered.length });
    }
  }, [checked, isRecorded, correctCount, ordered.length, onWin]);

  const moveStep = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= ordered.length) return;
    setOrdered((prev) => {
      const next = [...prev];
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
    setChecked(false);
  };

  const handleCheck = () => {
    setChecked(true);
    wonRef.current = true;
    onWin(12, { score: correctCount, total: ordered.length });
  };

  const handleReshuffle = () => {
    wonRef.current = false;
    setChecked(false);
    setOrdered(shuffleArray(game.steps || []));
  };

  return (
    <div className="aia-game-board-wrap">
      <div className="aia-game-status-strip">
        <span>
          Ordena del paso <strong>1</strong> al <strong>{ordered.length}</strong> y pulsa{' '}
          <strong>Comprobar Orden</strong>
        </span>
        <div className="aia-game-inline-actions">
          <button type="button" className="aia-btn-secondary aia-btn-sm" onClick={handleReshuffle}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>shuffle</span>
            <span>Mezclar</span>
          </button>
          <button type="button" className="aia-btn-primary aia-btn-sm" onClick={handleCheck}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>fact_check</span>
            <span>Comprobar Orden</span>
          </button>
        </div>
      </div>

      {checked && (
        <div className={allCorrect ? 'aia-game-win-banner aia-game-win-spread' : 'aia-game-hint-banner'}>
          <div className="aia-game-win-text">
            <span className="material-symbols-outlined">
              {allCorrect ? 'emoji_events' : 'lightbulb'}
            </span>
            <span>
              {allCorrect
                ? '¡Secuencia perfecta! Dominaste el orden lógico paso a paso.'
                : `Tienes ${correctCount} de ${ordered.length} pasos en su lugar exacto. Ajusta los resaltados en ámbar y vuelve a comprobar.`}
            </span>
          </div>
          {allCorrect && onNextGame && (
            <button type="button" className="aia-btn-primary aia-btn-sm" onClick={onNextGame}>
              <span>Siguiente juego</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          )}
        </div>
      )}

      <div className="aia-order-list">
        {ordered.map((stepText, idx) => {
          const isRightSpot = checked && stepText === game.steps?.[idx];
          const isWrongSpot = checked && !isRightSpot;
          return (
            <div
              key={`${idx}-${stepText.slice(0, 12)}`}
              className={`aia-order-row ${isRightSpot ? 'correct' : ''} ${isWrongSpot ? 'wrong' : ''}`}
            >
              <span className="aia-order-num aia-tabular">{idx + 1}</span>
              <span className="aia-order-text">{stepText}</span>
              <div className="aia-order-arrows">
                <button
                  type="button"
                  className="aia-order-arrow-btn"
                  onClick={() => moveStep(idx, -1)}
                  disabled={idx === 0}
                  title="Subir paso"
                  aria-label={`Subir paso ${idx + 1}`}
                >
                  <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <button
                  type="button"
                  className="aia-order-arrow-btn"
                  onClick={() => moveStep(idx, 1)}
                  disabled={idx === ordered.length - 1}
                  title="Bajar paso"
                  aria-label={`Bajar paso ${idx + 1}`}
                >
                  <span className="material-symbols-outlined">arrow_downward</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClassifyGameBoard({ storageKey, game, isRecorded, onWin, onNextGame }) {
  const saved = useMemo(() => loadGameState(storageKey, {}), [storageKey]);
  const items = useMemo(() => game.items || [], [game.items]);
  // Guardamos selecciones por texto de tarjeta para que nunca se pierdan al cambiar de pestaña
  const [selections, setSelections] = useState(() =>
    saved.selections && typeof saved.selections === 'object' ? saved.selections : {}
  );

  const solvedCount = items.filter((it) => selections[it.text] === it.category).length;
  const answeredCount = items.filter((it) => Boolean(selections[it.text])).length;
  const wrongCount = answeredCount - solvedCount;
  const isWon = items.length > 0 && solvedCount === items.length;
  const wonRef = useRef(Boolean(isRecorded));

  useEffect(() => {
    saveGameState(storageKey, { selections });
  }, [storageKey, selections]);

  useEffect(() => {
    if (items.length > 0 && answeredCount === items.length && !isRecorded && !wonRef.current) {
      wonRef.current = true;
      onWin(12, { score: solvedCount, total: items.length });
    }
  }, [items.length, answeredCount, solvedCount, isRecorded, onWin]);

  const handleSelectCategory = (itemText, category) => {
    const next = { ...selections, [itemText]: category };
    setSelections(next);
    const nextAnswered = items.filter((it) => Boolean(next[it.text])).length;
    const nextSolved = items.filter((it) => next[it.text] === it.category).length;
    if (items.length > 0 && nextAnswered === items.length) {
      wonRef.current = true;
      onWin(12, { score: nextSolved, total: items.length });
    }
  };

  return (
    <div className="aia-game-board-wrap">
      <div className="aia-game-status-strip">
        <span className="aia-tabular">
          Tarjetas correctas: <strong>{solvedCount}/{items.length}</strong>
          {wrongCount > 0 && ` · Por corregir: ${wrongCount}`}
        </span>
        <button
          type="button"
          className="aia-btn-secondary aia-btn-sm"
          onClick={() => {
            wonRef.current = false;
            setSelections({});
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
          <span>Reiniciar</span>
        </button>
      </div>

      {isWon ? (
        <div className="aia-game-win-banner aia-game-win-spread">
          <div className="aia-game-win-text">
            <span className="material-symbols-outlined">emoji_events</span>
            <span>¡Excelente criterio! Clasificaste las {items.length} tarjetas correctamente.</span>
          </div>
          {onNextGame && (
            <button type="button" className="aia-btn-primary aia-btn-sm" onClick={onNextGame}>
              <span>Siguiente juego</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          )}
        </div>
      ) : (
        answeredCount === items.length &&
        wrongCount > 0 && (
          <div className="aia-game-hint-banner aia-game-win-spread">
            <div className="aia-game-win-text">
              <span className="material-symbols-outlined">lightbulb</span>
              <span>
                ¡Actividad registrada! Puedes corregir {wrongCount === 1 ? 'la tarjeta en rojo' : `las ${wrongCount} tarjetas en rojo`} para mejorar, o avanzar al siguiente juego.
              </span>
            </div>
            {onNextGame && (
              <button type="button" className="aia-btn-secondary aia-btn-sm" onClick={onNextGame}>
                <span>Siguiente juego</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  arrow_forward
                </span>
              </button>
            )}
          </div>
        )
      )}

      <div className="aia-classify-stack">
        {items.map((item, idx) => {
          const picked = selections[item.text];
          const isCorrect = picked && picked === item.category;
          const isWrong = picked && picked !== item.category;

          return (
            <div
              key={`${idx}-${item.text.slice(0, 14)}`}
              className={`aia-classify-item ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
            >
              <p className="aia-classify-text">{item.text}</p>
              <div className="aia-classify-btns">
                {(game.categories || []).map((cat) => {
                  const active = picked === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectCategory(item.text, cat)}
                      className={`aia-classify-pill ${active ? 'active' : ''} ${
                        active && isCorrect ? 'ok' : ''
                      } ${active && isWrong ? 'err' : ''}`}
                    >
                      {active && isCorrect && '✓ '}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FillSentenceBoard({ storageKey, game, isRecorded, onWin }) {
  const saved = useMemo(() => loadGameState(storageKey, {}), [storageKey]);
  const sentences = useMemo(() => game.sentences || [], [game.sentences]);
  const [answers, setAnswers] = useState(() =>
    saved.answers && typeof saved.answers === 'object' ? saved.answers : {}
  );

  const solvedCount = sentences.filter((s, idx) => answers[idx] === s.answer).length;
  const answeredCount = sentences.filter((_, idx) => Boolean(answers[idx])).length;
  const wrongCount = answeredCount - solvedCount;
  const isWon = sentences.length > 0 && solvedCount === sentences.length;
  const wonRef = useRef(Boolean(isRecorded));

  useEffect(() => {
    saveGameState(storageKey, { answers });
  }, [storageKey, answers]);

  useEffect(() => {
    if (sentences.length > 0 && answeredCount === sentences.length && !isRecorded && !wonRef.current) {
      wonRef.current = true;
      onWin(12, { score: solvedCount, total: sentences.length });
    }
  }, [sentences.length, answeredCount, solvedCount, isRecorded, onWin]);

  const handlePickOption = (idx, opt) => {
    const next = { ...answers, [idx]: opt };
    setAnswers(next);
    const nextAnswered = sentences.filter((_, i) => Boolean(next[i])).length;
    const nextSolved = sentences.filter((s, i) => next[i] === s.answer).length;
    if (sentences.length > 0 && nextAnswered === sentences.length) {
      wonRef.current = true;
      onWin(12, { score: nextSolved, total: sentences.length });
    }
  };

  return (
    <div className="aia-game-board-wrap">
      <div className="aia-game-status-strip">
        <span className="aia-tabular">
          Frases correctas: <strong>{solvedCount}/{sentences.length}</strong>
          {wrongCount > 0 && ` · Por corregir: ${wrongCount}`}
        </span>
        <button
          type="button"
          className="aia-btn-secondary aia-btn-sm"
          onClick={() => {
            wonRef.current = false;
            setAnswers({});
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
          <span>Limpiar</span>
        </button>
      </div>

      {isWon ? (
        <div className="aia-game-win-banner">
          <span className="material-symbols-outlined">emoji_events</span>
          <span>¡Completaste todas las ideas clave! Ya estás listo para tu examen.</span>
        </div>
      ) : (
        answeredCount === sentences.length &&
        wrongCount > 0 && (
          <div className="aia-game-hint-banner">
            <span className="material-symbols-outlined">lightbulb</span>
            <span>
              ¡Actividad registrada! Puedes ajustar {wrongCount === 1 ? 'la opción en ámbar' : `las ${wrongCount} opciones en ámbar`} para perfeccionar, o pasar al examen.
            </span>
          </div>
        )
      )}

      <div className="aia-fill-stack">
        {sentences.map((s, idx) => {
          const chosen = answers[idx];
          const isCorrect = chosen === s.answer;
          const isWrong = Boolean(chosen && chosen !== s.answer);
          const parts = s.text.split('___');

          return (
            <div
              key={`${idx}-${s.answer}`}
              className={`aia-fill-card ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
            >
              <div className="aia-fill-card-top">
                <p className="aia-fill-sentence">
                  {parts[0]}
                  <span
                    className={`aia-fill-blank ${isCorrect ? 'ok' : ''} ${isWrong ? 'err' : ''}`}
                  >
                    {chosen || '______'}
                  </span>
                  {parts.slice(1).join('___')}
                </p>
              </div>

              <div className="aia-fill-options">
                {(s.options || []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handlePickOption(idx, opt)}
                    className={`aia-fill-option-btn ${chosen === opt ? 'selected' : ''} ${
                      chosen === opt && isCorrect ? 'ok' : ''
                    } ${chosen === opt && isWrong ? 'err' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdaptiveGamesArena({ pkg, activity, onCompleteGames }) {
  const { recordGameTelemetry } = useAulaIa();
  const games = useMemo(() => getPackageGames(pkg), [pkg]);
  const [activeGameIdx, setActiveGameIdx] = useState(0);

  const safeIdx = Math.min(activeGameIdx, Math.max(0, games.length - 1));
  const activeGame = games[safeIdx];
  const completedIds = activity?.gamesCompleted || [];

  if (!activeGame) return null;

  const meta = GAME_TYPES[activeGame.type] || GAME_TYPES.memory;
  const completedCount = completedIds.filter((id) => games.some((g) => g.id === id)).length;
  const gameStorageKey = pkg?.id && activeGame?.id ? `piar_game_state_${pkg.id}_${activeGame.id}` : null;

  const handleGameWon = (addedSeconds = 10, scoreData = null) => {
    const gameLabel = activeGame.type === 'memory' ? 'Une Parejas' : meta.label;
    recordGameTelemetry(pkg.id, {
      gameId: activeGame.id,
      gameLabel,
      totalGames: games.length,
      addedSeconds,
      completed: true,
      score: scoreData?.score ?? null,
      total: scoreData?.total ?? null
    });
  };

  const handleGoNextGame = () => {
    if (safeIdx < games.length - 1) {
      setActiveGameIdx(safeIdx + 1);
    } else if (onCompleteGames) {
      onCompleteGames();
    }
  };

  return (
    <div className="aia-media-surface">
      {/* Cabecera con tipo de juego y progreso */}
      <div className="aia-media-header">
        <div className="aia-media-title-group">
          <span className="aia-step-pill">PASO 03 · Juegos Didácticos</span>
          <span className="aia-badge-soft">{meta.skill}</span>
        </div>

        <div className="aia-telemetry-chip">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            sports_esports
          </span>
          <span className="aia-tabular">
            Juegos realizados: {completedCount}/{games.length}
          </span>
        </div>
      </div>

      {/* Selector entre los juegos generados */}
      <div className="aia-games-tabs" role="tablist" aria-label="Juegos adaptativos">
        {games.map((g, idx) => {
          const gMeta = GAME_TYPES[g.type] || GAME_TYPES.memory;
          const tabLabel = g.type === 'memory' ? 'Une Parejas' : gMeta.label;
          const isCurrent = idx === safeIdx;
          const isDone = completedIds.includes(g.id);
          const gScore = activity?.gamesScores?.[g.id];
          const isPerfect = isDone && (!gScore || gScore.percentage >= 100);
          const isNeedsPractice = isDone && gScore && gScore.percentage < 100;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGameIdx(idx)}
              className={`aia-game-tab ${isCurrent ? 'active' : ''} ${
                isPerfect ? 'done' : isNeedsPractice ? 'practiced' : ''
              }`}
              title={
                isPerfect
                  ? '¡Excelente! Completado al 100%'
                  : isNeedsPractice
                    ? 'Actividad realizada (puedes volver a practicar para mejorar)'
                    : 'Pendiente por realizar'
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                {gMeta.icon}
              </span>
              <span className="aia-game-tab-label">{tabLabel}</span>
              {isPerfect && <span className="aia-game-done-check">✓</span>}
              {isNeedsPractice && (
                <span className="material-symbols-outlined aia-game-practiced-icon">
                  autorenew
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Escenario del juego activo */}
      <div className="aia-game-stage aia-stage-scroll-body">
        <div className="aia-game-stage-header">
          <h3 className="aia-slide-heading">{activeGame.title}</h3>
          <p className="aia-game-instructions">
            {activeGame.type === 'memory'
              ? 'Relaciona cada idea del tema con su llave clave. Tu progreso se guarda automáticamente.'
              : activeGame.instructions}
          </p>
        </div>

        {activeGame.type === 'memory' && (
          <MemoryGameBoard
            key={`${pkg.id}-${activeGame.id}`}
            storageKey={gameStorageKey}
            game={activeGame}
            onWin={handleGameWon}
            onNextGame={handleGoNextGame}
          />
        )}
        {activeGame.type === 'order' && (
          <OrderStepsBoard
            key={`${pkg.id}-${activeGame.id}`}
            storageKey={gameStorageKey}
            game={activeGame}
            isRecorded={completedIds.includes(activeGame.id)}
            onWin={handleGameWon}
            onNextGame={handleGoNextGame}
          />
        )}
        {activeGame.type === 'classify' && (
          <ClassifyGameBoard
            key={`${pkg.id}-${activeGame.id}`}
            storageKey={gameStorageKey}
            game={activeGame}
            isRecorded={completedIds.includes(activeGame.id)}
            onWin={handleGameWon}
            onNextGame={handleGoNextGame}
          />
        )}
        {activeGame.type === 'fill' && (
          <FillSentenceBoard
            key={`${pkg.id}-${activeGame.id}`}
            storageKey={gameStorageKey}
            game={activeGame}
            isRecorded={completedIds.includes(activeGame.id)}
            onWin={handleGameWon}
          />
        )}
      </div>

      {/* Pie amigable y paso al Examen Final */}
      <div className="aia-slide-footer">
        <span className="aia-slide-counter aia-tabular">
          {completedCount === games.length
            ? '✓ ¡Superaste todos los juegos! Ya estás listo para tu examen.'
            : `Llevas ${completedCount} de ${games.length} juegos completados · ¡Avanza a tu ritmo!`}
        </span>
        {onCompleteGames && (
          <button type="button" className="aia-btn-primary" onClick={onCompleteGames}>
            <span>Pasar a Mi Examen de Refuerzo</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              quiz
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
