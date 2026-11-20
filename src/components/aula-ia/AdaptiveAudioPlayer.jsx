import { useState, useEffect, useRef } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';

export default function AdaptiveAudioPlayer({ pkg, activity, onCompleteAudio }) {
  const { recordAudioTelemetry } = useAulaIa();
  const capsule = pkg?.audioCapsule || {};
  const segments = Array.isArray(capsule.segments) ? capsule.segments : [];
  const totalSec = capsule.estimatedDurationSec || 80;

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const timerRef = useRef(null);

  const progressPct = Math.min(100, Math.round((elapsedSec / totalSec) * 100));

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakSegmentText = (text, rate) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-CO';
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignorar si el navegador bloquea síntesis automática
    }
  };

  const togglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      recordAudioTelemetry(pkg.id, {
        incrementPlay: true,
        progressPercent: progressPct,
        addedSeconds: 1
      });

      const fullScript = segments.map((s) => s.text).join(' ');
      if (fullScript) {
        speakSegmentText(fullScript, playbackRate);
      }

      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => {
          const next = prev + 2;
          const pct = Math.min(100, Math.round((next / totalSec) * 100));
          const segIdx = Math.min(
            segments.length - 1,
            Math.floor((pct / 100) * Math.max(1, segments.length))
          );
          setActiveSegmentIdx(segIdx);

          if (next >= totalSec) {
            clearInterval(timerRef.current);
            setIsPlaying(false);
            recordAudioTelemetry(pkg.id, {
              incrementPlay: false,
              progressPercent: 100,
              addedSeconds: 2,
              completed: true
            });
            return totalSec;
          }

          recordAudioTelemetry(pkg.id, {
            incrementPlay: false,
            progressPercent: pct,
            addedSeconds: 2,
            completed: pct >= 95
          });
          return next;
        });
      }, 1600);
    } else {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleSelectSegment = (idx) => {
    setActiveSegmentIdx(idx);
    const targetSec = Math.round(((idx + 0.5) / Math.max(1, segments.length)) * totalSec);
    setElapsedSec(targetSec);
    const pct = Math.min(100, Math.round((targetSec / totalSec) * 100));
    recordAudioTelemetry(pkg.id, {
      incrementPlay: !isPlaying,
      progressPercent: pct,
      addedSeconds: 3,
      completed: idx === segments.length - 1
    });
    if (segments[idx]?.text) {
      speakSegmentText(segments[idx].text, playbackRate);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="aia-media-surface">
      {/* Header con telemetría de audio */}
      <div className="aia-media-header">
        <div className="aia-media-title-group">
          <span className="aia-step-pill">Cápsula de Voz Adaptativa</span>
          <span className="aia-badge-soft">{capsule.voiceTone || 'Tono Cálido y Pausado'}</span>
        </div>

        <div className="aia-telemetry-chip">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            graphic_eq
          </span>
          <span className="aia-tabular">
            Reproducciones: {activity?.audioPlayCount || 0} · Oído: {activity?.audioMaxPercent || 0}%
          </span>
        </div>
      </div>

      {/* Consola de reproducción con onda reactiva */}
      <div className="aia-audio-console">
        <div className="aia-audio-top-row">
          <button
            type="button"
            className={`aia-audio-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar cápsula de audio' : 'Reproducir cápsula de audio'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <div className="aia-audio-meta">
            <h4 className="aia-audio-title">{capsule.title || 'Explicación Auditiva Paso a Paso'}</h4>
            <div className="aia-audio-sub">
              <span>Narración guiada adaptada al perfil del estudiante</span>
              <span className="aia-tabular">
                {formatTime(elapsedSec)} / {formatTime(totalSec)}
              </span>
            </div>
          </div>

          <div className="aia-speed-group" role="group" aria-label="Velocidad de voz">
            {[0.85, 1, 1.15].map((rate) => (
              <button
                key={rate}
                type="button"
                className={`aia-speed-pill aia-tabular ${playbackRate === rate ? 'active' : ''}`}
                onClick={() => setPlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Barra de progreso y ondas */}
        <div className="aia-waveform-bar-wrap">
          <div className="aia-progress-track">
            <div className="aia-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="aia-waveform-bars" aria-hidden="true">
            {[
              26, 48, 72, 40, 86, 62, 34, 90, 54, 70, 42, 82,
              64, 46, 88, 56, 74, 38, 84, 58, 44, 76, 52, 68,
              36, 80, 50, 66, 38, 72, 46, 60, 34, 48
            ].map((h, i, arr) => {
              const barPct = ((i + 1) / arr.length) * 100;
              const passed = progressPct >= barPct;
              return (
                <span
                  key={i}
                  className={`aia-wave-bar ${isPlaying ? 'animating' : ''} ${passed ? 'passed' : ''}`}
                  style={{ height: `${Math.max(6, Math.round(h * 0.28))}px`, animationDelay: `${(i % 6) * 90}ms` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Guion sincronizado interactivo */}
      <div className="aia-transcript-list">
        <div className="aia-transcript-header">
          <span>Guion Sincronizado (Haz clic en cualquier bloque para escucharlo)</span>
          {activity?.audioCompleted && (
            <span className="aia-completed-tag">✓ Audio escuchado al 100%</span>
          )}
        </div>
        {segments.map((seg, idx) => {
          const isCurrent = idx === activeSegmentIdx;
          return (
            <button
              key={seg.id || idx}
              type="button"
              onClick={() => handleSelectSegment(idx)}
              className={`aia-transcript-item ${isCurrent ? 'active' : ''}`}
            >
              <span className="aia-transcript-time aia-tabular">{seg.timeLabel}</span>
              <p className="aia-transcript-text">{seg.text}</p>
            </button>
          );
        })}
      </div>

      <div className="aia-slide-footer">
        <span className="aia-slide-counter aia-tabular">
          Verificación de escucha: {activity?.audioMaxPercent || 0}% completado
        </span>
        {onCompleteAudio && (
          <button type="button" className="aia-btn-primary" onClick={onCompleteAudio}>
            <span>Pasar al Video / Guía Paso a Paso</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_forward
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

