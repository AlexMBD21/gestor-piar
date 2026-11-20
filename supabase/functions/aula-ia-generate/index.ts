// Edge Function: aula-ia-generate
// Proxy seguro hacia Gemini API para el Aula Adaptativa IA.
// La clave GEMINI_API_KEY vive SOLO como secreto de Supabase (nunca en el navegador).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'npm:@google/genai@^3.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = ['teacher', 'superadmin']
const CANDIDATE_MODELS = ['gemini-4-hydrogen', 'gemini-3.5-flash-lite']
const MAX_PROMPT_CHARS = 60000
const MAX_IMAGE_BASE64_CHARS = 8_000_000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseJsonText(raw: string) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405)
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      return json({ error: 'GEMINI_API_KEY no está configurada en los secretos de Supabase.' }, 503)
    }

    // 1. Verificar sesión del docente
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autorizado.' }, 401)

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('APP_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) return json({ error: 'Token inválido.' }, 401)

    const { data: profile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!ALLOWED_ROLES.includes(profile?.role)) {
      return json({ error: 'Solo docentes pueden generar materiales con IA.' }, 403)
    }

    // 2. Validar entrada
    const { prompt, image } = await req.json()
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return json({ error: 'El prompt es obligatorio.' }, 400)
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return json({ error: 'El prompt excede el tamaño permitido.' }, 413)
    }

    const input: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }]
    if (image && typeof image.data === 'string' && typeof image.mimeType === 'string') {
      if (image.data.length > MAX_IMAGE_BASE64_CHARS || !image.mimeType.startsWith('image/')) {
        return json({ error: 'Imagen de evidencia no válida.' }, 400)
      }
      input.push({ type: 'image', data: image.data, mime_type: image.mimeType })
    }

    // 3. Llamar a Gemini (Interactions API) con salida JSON
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    let lastError = 'Sin respuesta del modelo.'

    for (const model of CANDIDATE_MODELS) {
      try {
        const interaction = await ai.interactions.create({
          model,
          input,
          store: false,
          response_format: { type: 'text', mime_type: 'application/json' },
        })
        const raw = interaction.output_text
        if (raw) {
          return json({ data: parseJsonText(raw), model })
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        console.warn(`[aula-ia-generate] ${model} falló:`, lastError)
      }
    }

    return json({ error: `Gemini no devolvió un resultado válido: ${lastError}` }, 502)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error interno.' }, 500)
  }
})

