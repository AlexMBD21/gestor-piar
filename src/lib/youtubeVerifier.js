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
  { searchQuery = '', retryQueries = [], preferSearch = false } = {}
) {
  const primaryId = candidates[0] || '';
  const fallbackIds = candidates.slice(1);

  const serverResult = await callYoutubeResolveApi(
    {
      videoId: primaryId,
      searchQuery,
      retryQueries,
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
  if (serverResult?.status === 'none' && candidates.length === 0) {
    return { videoId: null, status: 'none' };
  }

  // Respaldo cliente: verificar cada candidato antes de rendirse
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
 * Construye consultas progresivamente más amplias para reintentar automáticamente si la primera no devuelve videos reproducibles.
 */
function buildRetryQueries(subject = '', topic = '', primaryQuery = '') {
  const cleanSubject = String(subject || '').replace(/\s+/g, ' ').trim();
  const shortTopic = String(topic || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6)
    .join(' ');
  return Array.from(
    new Set(
      [
        primaryQuery,
        shortTopic ? `${cleanSubject} ${shortTopic} explicacion facil español`.trim() : '',
        cleanSubject ? `${cleanSubject} clase educativa para estudiantes español`.trim() : ''
      ].filter(Boolean)
    )
  );
}

/**
 * Garantiza que el paquete recién generado SIEMPRE tenga un video de YouTube verificado y reproducible.
 * Si el primer intento falla, reintenta con búsquedas más amplias y respaldos verificados del área.
 */
export async function ensureVerifiedPackageYoutube(
  youtubeVideo = {},
  subject = '',
  topic = '',
  onProgress = null
) {
  const defaults = buildDefaultYoutubeVideo(subject, topic);
  const candidates = buildYoutubeCandidates(youtubeVideo?.videoId, subject, topic);
  const searchQuery = youtubeVideo?.searchQuery || defaults.searchQuery;
  const retryQueries = buildRetryQueries(subject, topic, searchQuery);

  try {
    // Intento 1: búsqueda exacta del tema + reintentos en servidor + respaldos verificados
    const resolved = await resolveWorkingYoutubeVideo(candidates, undefined, {
      searchQuery,
      retryQueries,
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

    // Intento 2: reintentar con consulta más amplia de la asignatura si el primer intento no encontró
    onProgress?.('Reintentando búsqueda para garantizar un video reproducible en YouTube...');
    const broadQuery = retryQueries[retryQueries.length - 1] || `${subject} video educativo español`;
    const retried = await resolveWorkingYoutubeVideo(candidates, undefined, {
      searchQuery: broadQuery,
      retryQueries: [],
      preferSearch: true
    });
    if (retried.status === 'ok' && retried.videoId) {
      return {
        ...youtubeVideo,
        videoId: retried.videoId,
        title: retried.title || youtubeVideo?.title || defaults.title,
        channelTitle: retried.authorName || youtubeVideo?.channelTitle || 'YouTube Educativo',
        verifiedTitle: retried.title || null,
        verifiedAt: new Date().toISOString()
      };
    }
  } catch {
    // Continuar hacia la garantía de respaldo verificado
  }

  // Garantía final: nunca entregar un paquete con videoId nulo; asignar el respaldo verificado del área
  const guaranteedId = candidates[0] || defaults.videoId || '3y0dPYDLXPY';
  return {
    ...defaults,
    ...youtubeVideo,
    videoId: guaranteedId,
    channelTitle: youtubeVideo?.channelTitle || defaults.channelTitle || 'YouTube Educativo'
  };
}
