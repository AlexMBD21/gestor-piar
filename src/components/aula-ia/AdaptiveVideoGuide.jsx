import { useState, useEffect, useRef } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';
import { buildDefaultYoutubeVideo, extractYoutubeVideoId } from '../../lib/piarAiEngine';

export default function AdaptiveVideoGuide({
  pkg,
  activity,
  isMirrorPreview = false,
  onCompleteVideo
}) {
  const { recordVideoTelemetry, updatePackageYoutubeVideo } = useAulaIa();
  const guide = pkg?.videoGuide || {};
  const scenes = Array.isArray(guide.scenes) ? guide.scenes : [];

  const defaultYt = buildDefaultYoutubeVideo(pkg?.subject, pkg?.topic);
  const customVideoId = extractYoutubeVideoId(pkg?.youtubeVideo?.videoId);
  const pkgDomainMismatchVideo =
    pkg?.youtubeVideo?.videoId === 'aG3j675kZbc' && defaultYt.videoId !== 'aG3j675kZbc';
  const resolvedVideoId = pkgDomainMismatchVideo ? defaultYt.videoId : customVideoId || defaultYt.videoId;

  const ytResource = {
    ...defaultYt,
    ...(pkg?.youtubeVideo || {}),
    videoId: resolvedVideoId
  };

  const [viewMode, setViewMode] = useState(() => (resolvedVideoId ? 'youtube' : 'scenes'));
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeTitleInput, setYoutubeTitleInput] = useState('');
  const [urlFeedback, setUrlFeedback] = useState(null);

  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const timerRef = useRef(null);

  const currentScene = scenes[currentSceneIdx] || scenes[0] || {};
  const sceneDuration = currentScene.durationSec || 25;
  const viewedScenes = activity?.videoScenesViewed || [];

  useEffect(() => {
    setViewMode(resolvedVideoId ? 'youtube' : 'scenes');
    setIsPlaying(false);
    setSceneElapsed(0);
    setCurrentSceneIdx(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [pkg?.id, resolvedVideoId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      recordVideoTelemetry(pkg.id, {
        incrementPlay: true,
        sceneNumber: currentScene.sceneNumber || currentSceneIdx + 1,
        totalScenes: Math.max(1, scenes.length),
        addedSeconds: 2
      });

      timerRef.current = setInterval(() => {
        setSceneElapsed((prev) => {
          const next = prev + 2;
          if (next >= sceneDuration) {
            if (currentSceneIdx < scenes.length - 1) {
              const nextIdx = currentSceneIdx + 1;
              setCurrentSceneIdx(nextIdx);
              recordVideoTelemetry(pkg.id, {
                incrementPlay: false,
                sceneNumber: scenes[nextIdx]?.sceneNumber || nextIdx + 1,
                totalScenes: Math.max(1, scenes.length),
                addedSeconds: 3,
                completed: nextIdx === scenes.length - 1
              });
              return 0;
            }
            clearInterval(timerRef.current);
            setIsPlaying(false);
            recordVideoTelemetry(pkg.id, {
              incrementPlay: false,
              sceneNumber: currentScene.sceneNumber || scenes.length,
              totalScenes: Math.max(1, scenes.length),
              addedSeconds: 3,
              completed: true
            });
            return sceneDuration;
          }
          return next;
        });
      }, 900);
    } else {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const selectScene = (idx) => {
    setCurrentSceneIdx(idx);
    setSceneElapsed(0);
    recordVideoTelemetry(pkg.id, {
      incrementPlay: false,
      sceneNumber: scenes[idx]?.sceneNumber || idx + 1,
      totalScenes: Math.max(1, scenes.length),
      addedSeconds: 4,
      completed: idx === scenes.length - 1
    });
  };

  const handleSaveYoutubeLink = (e) => {
    e.preventDefault();
    const id = extractYoutubeVideoId(youtubeInput);
    if (!id) {
      setUrlFeedback({
        type: 'error',
        text: 'Pega un enlace válido de YouTube (ej. youtube.com/watch?v=... o youtu.be/...).'
      });
      return;
    }
    const ok = updatePackageYoutubeVideo(pkg.piarId, pkg.id, youtubeInput, youtubeTitleInput);
    if (ok) {
      setYoutubeInput('');
      setYoutubeTitleInput('');
      setViewMode('youtube');
      setUrlFeedback({
        type: 'ok',
        text: 'Video de YouTube actualizado por enlace (sin alojar archivos en el servidor).'
      });
    }
  };

  const handleConfirmYoutubeWatched = () => {
    recordVideoTelemetry(pkg.id, {
      incrementPlay: true,
      sceneNumber: Math.max(1, scenes.length),
      totalScenes: Math.max(1, scenes.length),
      addedSeconds: 15,
      completed: true
    });
  };

  if (scenes.length === 0 && !ytResource?.videoId) return null;

  const sceneProgressPct = Math.min(100, Math.round((sceneElapsed / sceneDuration) * 100));
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    ytResource.searchQuery || `${pkg?.subject || ''} ${pkg?.topic || ''}`
  )}`;

  return (
    <div className="aia-media-surface">
      {/* Header con selector de modo y telemetría */}
      <div className="aia-media-header">
        <div className="aia-media-title-group">
          <span className="aia-step-pill">PASO 03 · Video y Guía</span>
          <div className="aia-video-mode-tabs" role="tablist" aria-label="Formato de video de apoyo">
            <button
              type="button"
              onClick={() => {
                setViewMode('youtube');
                if (ytResource.videoId) {
                  recordVideoTelemetry(pkg.id, {
                    incrementPlay: true,
                    sceneNumber: 1,
                    totalScenes: Math.max(1, scenes.length),
                    addedSeconds: 3
                  });
                }
              }}
              className={`aia-video-mode-btn ${viewMode === 'youtube' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                ondemand_video
              </span>
              <span>Video de Apoyo (YouTube)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scenes')}
              className={`aia-video-mode-btn ${viewMode === 'scenes' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                movie_filter
              </span>
              <span>Video-Guía Animada ({scenes.length} Escenas)</span>
            </button>
          </div>
        </div>

        <div className="aia-telemetry-chip">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            smart_display
          </span>
          <span className="aia-tabular">
            Clics Play: {activity?.videoPlayCount || 0} · Visto: {activity?.videoMaxPercent || 0}%
          </span>
        </div>
      </div>

      {/* Barra de supervisión docente para vincular/cambiar enlace de YouTube */}
      {isMirrorPreview && (
        <form onSubmit={handleSaveYoutubeLink} className="aia-yt-teacher-bar">
          <div className="aia-yt-teacher-bar-head">
            <span className="aia-yt-teacher-tag">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                link
              </span>
              <span>
                Supervisión Docente ·{' '}
                {ytResource.videoId
                  ? 'Cambiar Video de YouTube por Enlace'
                  : 'Vincular Video Real de YouTube para esta Área'}
              </span>
            </span>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="aia-yt-search-link"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                search
              </span>
              <span>Buscar video en YouTube</span>
            </a>
          </div>

          <div className="aia-yt-input-row">
            <input
              type="url"
              className="aia-input-compact"
              placeholder="Pega enlace de YouTube (https://www.youtube.com/watch?v=... o youtu.be/...)"
              value={youtubeInput}
              onChange={(e) => {
                setYoutubeInput(e.target.value);
                setUrlFeedback(null);
              }}
            />
            <input
              type="text"
              className="aia-input-compact aia-yt-title-input"
              placeholder="Título opcional para el alumno"
              value={youtubeTitleInput}
              onChange={(e) => setYoutubeTitleInput(e.target.value)}
            />
            <button type="submit" className="aia-btn-primary aia-btn-sm">
              Aplicar enlace
            </button>
          </div>

          {urlFeedback && (
            <p className={`aia-yt-feedback ${urlFeedback.type}`}>{urlFeedback.text}</p>
          )}
        </form>
      )}

      {/* Reproductor Principal: YouTube 16:9 o Video-Guía Animada 16:9 */}
      {viewMode === 'youtube' ? (
        <div className="aia-yt-wrap">
          <div className="aia-yt-meta-row">
            <div>
              <h3 className="aia-video-scene-title">{ytResource.title}</h3>
              <span className="aia-yt-channel">
                Canal sugerido: <strong>{ytResource.channelTitle || 'YouTube Educativo'}</strong> ·
                Reproducción externa por enlace (sin alojar archivos en servidor)
              </span>
            </div>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="aia-btn-secondary aia-btn-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                open_in_new
              </span>
              <span>Buscar más videos en YouTube</span>
            </a>
          </div>

          {ytResource.videoId ? (
            <div className="aia-yt-player-shell">
              <iframe
                className="aia-yt-iframe"
                src={`https://www.youtube-nocookie.com/embed/${ytResource.videoId}?rel=0`}
                title={ytResource.title || 'Video educativo de apoyo'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aia-yt-empty-theater">
              <span className="material-symbols-outlined aia-yt-empty-icon">
                ondemand_video
              </span>
              <h4>Video externo pendiente de enlace para {pkg?.subject}</h4>
              <p>
                Para proteger el servidor no inventamos enlaces ni alojamos archivos.{' '}
                {isMirrorPreview
                  ? 'Haz clic en "Buscar video en YouTube" arriba, copia la URL y pégala en el campo para incrustarlo al instante.'
                  : 'Tu profesor puede vincular un enlace de YouTube, o puedes explorar ahora mismo la Video-Guía Animada de 4 escenas.'}
              </p>
              <div className="aia-yt-empty-actions">
                <a
                  href={youtubeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aia-btn-primary aia-btn-sm"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    search
                  </span>
                  <span>Buscar en YouTube</span>
                </a>
                {scenes.length > 0 && (
                  <button
                    type="button"
                    className="aia-btn-secondary aia-btn-sm"
                    onClick={() => setViewMode('scenes')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      movie_filter
                    </span>
                    <span>Ver Video-Guía Animada ({scenes.length} Escenas)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="aia-yt-moments-box">
            <div className="aia-yt-moments-head">
              <strong>Puntos clave para prestar atención en el video</strong>
              <button
                type="button"
                className="aia-btn-secondary aia-btn-sm"
                onClick={handleConfirmYoutubeWatched}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  check_circle
                </span>
                <span>
                  {activity?.videoCompleted ? '✓ Video visto y registrado' : 'Ya vi el video'}
                </span>
              </button>
            </div>
            {Array.isArray(ytResource.keyMoments) && ytResource.keyMoments.length > 0 && (
              <ul className="aia-yt-moments-list">
                {ytResource.keyMoments.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        scenes.length > 0 && (
          <div className={`aia-video-frame aia-video-cinema ${isPlaying ? 'playing' : ''}`}>
            <div className="aia-video-screen aia-video-cinema-stage">
              <div className="aia-video-cinema-top">
                <span className="aia-video-scene-badge aia-tabular">
                  ESCENA 0{currentSceneIdx + 1} DE {scenes.length} ·{' '}
                  {isPlaying ? '● REPRODUCIENDO' : 'LISTO PARA REPRODUCIR'}
                </span>
                <span className="aia-badge-soft aia-tabular">{guide.durationLabel || '2 min'}</span>
              </div>

              <h3 className="aia-video-scene-title">{currentScene.title}</h3>

              <div className="aia-video-visual-cue aia-video-cinema-cue">
                <span>{currentScene.visualCue}</span>
              </div>

              <p className="aia-video-narration">{currentScene.narration}</p>

              <div className="aia-video-scaffolding-pill">
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                  task_alt
                </span>
                <span>
                  <strong>Paso de Andamiaje:</strong> {currentScene.scaffoldingStep}
                </span>
              </div>
            </div>

            <div className="aia-video-controls">
              <button
                type="button"
                className={`aia-video-play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={handleTogglePlay}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                <span>{isPlaying ? 'Pausar Video-Guía' : 'Reproducir Video-Guía'}</span>
              </button>

              <div className="aia-video-progress-wrap">
                <div className="aia-progress-track">
                  <div className="aia-progress-fill" style={{ width: `${sceneProgressPct}%` }} />
                </div>
              </div>

              <span className="aia-video-time aia-tabular">
                Escenas vistas: {viewedScenes.length}/{scenes.length}
              </span>
            </div>
          </div>
        )
      )}

      {/* Cuadrícula siempre visible con las 4 escenas paso a paso */}
      {scenes.length > 0 && (
        <div className="aia-scene-section">
          <div className="aia-scene-section-head">
            <span>Capítulos del Video-Guía ({scenes.length} pasos clave)</span>
            {viewMode === 'youtube' && (
              <button
                type="button"
                className="aia-yt-search-link"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => setViewMode('scenes')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  play_circle
                </span>
                <span>Abrir en reproductor animado</span>
              </button>
            )}
          </div>
          <div className="aia-scene-grid">
            {scenes.map((sc, idx) => {
              const isSeen = viewedScenes.includes(sc.sceneNumber || idx + 1);
              const isCurrent = idx === currentSceneIdx;
              return (
                <button
                  key={sc.sceneNumber || idx}
                  type="button"
                  onClick={() => selectScene(idx)}
                  className={`aia-scene-card ${isCurrent ? 'current' : ''} ${isSeen ? 'seen' : ''}`}
                >
                  <div className="aia-scene-card-top">
                    <span className="aia-tabular">Escena {idx + 1}</span>
                    {isSeen && <span className="aia-scene-check">✓ Vista</span>}
                  </div>
                  <div className="aia-scene-card-title">{sc.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="aia-slide-footer">
        <span className="aia-slide-counter aia-tabular">
          Participación en video registrada: {activity?.videoMaxPercent || 0}%
        </span>
        {onCompleteVideo && (
          <button type="button" className="aia-btn-primary" onClick={onCompleteVideo}>
            <span>Continuar a Juegos Didácticos</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              sports_esports
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
