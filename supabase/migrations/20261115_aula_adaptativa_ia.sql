-- Migración: Apartado 2 - Aula Adaptativa IA (Gemini API + Telemetría + Exámenes Multi-Intento)
-- Protege las tablas actuales (piars, piar_edit_logs) como fuente inmutable (Solo Lectura).

create table if not exists public.piar_ai_packages (
  id text primary key,
  piar_id uuid references public.piars(id) on delete cascade,
  student_doc text,
  subject text not null,
  topic text not null,
  carencia_observada text,
  teacher_notes text,
  status text not null default 'published' check (status in ('draft', 'published')),
  max_attempts integer not null default 3,
  engine_source text,
  teacher_diagnosis jsonb not null default '{}'::jsonb,
  student_diagnosis jsonb not null default '{}'::jsonb,
  slides jsonb not null default '[]'::jsonb,
  audio_capsule jsonb not null default '{}'::jsonb,
  video_guide jsonb not null default '{}'::jsonb,
  quiz_questions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz default now()
);

create table if not exists public.piar_student_activity (
  package_id text primary key references public.piar_ai_packages(id) on delete cascade,
  piar_id uuid references public.piars(id) on delete cascade,
  slides_viewed jsonb not null default '[]'::jsonb,
  slides_time_sec integer not null default 0,
  audio_play_count integer not null default 0,
  audio_max_percent integer not null default 0,
  audio_completed boolean not null default false,
  video_play_count integer not null default 0,
  video_max_percent integer not null default 0,
  video_scenes_viewed jsonb not null default '[]'::jsonb,
  video_completed boolean not null default false,
  attempts jsonb not null default '[]'::jsonb,
  last_interaction_at timestamptz not null default now()
);

alter table public.piar_ai_packages enable row level security;
alter table public.piar_student_activity enable row level security;

