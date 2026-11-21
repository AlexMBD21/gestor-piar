// Servicio de Gestión y Autenticación de Cuentas Estudiantiles (Documento + PIN)
import localforage from 'localforage';
import { supabase } from './supabaseClient';

const LOCAL_CREDS_KEY = 'piar_student_creds_local_v1';
const STORAGE_PACKAGES_KEY = 'piar_aula_ia_packages_v3';
const STORAGE_ACTIVITY_KEY = 'piar_aula_ia_activity_v3';

export function normalizeStudentDoc(raw = '') {
  return String(raw || '').replace(/\s+/g, '').trim();
}

export function normalizePin(raw = '') {
  return String(raw || '').replace(/\D+/g, '').slice(0, 6);
}

export function generateRandomPin(length = 4) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function readLocalCredentialsMap() {
  try {
    const raw = window.localStorage.getItem(LOCAL_CREDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalCredentialsMap(map) {
  try {
    window.localStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(map));
  } catch {
    // Ignorar cuota de almacenamiento
  }
}

function isSupabaseMissingRelationOrRpc(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache')
  );
}

/**
 * Obtiene la credencial de acceso actual de un estudiante (Supabase con respaldo local).
 */
export async function getStudentCredential(piarId) {
  if (!piarId) return null;
  const localMap = readLocalCredentialsMap();

  try {
    const { data, error } = await supabase
      .from('student_access_credentials')
      .select('*')
      .eq('piar_id', piarId)
      .maybeSingle();

    if (!error && data) {
      const normalized = {
        piarId: data.piar_id,
        studentDoc: data.student_doc,
        accessPin: data.access_pin,
        isActive: Boolean(data.is_active),
        lastLoginAt: data.last_login_at || null,
        updatedAt: data.updated_at || null,
        syncedCloud: true
      };
      writeLocalCredentialsMap({ ...localMap, [piarId]: normalized });
      return normalized;
    }
  } catch {
    // Usar respaldo local
  }

  return localMap[piarId] || null;
}

/**
 * Crea o actualiza el acceso de un estudiante (Documento + PIN + estado activo).
 */
export async function saveStudentCredential({
  piarId,
  studentDoc,
  accessPin,
  isActive = true,
  studentName = 'Estudiante',
  studentGrade = ''
}) {
  const cleanDoc = normalizeStudentDoc(studentDoc);
  const cleanPin = normalizePin(accessPin);

  if (!piarId) {
    return { ok: false, error: 'No se encontró el expediente del estudiante.' };
  }
  if (cleanDoc.length < 4) {
    return { ok: false, error: 'El número de documento debe tener al menos 4 caracteres.' };
  }
  if (cleanPin.length < 4 || cleanPin.length > 6) {
    return { ok: false, error: 'El PIN debe tener entre 4 y 6 dígitos numéricos.' };
  }

  const nowIso = new Date().toISOString();
  let syncedCloud = false;
  let cloudWarning = null;

  try {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('student_access_credentials').upsert(
      {
        piar_id: piarId,
        student_doc: cleanDoc,
        access_pin: cleanPin,
        is_active: Boolean(isActive),
        updated_by: userData?.user?.id || null,
        updated_at: nowIso
      },
      { onConflict: 'piar_id' }
    );

    if (!error) {
      syncedCloud = true;
    } else if (error.code === '23505') {
      return {
        ok: false,
        error: 'Ese número de documento ya está asignado a otro estudiante.'
      };
    } else if (isSupabaseMissingRelationOrRpc(error)) {
      cloudWarning =
        'Guardado en este equipo. Ejecuta la migración SQL de acceso estudiantil en Supabase para habilitar el ingreso desde otros dispositivos.';
    } else {
      cloudWarning = error.message || 'Guardado localmente (sincronización en nube pendiente).';
    }
  } catch {
    cloudWarning = 'Sin conexión a la nube; acceso guardado localmente en este dispositivo.';
  }

  const localMap = readLocalCredentialsMap();
  const record = {
    piarId,
    studentDoc: cleanDoc,
    accessPin: cleanPin,
    isActive: Boolean(isActive),
    studentName,
    studentGrade,
    lastLoginAt: localMap[piarId]?.lastLoginAt || null,
    updatedAt: nowIso,
    syncedCloud
  };
  writeLocalCredentialsMap({ ...localMap, [piarId]: record });

  return { ok: true, credential: record, syncedCloud, warning: cloudWarning };
}

/**
 * Autentica al estudiante por Documento + PIN y retorna sus paquetes publicados y actividad real.
 */
export async function authenticateStudent({ documentNumber, accessPin }) {
  const cleanDoc = normalizeStudentDoc(documentNumber);
  const cleanPin = normalizePin(accessPin);

  if (!cleanDoc) {
    return { data: null, error: { message: 'Ingresa tu número de documento de identidad.' } };
  }
  if (cleanPin.length < 4) {
    return { data: null, error: { message: 'Ingresa tu PIN de 4 a 6 dígitos.' } };
  }

  // 1. Intentar autenticación segura vía RPC en Supabase
  try {
    const { data, error } = await supabase.rpc('student_login_by_doc', {
      p_doc: cleanDoc,
      p_pin: cleanPin
    });

    if (!error && data && typeof data === 'object') {
      if (data.ok) {
        return {
          data: {
            role: 'student',
            piarId: data.piar_id,
            studentName: data.student_name || 'Estudiante',
            studentGrade: data.student_grade || '',
            studentDoc: data.student_doc || cleanDoc,
            accessPin: cleanPin,
            publishedPackages: Array.isArray(data.published_packages)
              ? data.published_packages
              : [],
            activityMap:
              data.activity_map && typeof data.activity_map === 'object'
                ? data.activity_map
                : {},
            source: 'supabase'
          },
          error: null
        };
      }

      // Respuesta explícita del servidor (PIN incorrecto, desactivado o no encontrado)
      // Si el docente acaba de crear la cuenta solo localmente sin correr migración, el bloque local solo corre si RPC no existe.
      return {
        data: null,
        error: {
          code: data.code,
          message: data.message || 'No fue posible validar tu acceso.'
        }
      };
    }

    if (error && !isSupabaseMissingRelationOrRpc(error)) {
      // Continuar a respaldo local solo si hay falla de red/offline
    }
  } catch {
    // Continuar a respaldo local si está offline o RPC no existe aún
  }

  // 2. Respaldo local estricto (solo contra credenciales realmente creadas por el docente en este equipo)
  const localMap = readLocalCredentialsMap();
  const matchedCred = Object.values(localMap).find(
    (c) => normalizeStudentDoc(c?.studentDoc) === cleanDoc
  );

  if (!matchedCred) {
    return {
      data: null,
      error: {
        code: 'NOT_FOUND',
        message:
          'No encontramos una cuenta asignada a ese número de documento. Pídele a tu profesor que active tu acceso y te comparta tu PIN.'
      }
    };
  }

  if (!matchedCred.isActive) {
    return {
      data: null,
      error: {
        code: 'INACTIVE',
        message:
          'Tu acceso al Aula Adaptativa está desactivado temporalmente. Consulta con tu profesor.'
      }
    };
  }

  if (normalizePin(matchedCred.accessPin) !== cleanPin) {
    return {
      data: null,
      error: {
        code: 'INVALID_PIN',
        message: 'El PIN ingresado no es correcto. Verifica los dígitos con tu profesor.'
      }
    };
  }

  // Cargar paquetes publicados y actividad real desde localforage
  let publishedPackages = [];
  let activityMap = {};
  try {
    const storedPackages = (await localforage.getItem(STORAGE_PACKAGES_KEY)) || {};
    const storedActivity = (await localforage.getItem(STORAGE_ACTIVITY_KEY)) || {};
    const studentPkgs = Array.isArray(storedPackages[matchedCred.piarId])
      ? storedPackages[matchedCred.piarId]
      : [];
    publishedPackages = studentPkgs.filter((p) => p?.status === 'published');
    publishedPackages.forEach((p) => {
      if (storedActivity[p.id]) {
        activityMap[p.id] = storedActivity[p.id];
      }
    });
  } catch {
    // Ignorar error de lectura local
  }

  return {
    data: {
      role: 'student',
      piarId: matchedCred.piarId,
      studentName: matchedCred.studentName || 'Estudiante',
      studentGrade: matchedCred.studentGrade || '',
      studentDoc: cleanDoc,
      accessPin: cleanPin,
      publishedPackages,
      activityMap,
      source: 'local'
    },
    error: null
  };
}

/**
 * Sincroniza el progreso/intentos del estudiante hacia Supabase (si el RPC está activo).
 */
export async function syncStudentActivityToCloud({ studentDoc, accessPin, packageId, activity }) {
  if (!studentDoc || !accessPin || !packageId || !activity) return false;
  try {
    const { data, error } = await supabase.rpc('save_student_activity', {
      p_doc: normalizeStudentDoc(studentDoc),
      p_pin: normalizePin(accessPin),
      p_package_id: packageId,
      p_activity: activity
    });
    return !error && Boolean(data?.ok);
  } catch {
    return false;
  }
}

