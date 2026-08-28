import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verificar que el llamador tiene un token válido
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente con el token del usuario llamador (para verificar que es superadmin)
    const callerClient = createClient(supabaseUrl, Deno.env.get('APP_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar rol superadmin
    const { data: profile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Solo el SuperAdministrador puede crear profesores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Leer parámetros del body
    const { teacher_email, teacher_password, teacher_name } = await req.json()

    if (!teacher_email || !teacher_password || !teacher_name) {
      return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente admin con service role key (puede crear usuarios)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Verificar si el email ya está en uso
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email === teacher_email.trim().toLowerCase())
    if (emailExists) {
      return new Response(JSON.stringify({ error: 'Este correo electrónico ya está en uso.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Crear el usuario via Admin API (hash correcto, email confirmado automáticamente)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: teacher_email.trim(),
      password: teacher_password,
      email_confirm: true,
      user_metadata: { full_name: teacher_name.trim() },
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Esperar brevemente al trigger handle_new_user
    await new Promise(resolve => setTimeout(resolve, 400))

    // Actualizar el perfil con nombre correcto y rol teacher
    await adminClient
      .from('profiles')
      .update({ full_name: teacher_name.trim(), email: teacher_email.trim() })
      .eq('id', newUser.user!.id)

    return new Response(JSON.stringify({ id: newUser.user!.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Error interno.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
