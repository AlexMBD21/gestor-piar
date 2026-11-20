import { buildDefaultYoutubeVideo, extractYoutubeVideoId } from './piarAiEngine';

// IDs que se confirmaron caídos (404 en YouTube oEmbed) y nunca deben volver a mostrarse
export const DEAD_YOUTUBE_VIDEO_IDS = new Set(['aG3j675kZbc', 'R9OHX5HYwvk']);

const CHECK_TIMEOUT_MS = 6000;

/**
 * Verifica contra YouTube oEmbed que el video exista y permita incrustación.
 * Devuelve { status: 'ok' | 'unavailable' | 'offline', title, authorName }.
 */
export async function checkYoutubeVideo(videoId, outerSignal) {
  const id = extractYoutubeVideoId(videoId);
  if (!id || DEAD_YOUTUBE_VIDEO_IDS.has(id)) return { status: 'unavailable' };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline' };
  }

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
    // Timeout o error de red: tratar como sin conexión para no bloquear el aula
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
 * Recorre los candidatos y devuelve el primero que YouTube confirma como disponible.
 * Resultado: { videoId, title, authorName, status: 'ok' | 'offline' | 'none' }.
 */
export async function resolveWorkingYoutubeVideo(candidates = [], outerSignal) {
  for (const id of candidates) {
    const result = await checkYoutubeVideo(id, outerSignal);
    if (result.status === 'ok') {
      return { videoId: id, title: result.title, authorName: result.authorName, status: 'ok' };
    }
    if (result.status === 'offline') {
      // Sin conexión no se puede verificar: usar el primer candidato sin bloquear
      return { videoId: candidates[0] || null, status: 'offline' };
    }
  }
  return { videoId: null, status: 'none' };
}

/**
 * Asegura que el youtubeVideo de un paquete recién generado apunte a un video que funciona.
 */
export async function ensureVerifiedPackageYoutube(youtubeVideo = {}, subject = '', topic = '') {
  const candidates = buildYoutubeCandidates(youtubeVideo?.videoId, subject, topic);
  try {
    const resolved = await resolveWorkingYoutubeVideo(candidates);
    if (resolved.status === 'ok') {
      return {
        ...youtubeVideo,
        videoId: resolved.videoId,
        channelTitle: resolved.authorName || youtubeVideo?.channelTitle,
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

