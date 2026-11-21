// Vercel Serverless Function: /api/youtube-resolve
// Verifica reproducibilidad real en YouTube (playabilityStatus === 'OK' y playableInEmbed === true)
// y busca automáticamente un video educativo activo acorde al tema cuando se genera un paquete IA.

const YT_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const FETCH_TIMEOUT_MS = 6000;
const DEFINITELY_DEAD_STATUSES = new Set([
  'UNPLAYABLE',
  'ERROR',
  'LIVE_STREAM_OFFLINE',
  'CONTENT_CHECK_REQUIRED'
]);
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9',
  Cookie: 'SOCS=CAI'
};

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: REQUEST_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkYoutubeOembed(videoId) {
  try {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`
    );
    if (!res.ok) return { ok: false, reason: `oembed_${res.status}` };
    const data = await res.json();
    return {
      ok: true,
      videoId,
      title: data?.title || null,
      authorName: data?.author_name || null
    };
  } catch {
    return { ok: false, reason: 'oembed_network' };
  }
}

async function checkYoutubePlayable(videoId) {
  if (!YT_ID_REGEX.test(videoId)) return { ok: false, reason: 'invalid_id' };
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`);
    if (!res.ok) return await checkYoutubeOembed(videoId);
    const html = await res.text();

    const statusMatch = html.match(/"playabilityStatus":\{"status":"([^"]+)"/);
    const status = statusMatch?.[1] || 'UNKNOWN';

    // Rechazar explícitamente videos eliminados, privados o eventos en directo expirados
    if (DEFINITELY_DEAD_STATUSES.has(status)) {
      return { ok: false, reason: status };
    }

    const embedMatch = html.match(/"playableInEmbed":(true|false)/);
    if (embedMatch && embedMatch[1] === 'false') {
      return { ok: false, reason: 'embed_disabled' };
    }

    // Evitar eventos en directo activos que pueden desaparecer después
    const isLiveNow = /"isLive":true/.test(html);
    if (isLiveNow) {
      return { ok: false, reason: 'live_stream' };
    }

    // Si en servidores en la nube (Vercel/AWS) YouTube pide login anti-bot (LOGIN_REQUIRED o UNKNOWN),
    // validar con oEmbed para no descartar falsamente videos que sí reproducen en el navegador del alumno
    if (status !== 'OK') {
      return await checkYoutubeOembed(videoId);
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);
    const title = decodeHtmlEntities(
      (titleMatch?.[1] || '').replace(/\s*-\s*YouTube\s*$/i, '')
    );
    const authorName = decodeHtmlEntities(channelMatch?.[1] || '');

    return {
      ok: true,
      videoId,
      title: title || null,
      authorName: authorName || null
    };
  } catch {
    return await checkYoutubeOembed(videoId);
  }
}

async function searchYoutubeCandidates(query) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return [];
  try {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`
    );
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"/g)];
    return Array.from(new Set(matches.map((m) => m[1]))).slice(0, 6);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const searchQuery = typeof body.searchQuery === 'string' ? body.searchQuery.trim() : '';
  const fallbackIds = Array.isArray(body.fallbackIds)
    ? body.fallbackIds.filter((id) => typeof id === 'string' && YT_ID_REGEX.test(id))
    : [];
  const preferSearch = Boolean(body.preferSearch);
  const strictOnly = Boolean(body.strictOnly);

  // Modo estricto: validar únicamente el enlace pegado por el docente
  if (strictOnly) {
    const check = await checkYoutubePlayable(videoId);
    if (check.ok) {
      return res.status(200).json({
        status: 'ok',
        videoId: check.videoId,
        title: check.title,
        authorName: check.authorName,
        source: 'verified'
      });
    }
    return res.status(200).json({ status: 'unavailable', reason: check.reason });
  }

  const tested = new Set();
  const tryIds = async (ids, source) => {
    for (const id of ids) {
      if (!YT_ID_REGEX.test(id) || tested.has(id)) continue;
      tested.add(id);
      const check = await checkYoutubePlayable(id);
      if (check.ok) {
        return {
          status: 'ok',
          videoId: check.videoId,
          title: check.title,
          authorName: check.authorName,
          source
        };
      }
    }
    return null;
  };

  // 1. Si se pide priorizar búsqueda (al generar nuevo paquete IA), buscar video exacto del tema primero
  if (preferSearch && searchQuery) {
    const foundIds = await searchYoutubeCandidates(searchQuery);
    const match = await tryIds(foundIds, 'search');
    if (match) return res.status(200).json(match);
  }

  // 2. Validar el videoId actual si existe
  if (videoId) {
    const direct = await tryIds([videoId], 'direct');
    if (direct) return res.status(200).json(direct);
  }

  // 3. Si el video actual falló y no se buscó aún, buscar por tema en YouTube
  if (!preferSearch && searchQuery) {
    const foundIds = await searchYoutubeCandidates(searchQuery);
    const match = await tryIds(foundIds, 'search');
    if (match) return res.status(200).json(match);
  }

  // 4. Último recurso: probar respaldos verificados de la misma asignatura
  const fallbackMatch = await tryIds(fallbackIds, 'fallback');
  if (fallbackMatch) return res.status(200).json(fallbackMatch);

  return res.status(200).json({ status: 'none', videoId: null });
}

