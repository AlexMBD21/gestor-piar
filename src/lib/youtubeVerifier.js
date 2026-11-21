import { buildDefaultYoutubeVideo, extractYoutubeVideoId } from './piarAiEngine';

// IDs confirmados como caídos o eventos en directo expirados que nunca deben volver a mostrarse
export const DEAD_YOUTUBE_VIDEO_IDS = new Set(['aG3j675kZbc', 'R9OHX5HYwvk', '11wUdm7gBmI']);

const CHECK_TIMEOUT_MS = 6000;
const RESOLVE_API_TIMEOUT_MS = 16000;
let resolveApiUnavailable = false;

/**
 * Llama al endpoint de servidor `/api/youtube-resolve` (en Vercel) que valida el estado real
 * de reproducción (`playabilityStatus === 'OK'` y `playableInEmbed === true`) y busca videos
 * activos del tema exacto sin bloqueos CORS.
 */
async function callYoutubeResolveApi(payload, outerSignal) {
  if (resolveApiUnavailable || typeof fetch !== 'function') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener?.('abort', onOuterAbort);
  const timer = setTimeout(() => controller.abort(), RESOLVE_API_TIMEOUT_MS);

  try {
    const res = await fetch('/api/youtube-resolve', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 404 || res.status === 405) {
      resolveApiUnavailable = true;
      return null;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      resolveApiUnavailable = true;
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (outerSignal?.aborted) throw err;
    return null;
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener?.('abort', onOuterAbort);
  }
}

/**
 * Verifica que el video exista, no sea un evento en directo expirado y permita incrustación.
 * Primero usa `/api/youtube-resolve` (validación real de `playabilityStatus`) y cae a oEmbed en dev local.
 */
export async function checkYoutubeVideo(videoId, outerSignal) {
  const id = extractYoutubeVideoId(videoId);
  if (!id || DEAD_YOUTUBE_VIDEO_IDS.has(id)) return { status: 'unavailable' };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline' };
  }

  // 1. Validación real desde servidor (detecta "Este evento en directo ya no está disponible")
  const serverResult = await callYoutubeResolveApi(
    { videoId: id, strictOnly: true },
    outerSignal
  );
  if (serverResult?.status === 'ok') {
    return {
      status: 'ok',
      title: serverResult.title || null,
      authorName: serverResult.authorName || null
    };
  }
  if (serverResult?.status === 'unavailable') {
    return { status: 'unavailable', reason: serverResult.reason };
  }

  // 2. Respaldo cliente vía oEmbed (para desarrollo local con `vite dev`)
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener?.('abort', onOuterAbort);
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${id}`
      )}&format=json`,
      { signal: controller.signal }
    );
    if (!res.ok) return { status: 'unavailable' };
    const data = await res.json();
    return {
      status: 'ok',
      title: data?.title || null,
      authorName: data?.author_name || null
    };
  } catch (err) {
    if (outerSignal?.aborted) throw err;
    return { status: 'offline' };
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener?.('abort', onOuterAbort);
  }
}

/**
 * Construye la lista ordenada de candidatos: primero el video del paquete y luego los
 * respaldos verificados de la misma asignatura (nunca de otra materia).
 */
export function buildYoutubeCandidates(preferredId, subject = '', topic = '') {
  const defaults = buildDefaultYoutubeVideo(subject, topic);
  const list = [
    extractYoutubeVideoId(preferredId),
    defaults.videoId,
    ...(defaults.fallbackVideoIds || [])
  ].filter((id) => id && !DEAD_YOUTUBE_VIDEO_IDS.has(id));
  return Array.from(new Set(list));
}

/**
 * Resuelve un video de YouTube realmente reproducible.
 * Si `/api/youtube-resolve` está disponible, valida `playabilityStatus` y puede buscar
 * automáticamente un video activo acorde a `searchQuery`.
 */
export async function resolveWorkingYoutubeVideo(
  candidates = [],
  outerSignal,
  { searchQuery = '', preferSearch = false } = {}
) {
  const primaryId = candidates[0] || '';
  const fallbackIds = candidates.slice(1);

  const serverResult = await callYoutubeResolveApi(
    {
      videoId: primaryId,
      searchQuery,
      fallbackIds,
      preferSearch
    },
    outerSignal
  );

  if (serverResult?.status === 'ok' && serverResult.videoId) {
    return {
      videoId: serverResult.videoId,
      title: serverResult.title || null,
      authorName: serverResult.authorName || null,
      status: 'ok'
    };
  }
  if (serverResult?.status === 'none') {
    return { videoId: null, status: 'none' };
  }

  // Respaldo local (vite dev sin servidor Vercel)
  for (const id of candidates) {
    const result = await checkYoutubeVideo(id, outerSignal);
    if (result.status === 'ok') {
      return { videoId: id, title: result.title, authorName: result.authorName, status: 'ok' };
    }
    if (result.status === 'offline') {
      return { videoId: candidates[0] || null, status: 'offline' };
    }
  }
  return { videoId: null, status: 'none' };
}

/**
 * Asegura que el youtubeVideo de un paquete recién generado apunte a un video activo
 * y acorde al tema exacto del PIAR.
 */
export async function ensureVerifiedPackageYoutube(youtubeVideo = {}, subject = '', topic = '') {
  const defaults = buildDefaultYoutubeVideo(subject, topic);
  const candidates = buildYoutubeCandidates(youtubeVideo?.videoId, subject, topic);
  const searchQuery = youtubeVideo?.searchQuery || defaults.searchQuery;

  try {
    const resolved = await resolveWorkingYoutubeVideo(candidates, undefined, {
      searchQuery,
      preferSearch: true
    });
    if (resolved.status === 'ok' && resolved.videoId) {
      return {
        ...youtubeVideo,
        videoId: resolved.videoId,
        title: resolved.title || youtubeVideo?.title || defaults.title,
        channelTitle: resolved.authorName || youtubeVideo?.channelTitle || 'YouTube Educativo',
        verifiedTitle: resolved.title || null,
        verifiedAt: new Date().toISOString()
      };
    }
    if (resolved.status === 'none') {
      return { ...youtubeVideo, videoId: null };
    }
  } catch {
    // Mantener el video original si la verificación no pudo completarse
  }
  return youtubeVideo;
}
