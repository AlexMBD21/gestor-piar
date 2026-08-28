-- ==========================================
-- 1. TABLAS DEL SISTEMA
-- ==========================================

-- Tabla de perfiles de usuario (Profesores y Administradores)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'teacher', -- 'superadmin' | 'teacher'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de historial de accesos
CREATE TABLE public.session_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de PIARs (planes individuales)
CREATE TABLE public.piars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  grado       TEXT,
  data        JSONB NOT NULL, -- Objeto completo estructurado del PIAR
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  diligenciado  BOOLEAN DEFAULT false -- true cuando el profesor ha guardado al menos una edición
);

-- Tabla de historial de ediciones de PIARs
CREATE TABLE public.piar_edit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piar_id     UUID REFERENCES public.piars(id) ON DELETE CASCADE,
  editor_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piar_edit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. FUNCIÓN AUXILIAR PARA VERIFICAR SUPERADMIN
-- (SECURITY DEFINER evita la recursión infinita en RLS)
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==========================================
-- 3. POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- Políticas para Profiles
CREATE POLICY "Superadmins can do everything on profiles"
  ON public.profiles FOR ALL
  USING (public.is_superadmin());

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Políticas para Session Logs
CREATE POLICY "Superadmins can view all logs"
  ON public.session_logs FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Users can insert their own logs"
  ON public.session_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para PIARs
CREATE POLICY "Teachers can CRUD own piars or Superadmins can do all"
  ON public.piars FOR ALL
  USING (auth.uid() = owner_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = owner_id OR public.is_superadmin());

-- Políticas para Edit Logs
-- Cualquier profesor autenticado puede insertar un log cuando edita
CREATE POLICY "Authenticated users can insert edit logs"
  ON public.piar_edit_logs FOR INSERT
  WITH CHECK (auth.uid() = editor_id);

-- Cualquier usuario autenticado puede ver el historial de ediciones de todos los PIARs
CREATE POLICY "View all piar edit logs"
  ON public.piar_edit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==========================================
-- 3. TRIGGERS AUTOMÁTICOS
-- ==========================================

-- Crear fila en 'profiles' al registrar nuevo usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Profesor'),
    new.email,
    'teacher'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. FUNCIONES DE ADMINISTRACIÓN (RPC)
-- ==========================================

-- Crear un profesor desde el panel del SuperAdmin
CREATE OR REPLACE FUNCTION public.admin_create_teacher(
  teacher_email TEXT,
  teacher_password TEXT,
  teacher_name TEXT
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo el SuperAdministrador puede realizar esta acción.';
  END IF;

  -- Crear usuario en auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    teacher_email,
    crypt(teacher_password, gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', teacher_name),
    now(),
    now()
  ) RETURNING id INTO new_user_id;

  -- Modificar el perfil recién creado (email y nombre ya se insertan por trigger)
  UPDATE public.profiles
  SET full_name = teacher_name, email = teacher_email
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modificar profesor (nombre, correo, contraseña) desde Admin
CREATE OR REPLACE FUNCTION public.admin_update_teacher(
  teacher_id UUID,
  new_email TEXT,
  new_password TEXT,
  new_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo el SuperAdministrador puede realizar esta acción.';
  END IF;

  -- Actualizar perfil público
  UPDATE public.profiles
  SET full_name = new_name, email = new_email
  WHERE id = teacher_id;

  -- Actualizar tabla de Auth
  UPDATE auth.users
  SET email = new_email,
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', new_name)
  WHERE id = teacher_id;

  -- Actualizar contraseña si se provee
  IF new_password IS NOT NULL AND new_password <> '' THEN
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = teacher_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar un profesor desde Admin
CREATE OR REPLACE FUNCTION public.admin_delete_teacher(
  teacher_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo el SuperAdministrador puede realizar esta acción.';
  END IF;

  -- Borrar de auth.users (borrará en cascada perfiles, logs y piars)
  DELETE FROM auth.users WHERE id = teacher_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
