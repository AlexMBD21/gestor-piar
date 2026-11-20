import { useState, useEffect, useMemo, useRef } from 'react';
import { getPackageGames, GAME_TYPES, shuffleArray } from '../../lib/aulaGames';
import { useAulaIa } from '../../context/AulaIaContext';

function MemoryGameBoard({ game, onWin }) {
  const [resetCount, setResetCount] = useState(0);
  const cards = useMemo(() => {
    void resetCount;
    const raw = (game.pairs || []).flatMap((p, idx) => [
      { uid: `t-${idx}`, pairId: idx, kind: 'Concepto', text: p.term },
      { uid: `m-${idx}`, pairId: idx, kind: 'Llave', text: p.match }
    ]);
    return shuffleArray(raw);
  }, [game.pairs, resetCount]);

  const [flippedUids, setFlippedUids] = useState([]);
  const [matchedPairIds, setMatchedPairIds] = useState([]);
  const [mismatchUids, setMismatchUids] = useState([]);
  const [moves, setMoves] = useState(0);
  const timeoutRef = useRef(null);
  const wonRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const totalPairs = game.pairs?.length || 0;
  const isWon = totalPairs > 0 && matchedPairIds.length >= totalPairs;

  const handleReset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    wonRef.current = false;
    setFlippedUids([]);
    setMatchedPairIds([]);
    setMismatchUids([]);
    setMoves(0);
    setResetCount((c) => c + 1);
  };

  const handleCardClick = (card) => {
    if (
      mismatchUids.length > 0 ||
      matchedPairIds.includes(card.pairId) ||
      flippedUids.includes(card.uid)
    ) {
      return;
    }

    const nextFlipped = [...flippedUids, card.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const first = cards.find((c) => c.uid === nextFlipped[0]);
      const second = cards.find((c) => c.uid === nextFlipped[1]);

      if (first && second && first.pairId === second.pairId) {
        const nextMatched = [...matchedPairIds, first.pairId];
        setMatchedPairIds(nextMatched);
        setFlippedUids([]);
        if (nextMatched.length >= totalPairs && !wonRef.current) {
          wonRef.current = true;
          onWin(15);
        }
      } else {
        setMismatchUids(nextFlipped);
        timeoutRef.current = setTimeout(() => {
          setFlippedUids([]);
          setMismatchUids([]);
        }, 850);
      }
    }
  };

  return (
    <div className="aia-game-board-wrap">
      <div className="aia-game-status-strip">
        <span className="aia-tabular">
          Parejas encontradas: <strong>{matchedPairIds.length}/{totalPairs}</strong> · Movimientos: <strong>{moves}</strong>
        </span>
        <button type="button" className="aia-btn-secondary aia-btn-sm" onClick={handleReset}>
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
          <span>Barajar de nuevo</span>
        </button>
      </div>

      {isWon && (
        <div className="aia-game-win-banner">
          <span className="material-symbols-outlined">emoji_events</span>
          <span>¡Excelente memoria! Encontraste las {totalPairs} parejas clave sin presiones.</span>
        </div>
      )}

      <div className="aia-memory-grid">
        {cards.map((card) => {
          const isMatched = matchedPairIds.includes(card.pairId);
          const isFlipped = isMatched || flippedUids.includes(card.uid);
          const isMismatch = mismatchUids.includes(card.uid);

          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardClick(card)}
              className={`aia-memory-card ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''} ${isMismatch ? 'mismatch' : ''}`}
            >
              {isFlipped ? (
                <div className="aia-memory-card-face">
                  <span className="aia-memory-kind">{card.kind}</span>
                  <span className="aia-memory-text">{card.text}</span>
                </div>
              ) : (
                <div className="aia-memory-card-back">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <span>Tocar</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderStepsBoard({ game, onWin }) {
  const initialSteps = useMemo(() => {
    const source = game.steps || [];
    if (source.length < 2) return [...source];
    const shuffled = shuffleArray(source);
    if (shuffled.every((s, idx) => s === source[idx])) {
      return [...shuffled.slice(1), shuffled[0]];
    }
    return shuffled;
  }, [game.steps]);

  const [ordered, setOrdered] = useState(initialSteps);
  const [checked, setChecked] = useState(false);
  const wonRef = useRef(false);

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

  const correctCount = ordered.filter((s, idx) => s === game.steps?.[idx]).length;
  const allCorrect = ordered.length > 0 && correctCount === ordered.length;

  const handleCheck = () => {
    setChecked(true);
    if (allCorrect && !wonRef.current) {
      wonRef.current = true;
      onWin(12);
    }
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
          Ordena del paso <strong>1</strong> al <strong>{ordered.length}</strong> usando las flechas
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
        <div className={allCorrect ? 'aia-game-win-banner' : 'aia-game-hint-banner'}>
          <span className="material-symbols-outlined">
            {allCorrect ? 'emoji_events' : 'lightbulb'}
          </span>
          <span>
            {allCorrect
              ? '¡Secuencia perfecta! Dominaste el orden lógico paso a paso.'
              : `Tienes ${correctCount} de ${ordered.length} pasos en su lugar exacto. Ajusta los resaltados en ámbar.`}
          </span>
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

function ClassifyGameBoard({ game, onWin }) {
  const items = useMemo(() => shuffleArray(game.items || []), [game.items]);
  const [selections, setSelections] = useState({});
  const wonRef = useRef(false);

  const solvedCount = items.filter((it, idx) => selections[idx] === it.category).length;
  const isWon = items.length > 0 && solvedCount === items.length;

  const handleSelectCategory = (idx, category) => {
    const next = { ...selections, [idx]: category };
    setSelections(next);
    const nextSolved = items.filter((it, i) => next[i] === it.category).length;
    if (items.length > 0 && nextSolved === items.length && !wonRef.current) {
      wonRef.current = true;
      onWin(12);
    }
  };

  return (
    <div className="aia-game-board-wrap">
      <div className="aia-game-status-strip">
        <span className="aia-tabular">
          Tarjetas clasificadas correctamente: <strong>{solvedCount}/{items.length}</strong>
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

      {isWon && (
        <div className="aia-game-win-banner">
          <span className="material-symbols-outlined">emoji_events</span>
          <span>¡Excelente criterio! Clasificaste las {items.length} tarjetas sin confundirte.</span>
        </div>
      )}

      <div className="aia-classify-stack">
        {items.map((item, idx) => {
          const picked = selections[idx];
          const isCorrect = picked && picked === item.category;
          const isWrong = picked && picked !== item.category;

          return (
            <div
              key={`${idx}-${item.text.slice(0, 12)}`}
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
                      onClick={() => handleSelectCategory(idx, cat)}
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

function FillSentenceBoard({ game, onWin }) {
  const sentences = useMemo(() => game.sentences || [], [game.sentences]);
  const [answers, setAnswers] = useState({});
  const wonRef = useRef(false);

  const solvedCount = sentences.filter((s, idx) => answers[idx] === s.answer).length;
  const isWon = sentences.length > 0 && solvedCount === sentences.length;

  const handlePickOption = (idx, opt) => {
    const next = { ...answers, [idx]: opt };
    setAnswers(next);
    const nextSolved = sentences.filter((s, i) => next[i] === s.answer).length;
    if (sentences.length > 0 && nextSolved === sentences.length && !wonRef.current) {
      wonRef.current = true;
      onWin(12);
    }
  };

  return (
    <div className="aia-game-board-wrap">
      <div className="aia-game-status-strip">
        <span className="aia-tabular">
          Frases completadas: <strong>{solvedCount}/{sentences.length}</strong>
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

      {isWon && (
        <div className="aia-game-win-banner">
          <span className="material-symbols-outlined">emoji_events</span>
          <span>¡Completaste todas las ideas clave! Ya estás listo para tu examen.</span>
        </div>
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

  const handleGameWon = (addedSeconds = 10) => {
    recordGameTelemetry(pkg.id, {
      gameId: activeGame.id,
      totalGames: games.length,
      addedSeconds,
      completed: true
    });
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
            Juegos superados: {completedCount}/{games.length}
          </span>
        </div>
      </div>

      {/* Selector entre los juegos generados */}
      <div className="aia-games-tabs" role="tablist" aria-label="Juegos adaptativos">
        {games.map((g, idx) => {
          const gMeta = GAME_TYPES[g.type] || GAME_TYPES.memory;
          const isCurrent = idx === safeIdx;
          const isDone = completedIds.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGameIdx(idx)}
              className={`aia-game-tab ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                {gMeta.icon}
              </span>
              <span className="aia-game-tab-label">{gMeta.label}</span>
              {isDone && <span className="aia-game-done-check">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Escenario del juego activo */}
      <div className="aia-game-stage">
        <div className="aia-game-stage-header">
          <h3 className="aia-slide-heading">{activeGame.title}</h3>
          <p className="aia-game-instructions">{activeGame.instructions}</p>
        </div>

        {activeGame.type === 'memory' && (
          <MemoryGameBoard key={`${pkg.id}-${activeGame.id}`} game={activeGame} onWin={handleGameWon} />
        )}
        {activeGame.type === 'order' && (
          <OrderStepsBoard key={`${pkg.id}-${activeGame.id}`} game={activeGame} onWin={handleGameWon} />
        )}
        {activeGame.type === 'classify' && (
          <ClassifyGameBoard key={`${pkg.id}-${activeGame.id}`} game={activeGame} onWin={handleGameWon} />
        )}
        {activeGame.type === 'fill' && (
          <FillSentenceBoard key={`${pkg.id}-${activeGame.id}`} game={activeGame} onWin={handleGameWon} />
        )}
      </div>

      {/* Pie con telemetría y paso al Examen Final */}
      <div className="aia-slide-footer">
        <span className="aia-slide-counter aia-tabular">
          Práctica lúdica registrada: {activity?.gamesMaxPercent || 0}% ({completedCount}/{games.length} juegos)
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

