// Vercel Serverless Function: /api/aula-ia-generate
// Proxy seguro hacia Gemini Interactions API para el Aula Adaptativa IA.
// La clave GEMINI_API_KEY vive SOLO en las variables de entorno del servidor en Vercel.
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ROLES = new Set(['teacher', 'superadmin']);
const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'];
const MODEL_TIMEOUT_MS = { 'gemini-3.5-flash-lite': 45000, 'gemini-4-hydrogen': 50000 };
const MAX_PROMPT_CHARS = 60000;
const MAX_IMAGE_BASE64_CHARS = 8_000_000;

function extractInteractionText(result) {
  if (!result || typeof result !== 'object') return '';
  if (typeof result.output_text === 'string' && result.output_text.trim()) {
    return result.output_text.trim();
  }
  if (Array.isArray(result.steps)) {
    const modelSteps = result.steps.filter(
      (s) => s?.type === 'model_output' && Array.isArray(s.content)
    );
    const lastStep = modelSteps[modelSteps.length - 1];
    if (lastStep) {
      const texts = lastStep.content
        .filter((part) => part?.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text);
      if (texts.length > 0) return texts.join('\n').trim();
    }
  }
  if (Array.isArray(result.outputs)) {
    const texts = result.outputs
      .filter((out) => out?.type === 'text' && typeof out.text === 'string')
      .map((out) => out.text);
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

  const input = [{ type: 'text', text: prompt }];
  if (image && typeof image.data === 'string' && typeof image.mimeType === 'string') {
    if (image.data.length > MAX_IMAGE_BASE64_CHARS || !image.mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Imagen de evidencia no válida.' });
    }
    input.push({ type: 'image', data: image.data, mime_type: image.mimeType });
  }

  // 3. Llamar a Gemini Interactions API desde el servidor
  let lastError = 'Sin respuesta del modelo.';
  for (const model of CANDIDATE_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS[model] || 45000);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
          'Api-Revision': '2026-05-20'
        },
        body: JSON.stringify({
          model,
          input,
          store: false,
          response_format: { type: 'text', mime_type: 'application/json' }
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        lastError = `${model} (${response.status}): ${errText.slice(0, 180)}`;
        continue;
      }

      const payload = await response.json();
      const rawText = extractInteractionText(payload);
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

