// Vercel Serverless Function: /api/aula-ia-generate
// Proxy seguro hacia Gemini Interactions API para el Aula Adaptativa IA.
// La clave GEMINI_API_KEY vive SOLO en las variables de entorno del servidor en Vercel.
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ROLES = new Set(['teacher', 'superadmin']);
const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const MODEL_TIMEOUT_MS = {
  'gemini-3.1-flash-lite': 25000,
  'gemini-3.5-flash-lite': 18000,
  'gemini-3.8-flash': 15000
};
const MAX_PROMPT_CHARS = 60000;
const MAX_IMAGE_BASE64_CHARS = 8_000_000;

function extractGenerateContentText(result) {
  if (!result || typeof result !== 'object') return '';
  const parts = result.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const texts = parts
      .filter((p) => typeof p?.text === 'string' && !p.thought)
      .map((p) => p.text);
    if (texts.length > 0) return texts.join('\n').trim();
  }
  return '';
}

function parseJsonObject(rawText) {
  const cleaned = String(rawText || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error('JSON de respuesta incompleto.');
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return res
      .status(503)
      .json({ error: 'GEMINI_API_KEY no está configurada en Vercel.' });
  }

  // 1. Verificar sesión docente en Supabase (si hay credenciales de Supabase disponibles)
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (supabaseUrl && supabaseAnonKey) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Sesión docente requerida.' });
    }
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: String(authHeader) } }
    });
    const {
      data: { user },
      error: userError
    } = await callerClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Token de sesión inválido.' });
    }

    const { data: profile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!ALLOWED_ROLES.has(profile?.role)) {
      return res.status(403).json({ error: 'Solo docentes pueden generar materiales con IA.' });
    }
  }

  // 2. Validar entrada
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { prompt, image } = body;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'El prompt es obligatorio.' });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'El prompt excede el tamaño permitido.' });
  }

  const parts = [{ text: prompt }];
  if (image && typeof image.data === 'string' && typeof image.mimeType === 'string') {
    if (image.data.length > MAX_IMAGE_BASE64_CHARS || !image.mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Imagen de evidencia no válida.' });
    }
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
  }

  // 3. Llamar a Gemini generateContent API desde el servidor con rotación automática ante picos de demanda
  let lastError = 'Sin respuesta del modelo.';
  for (const model of CANDIDATE_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS[model] || 22000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.4
            }
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        lastError = `${model} (${response.status}): ${errText.slice(0, 180)}`;
        continue;
      }

      const payload = await response.json();
      const rawText = extractGenerateContentText(payload);
      if (!rawText) {
        lastError = `${model} devolvió respuesta vacía.`;
        continue;
      }

      const parsed = parseJsonObject(rawText);
      return res.status(200).json({ data: parsed, model });
    } catch (err) {
      lastError = err?.name === 'AbortError' ? `${model}: tiempo agotado` : String(err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }

  return res.status(502).json({ error: `Gemini no devolvió un resultado válido: ${lastError}` });
}

