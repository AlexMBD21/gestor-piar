-- Migración: Gestión de Cuentas Estudiantiles (Documento + PIN) y Sincronización Segura de Actividad
-- No expone datos clínicos/médicos del Anexo 1 al estudiante; solo entrega paquetes publicados y su actividad.

create table if not exists public.student_access_credentials (
  piar_id uuid primary key references public.piars(id) on delete cascade,
  student_doc text not null unique,
  access_pin text not null check (char_length(trim(access_pin)) between 4 and 6),
  is_active boolean not null default true,
  last_login_at timestamptz,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_access_doc
  on public.student_access_credentials (student_doc);

alter table public.student_access_credentials enable row level security;

drop policy if exists "Docentes y superadmin gestionan credenciales estudiantiles"
  on public.student_access_credentials;

create policy "Docentes y superadmin gestionan credenciales estudiantiles"
  on public.student_access_credentials
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('teacher', 'superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('teacher', 'superadmin')
    )
  );

-- RPC 1: Autenticación segura del estudiante por Documento + PIN
create or replace function public.student_login_by_doc(p_doc text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc text := trim(coalesce(p_doc, ''));
  v_pin text := trim(coalesce(p_pin, ''));
  v_cred public.student_access_credentials%rowtype;
  v_piar public.piars%rowtype;
  v_published jsonb := '[]'::jsonb;
  v_activity jsonb := '{}'::jsonb;
begin
  if v_doc = '' or v_pin = '' then
    return jsonb_build_object(
      'ok', false,
      'code', 'MISSING_FIELDS',
      'message', 'Ingresa tu número de documento y tu PIN de acceso.'
    );
  end if;

  select *
    into v_cred
    from public.student_access_credentials
   where student_doc = v_doc
   limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'NOT_FOUND',
      'message', 'No encontramos una cuenta asignada a ese número de documento. Pídele a tu profesor que active tu acceso.'
    );
  end if;

  if not v_cred.is_active then
    return jsonb_build_object(
      'ok', false,
      'code', 'DISABLED',
      'message', 'Tu acceso al Aula Adaptativa está desactivado temporalmente. Consulta con tu profesor.'
    );
  end if;

  if v_cred.access_pin <> v_pin then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_PIN',
      'message', 'El PIN ingresado no es correcto. Verifica los dígitos con tu profesor.'
    );
  end if;

  select *
    into v_piar
    from public.piars
   where id = v_cred.piar_id
   limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'PIAR_NOT_FOUND',
      'message', 'No se encontró el expediente asociado a esta cuenta.'
    );
  end if;

  update public.student_access_credentials
     set last_login_at = now()
   where piar_id = v_cred.piar_id;

  select coalesce(jsonb_agg(pkg), '[]'::jsonb)
    into v_published
    from jsonb_array_elements(coalesce(v_piar.data->'aula_ia_packages', '[]'::jsonb)) as pkg
   where coalesce(pkg->>'status', '') = 'published';

  v_activity := coalesce(v_piar.data->'aula_ia_activity', '{}'::jsonb);

  return jsonb_build_object(
    'ok', true,
    'piar_id', v_piar.id,
    'student_doc', v_cred.student_doc,
    'student_name', coalesce(nullif(v_piar.nombre, ''), 'Estudiante'),
    'student_grade', coalesce(nullif(v_piar.grado, ''), 'Secundaria'),
    'published_packages', v_published,
    'activity_map', v_activity
  );
end;
$$;

-- RPC 2: Sincronización de progreso e intentos de examen del estudiante hacia Supabase
create or replace function public.save_student_activity(
  p_doc text,
  p_pin text,
  p_package_id text,
  p_activity jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc text := trim(coalesce(p_doc, ''));
  v_pin text := trim(coalesce(p_pin, ''));
  v_cred public.student_access_credentials%rowtype;
begin
  if v_doc = '' or v_pin = '' or trim(coalesce(p_package_id, '')) = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  select *
    into v_cred
    from public.student_access_credentials
   where student_doc = v_doc
     and access_pin = v_pin
     and is_active = true
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  update public.piars
     set data = jsonb_set(
       jsonb_set(
         coalesce(data, '{}'::jsonb),
         '{aula_ia_activity}',
         coalesce(data->'aula_ia_activity', '{}'::jsonb),
         true
       ),
       array['aula_ia_activity', p_package_id],
       coalesce(p_activity, '{}'::jsonb),
       true
     )
   where id = v_cred.piar_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.student_login_by_doc(text, text) to anon, authenticated;
grant execute on function public.save_student_activity(text, text, text, jsonb) to anon, authenticated;

