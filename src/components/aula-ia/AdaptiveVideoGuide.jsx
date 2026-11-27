import { useState, useEffect, useRef } from 'react';
import { useAulaIa } from '../../context/AulaIaContext';
import { buildDefaultYoutubeVideo, extractYoutubeVideoId } from '../../lib/piarAiEngine';
import {
  DEAD_YOUTUBE_VIDEO_IDS,
  buildYoutubeCandidates,
  checkYoutubeVideo,
  resolveWorkingYoutubeVideo
} from '../../lib/youtubeVerifier';

export default function AdaptiveVideoGuide({
  pkg,
  activity,
  isMirrorPreview = false,
  fullscreenButton = null,
  onBackToSlides,
  onCompleteVideo
}) {
  const { recordVideoTelemetry, updatePackageYoutubeVideo } = useAulaIa();

  const defaultYt = buildDefaultYoutubeVideo(pkg?.subject, pkg?.topic);
  const rawPkgVideoId = extractYoutubeVideoId(pkg?.youtubeVideo?.videoId);
  const candidates = buildYoutubeCandidates(
    rawPkgVideoId && !DEAD_YOUTUBE_VIDEO_IDS.has(rawPkgVideoId) ? rawPkgVideoId : null,
    pkg?.subject,
    pkg?.topic
  );
  const candidatesKey = candidates.join('|');

  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeTitleInput, setYoutubeTitleInput] = useState('');
  const [urlFeedback, setUrlFeedback] = useState(null);
  // 'checking' | 'available' | 'unavailable'
  const [videoAvailability, setVideoAvailability] = useState(() =>
    candidates.length > 0 ? 'checking' : 'unavailable'
  );
  const [verifiedMeta, setVerifiedMeta] = useState(null);
  const [workingVideoId, setWorkingVideoId] = useState(null);
  const [autoReplaced, setAutoReplaced] = useState(false);
  const persistedFixRef = useRef(null);

  const ytResource = {
    ...defaultYt,
    ...(pkg?.youtubeVideo || {}),
    videoId: workingVideoId
  };

  const searchQuery = pkg?.youtubeVideo?.searchQuery || defaultYt.searchQuery || '';

  // Verificación real contra YouTube (playabilityStatus): prueba el video del paquete y, si falla
  // o es un evento en directo expirado, busca automáticamente un video activo del tema.
  useEffect(() => {
    const list = candidatesKey ? candidatesKey.split('|') : [];
    if (list.length === 0 && !searchQuery) {
      setVideoAvailability('unavailable');
      setVerifiedMeta(null);
      setWorkingVideoId(null);
      return undefined;
    }

    const controller = new AbortController();
    setVideoAvailability('checking');
    setVerifiedMeta(null);
    setAutoReplaced(false);

    resolveWorkingYoutubeVideo(list, controller.signal, { searchQuery })
      .then((resolved) => {
        if (controller.signal.aborted) return;
        if (resolved.status === 'none' || !resolved.videoId) {
          setWorkingVideoId(null);
          setVideoAvailability('unavailable');
          return;
        }
        setWorkingVideoId(resolved.videoId);
        setVerifiedMeta(
          resolved.status === 'ok'
            ? { title: resolved.title, authorName: resolved.authorName }
            : null
        );
        setVideoAvailability('available');

        setAutoReplaced(resolved.status === 'ok' && resolved.videoId !== rawPkgVideoId);
      })
      .catch(() => {
        // Abortado al desmontar o cambiar de paquete
      });

    return () => controller.abort();
  }, [candidatesKey, rawPkgVideoId, searchQuery]);

  // Si el video original estaba caído, el docente guarda automáticamente el respaldo verificado
  // para que el estudiante reciba directamente un video que funciona.
  useEffect(() => {
    if (!isMirrorPreview || !autoReplaced || !workingVideoId || !pkg?.id) return;
    const fixKey = `${pkg.id}:${workingVideoId}`;
    if (persistedFixRef.current === fixKey || rawPkgVideoId === workingVideoId) return;
    persistedFixRef.current = fixKey;
    updatePackageYoutubeVideo(
      pkg.piarId,
      pkg.id,
      `https://www.youtube.com/watch?v=${workingVideoId}`,
      verifiedMeta?.title || ''
    );
  }, [
    isMirrorPreview,
    autoReplaced,
    workingVideoId,
    rawPkgVideoId,
    verifiedMeta,
    pkg?.id,
    pkg?.piarId,
    updatePackageYoutubeVideo
  ]);

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
    setUrlFeedback({ type: 'ok', text: 'Verificando el video en YouTube...' });
    const check = await checkYoutubeVideo(id);
    if (check.status === 'unavailable') {
      setUrlFeedback({
        type: 'error',
        text: 'Ese video no está disponible o tiene bloqueada la reproducción incrustada en YouTube. Prueba con otro enlace.'
      });
      return;
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
    if (isMirrorPreview) return;
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

        <div className="aia-media-header-right">
          <div className="aia-telemetry-chip">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              smart_display
            </span>
            <span className="aia-tabular">
              {activity?.videoCompleted ? '✓ Video completado' : 'Video de refuerzo'}
            </span>
          </div>
          {fullscreenButton}
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

      {/* Reproductor Real de YouTube + Puntos Clave en 2 columnas (sin scroll) */}
      <div className="aia-yt-split-layout aia-stage-scroll-body">
        <div className="aia-yt-player-col">
          {videoAvailability === 'checking' ? (
            <div className="aia-yt-empty-theater" role="status" aria-live="polite">
              <div className="aia-dots-spinner" aria-hidden="true">
                <span className="aia-dots-spinner-dot" />
                <span className="aia-dots-spinner-dot" />
                <span className="aia-dots-spinner-dot" />
                <span className="aia-dots-spinner-dot" />
                <span className="aia-dots-spinner-dot" />
                <span className="aia-dots-spinner-dot" />
                <span className="aia-dots-spinner-dot" />
                <span className="aia-dots-spinner-dot" />
              </div>
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
        </div>

        {/* Columna derecha: Título, Puntos clave IA y Confirmación */}
        <aside className="aia-yt-side-col">
          <div className="aia-yt-side-header">
            <h3 className="aia-video-scene-title">{displayTitle}</h3>
            <span className="aia-yt-channel">
              Canal: <strong>{displayChannel}</strong>
            </span>
          </div>

          <div className="aia-yt-moments-box">
            <div className="aia-yt-moments-head">
              <strong>Puntos clave para prestar atención</strong>
            </div>
            {Array.isArray(ytResource.keyMoments) && ytResource.keyMoments.length > 0 && (
              <ul className="aia-yt-moments-list">
                {ytResource.keyMoments.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="aia-yt-side-actions">
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
        </aside>
      </div>

      <div className="aia-slide-footer">
        {onBackToSlides ? (
          <button type="button" className="aia-btn-secondary" onClick={onBackToSlides}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_back
            </span>
            <span>Volver a Diapositivas</span>
          </button>
        ) : (
          <span className="aia-slide-footer-spacer" aria-hidden="true" />
        )}
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
