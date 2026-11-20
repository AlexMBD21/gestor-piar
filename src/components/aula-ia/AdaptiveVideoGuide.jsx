import { useState, useEffect } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';
import { buildDefaultYoutubeVideo, extractYoutubeVideoId } from '../../lib/piarAiEngine';

const DEAD_LEGACY_VIDEO_IDS = new Set(['aG3j675kZbc']);

export default function AdaptiveVideoGuide({
  pkg,
  activity,
  isMirrorPreview = false,
  onCompleteVideo
}) {
  const { recordVideoTelemetry, updatePackageYoutubeVideo } = useAulaIa();

  const defaultYt = buildDefaultYoutubeVideo(pkg?.subject, pkg?.topic);
  const rawPkgVideoId = extractYoutubeVideoId(pkg?.youtubeVideo?.videoId);
  const isDeadLegacyId = rawPkgVideoId && DEAD_LEGACY_VIDEO_IDS.has(rawPkgVideoId);
  const resolvedVideoId = isDeadLegacyId ? defaultYt.videoId : rawPkgVideoId || defaultYt.videoId;

  const ytResource = {
    ...defaultYt,
    ...(pkg?.youtubeVideo || {}),
    videoId: resolvedVideoId
  };

  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeTitleInput, setYoutubeTitleInput] = useState('');
  const [urlFeedback, setUrlFeedback] = useState(null);
  // 'idle' | 'checking' | 'available' | 'unavailable'
  const [videoAvailability, setVideoAvailability] = useState(() =>
    resolvedVideoId ? 'checking' : 'unavailable'
  );
  const [verifiedMeta, setVerifiedMeta] = useState(null);

  // Verificación real contra YouTube oEmbed para nunca mostrar la pantalla negra de "Video no disponible"
  useEffect(() => {
    if (!resolvedVideoId) {
      setVideoAvailability('unavailable');
      setVerifiedMeta(null);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    setVideoAvailability('checking');
    setVerifiedMeta(null);

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${resolvedVideoId}`
    )}&format=json`;

    fetch(oembedUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('unavailable');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setVerifiedMeta({
          title: data?.title || null,
          authorName: data?.author_name || null
        });
        setVideoAvailability('available');
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        // Si no hay conexión (offline), no bloquear: intentar cargar el iframe normalmente
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setVideoAvailability('available');
          return;
        }
        setVideoAvailability('unavailable');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resolvedVideoId]);

  const handleSaveYoutubeLink = async (e) => {
    e.preventDefault();
    const id = extractYoutubeVideoId(youtubeInput);
    if (!id) {
      setUrlFeedback({
        type: 'error',
        text: 'Pega un enlace válido de YouTube (ej. youtube.com/watch?v=... o youtu.be/...).'
      });
      return;
    }

    // Verificar antes de guardar que el video existe y permite incrustación
    try {
      const checkRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${id}`
        )}&format=json`
      );
      if (!checkRes.ok) {
        setUrlFeedback({
          type: 'error',
          text: 'Ese video no está disponible o tiene bloqueada la reproducción incrustada en YouTube. Prueba con otro enlace.'
        });
        return;
      }
    } catch {
      // Si falla la red, permitir guardar el enlace igualmente
    }

    const ok = updatePackageYoutubeVideo(pkg.piarId, pkg.id, youtubeInput, youtubeTitleInput);
    if (ok) {
      setYoutubeInput('');
      setYoutubeTitleInput('');
      setUrlFeedback({
        type: 'ok',
        text: 'Video de YouTube verificado y actualizado correctamente.'
      });
    }
  };

  const handleConfirmYoutubeWatched = () => {
    recordVideoTelemetry(pkg.id, {
      incrementPlay: true,
      sceneNumber: 4,
      totalScenes: 4,
      addedSeconds: 15,
      completed: true
    });
  };

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    ytResource.searchQuery || `${pkg?.subject || ''} ${pkg?.topic || ''}`
  )}`;

  const displayTitle = verifiedMeta?.title || ytResource.title;
  const displayChannel = verifiedMeta?.authorName || ytResource.channelTitle || 'YouTube Educativo';
  const canRenderIframe = Boolean(ytResource.videoId) && videoAvailability === 'available';

  return (
    <div className="aia-media-surface">
      {/* Cabecera limpia de Video YouTube */}
      <div className="aia-media-header">
        <div className="aia-media-title-group">
          <span className="aia-step-pill">PASO 02 · Video de Apoyo (YouTube)</span>
          <span className="aia-badge-soft">{pkg?.subject}</span>
        </div>

        <div className="aia-telemetry-chip">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            smart_display
          </span>
          <span className="aia-tabular">
            {activity?.videoCompleted ? '✓ Video completado' : 'Video de refuerzo'}
          </span>
        </div>
      </div>

      {/* Barra de supervisión docente para vincular o cambiar el enlace de YouTube */}
      {isMirrorPreview && (
        <form onSubmit={handleSaveYoutubeLink} className="aia-yt-teacher-bar">
          <div className="aia-yt-teacher-bar-head">
            <span className="aia-yt-teacher-tag">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                link
              </span>
              <span>
                Supervisión Docente ·{' '}
                {canRenderIframe
                  ? 'Cambiar Video de YouTube por Enlace'
                  : 'Vincular Video de YouTube para esta Área'}
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
              placeholder="Título opcional para el estudiante"
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

      {/* Reproductor Real de YouTube 16:9 (verificado) */}
      <div className="aia-yt-wrap">
        <div className="aia-yt-meta-row">
          <div>
            <h3 className="aia-video-scene-title">{displayTitle}</h3>
            <span className="aia-yt-channel">
              Canal: <strong>{displayChannel}</strong>
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
            <span>Ver más en YouTube</span>
          </a>
        </div>

        {videoAvailability === 'checking' ? (
          <div className="aia-yt-empty-theater">
            <span className="material-symbols-outlined aia-yt-empty-icon">
              hourglass_top
            </span>
            <h4>Verificando disponibilidad del video en YouTube...</h4>
            <p>Comprobando que el enlace esté activo y listo para reproducirse aquí.</p>
          </div>
        ) : canRenderIframe ? (
          <div className="aia-yt-player-shell">
            <iframe
              className="aia-yt-iframe"
              src={`https://www.youtube-nocookie.com/embed/${ytResource.videoId}?rel=0`}
              title={displayTitle || 'Video educativo de apoyo'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aia-yt-empty-theater">
            <span className="material-symbols-outlined aia-yt-empty-icon">
              ondemand_video
            </span>
            <h4>
              {ytResource.videoId
                ? `El video sugerido no está disponible en YouTube para ${pkg?.subject}`
                : `Video de YouTube pendiente de enlace para ${pkg?.subject}`}
            </h4>
            <p>
              {isMirrorPreview
                ? 'Haz clic en "Buscar en YouTube" para elegir un video activo de este tema, copia su URL y pégala en la barra superior para incrustarlo verificado al instante.'
                : 'Puedes abrir la búsqueda recomendada en YouTube para ver explicaciones de este tema o continuar a los Juegos Didácticos.'}
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
            </div>
          </div>
        )}

        {/* Guía de atención generada por el Agente IA */}
        <div className="aia-yt-moments-box">
          <div className="aia-yt-moments-head">
            <strong>Puntos clave para prestar atención en el video</strong>
            <button
              type="button"
              className={`aia-btn-sm ${activity?.videoCompleted ? 'aia-btn-primary' : 'aia-btn-secondary'}`}
              onClick={handleConfirmYoutubeWatched}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                check_circle
              </span>
              <span>
                {activity?.videoCompleted ? '✓ Video visto y registrado' : 'Marcar como visto'}
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

      <div className="aia-slide-footer">
        <span className="aia-slide-counter">
          {activity?.videoCompleted
            ? '✓ Excelente, ya registraste tu video de apoyo.'
            : 'Cuando termines de verlo, marca "Marcar como visto" y avanza a los juegos.'}
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
