// Motor de Inteligencia Psicopedagógica (Gemini API + Extractor Unidireccional PIAR)
import { supabase } from './supabaseClient';
import { normalizeGames, deriveGamesFromPackage } from './aulaGames';

const YT_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extrae el ID de 11 caracteres de un video de YouTube desde enlaces watch, youtu.be, embed, shorts o ID directo.
 */
export function extractYoutubeVideoId(urlOrId = '') {
  const raw = typeof urlOrId === 'string' ? urlOrId.trim() : '';
  if (!raw) return null;
  if (YT_ID_REGEX.test(raw)) return raw;

  try {
    const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const seg = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return YT_ID_REGEX.test(seg) ? seg : null;
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam && YT_ID_REGEX.test(vParam)) return vParam;

      const parts = parsed.pathname.split('/').filter(Boolean);
      const markerIdx = parts.findIndex((p) => ['embed', 'shorts', 'live', 'v'].includes(p));
      if (markerIdx !== -1 && parts[markerIdx + 1] && YT_ID_REGEX.test(parts[markerIdx + 1])) {
        return parts[markerIdx + 1];
      }
    }
  } catch {
    // Fallback con expresión regular si la URL viene incompleta
  }

  const fallbackMatch = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return fallbackMatch ? fallbackMatch[1] : null;
}

const CANDIDATE_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
// Tiempo máximo por modelo antes de pasar al siguiente (evita esperas infinitas en el aula)
const MODEL_TIMEOUT_MS = {
  'gemini-3.1-flash-lite': 30000,
  'gemini-3.5-flash-lite': 25000,
  'gemini-3.8-flash': 25000
};
// Si los endpoints de servidor no están disponibles en este entorno, no reintentarlos en cada clic
let vercelApiUnavailable = false;
let secureFunctionUnavailable = false;

/**
 * Sanea las preguntas del examen generadas por la IA: descarta las que no tengan
 * enunciado, al menos 2 opciones o un índice correcto válido.
 */
export function sanitizeQuizQuestions(rawQuestions) {
  return (Array.isArray(rawQuestions) ? rawQuestions : [])
    .map((q, i) => {
      const options = (Array.isArray(q?.options) ? q.options : [])
        .map((o) => String(o ?? '').trim())
        .filter(Boolean)
        .slice(0, 4);
      const correctIndex = Number(q?.correctIndex);
      const question = String(q?.question ?? '').trim();
      if (
        !question ||
        options.length < 2 ||
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= options.length
      ) {
        return null;
      }
      return {
        ...q,
        id: q.id || `q${i + 1}`,
        skillTag: String(q.skillTag || `Habilidad ${i + 1}`).trim(),
        question,
        options,
        correctIndex
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

/** Verifica que la respuesta de la IA tenga los materiales mínimos completos. */
function isCompleteGeneratedPackage(parsed) {
  const slides = Array.isArray(parsed?.slides) ? parsed.slides.filter((s) => s?.title) : [];
  return slides.length >= 3 && sanitizeQuizQuestions(parsed?.quizQuestions).length >= 3;
}

/**
 * Clasifica la asignatura en un dominio pedagógico sin colisiones (ej. "Educación Física" vs "Física").
 */
export function resolveSubjectDomain(subject = '', topic = '') {
  const norm = `${subject} ${topic}`.toLowerCase();
  if (
    norm.includes('educación fís') ||
    norm.includes('educacion fis') ||
    norm.includes('deport') ||
    norm.includes('motora') ||
    norm.includes('motric') ||
    norm.includes('coordinación') ||
    norm.includes('coordinacion') ||
    norm.includes('recreac') ||
    norm.includes('gimnas')
  ) {
    return 'edu_fisica';
  }
  if (
    norm.includes('arte') ||
    norm.includes('artíst') ||
    norm.includes('artist') ||
    norm.includes('dibuj') ||
    norm.includes('pintur') ||
    norm.includes('músic') ||
    norm.includes('music') ||
    norm.includes('teatr') ||
    norm.includes('danz')
  ) {
    return 'artes';
  }
  if (
    norm.includes('químic') ||
    norm.includes('quimic') ||
    norm.includes('materia') ||
    norm.includes('biolog') ||
    norm.includes('ciencia') ||
    norm.includes('ecosist') ||
    norm.includes('natural') ||
    norm.includes('físic') ||
    norm.includes('fisic')
  ) {
    return 'ciencias';
  }
  if (
    norm.includes('español') ||
    norm.includes('espanol') ||
    norm.includes('lengua') ||
    norm.includes('literat') ||
    norm.includes('lect') ||
    norm.includes('castellano') ||
    norm.includes('comprensi')
  ) {
    return 'espanol';
  }
  if (
    norm.includes('social') ||
    norm.includes('histor') ||
    norm.includes('geograf') ||
    norm.includes('ética') ||
    norm.includes('etica') ||
    norm.includes('ciudadan') ||
    norm.includes('convivencia') ||
    norm.includes('relig')
  ) {
    return 'convivencia';
  }
  return 'matematicas';
}

/**
 * Provee un recurso de video educativo en español acorde a la asignatura sin alojar video en el servidor.
 */
export function buildDefaultYoutubeVideo(subject = '', topic = '') {
  const norm = `${subject} ${topic}`.toLowerCase();
  const cleanSubject = subject?.trim() || 'Refuerzo Escolar';
  const cleanTopic = topic?.trim() || cleanSubject;
  const domain = resolveSubjectDomain(subject, topic);
  const searchQuery = `${cleanSubject} ${cleanTopic} explicación fácil paso a paso español`
    .replace(/\s+/g, ' ')
    .trim();

  if (domain === 'edu_fisica') {
    return {
      videoId: null,
      title: `Guía Práctica: ${cleanTopic} (${cleanSubject})`,
      channelTitle: 'Selección sugerida para Educación Física',
      searchQuery,
      keyMoments: [
        '0:30 Calentamiento articular y ubicación espacial en cancha',
        '1:15 Ejercicio progresivo de coordinación ritmo-movimiento',
        '2:10 Aplicación en equipo y pautas de comunicación clara'
      ]
    };
  }

  if (domain === 'artes') {
    return {
      videoId: null,
      title: `Taller Visual: ${cleanTopic} (${cleanSubject})`,
      channelTitle: 'Selección sugerida para Educación Artística',
      searchQuery,
      keyMoments: [
        '0:30 Preparación del espacio y trazos iniciales suaves',
        '1:15 Aplicación de color, contraste y proporción paso a paso',
        '2:15 Revisión final y detalles expresivos de la obra'
      ]
    };
  }

  if (domain === 'convivencia') {
    return {
      videoId: null,
      title: `Análisis Participativo: ${cleanTopic} (${cleanSubject})`,
      channelTitle: 'Selección sugerida para Ciudadanía y Sociales',
      searchQuery,
      keyMoments: [
        '0:30 Contexto cotidiano y lectura del caso central',
        '1:20 Diálogo respetuoso, roles y toma de acuerdos',
        '2:15 Conclusiones clave para aplicar en comunidad'
      ]
    };
  }

  if (domain === 'ciencias' && (norm.includes('químic') || norm.includes('quimic') || norm.includes('materia') || norm.includes('físic') || norm.includes('fisic'))) {
    return {
      videoId: 'swcjamDFsn0',
      fallbackVideoIds: ['3y0dPYDLXPY'],
      title: `La Materia y sus Propiedades (${cleanSubject})`,
      channelTitle: 'Happy Learning Español',
      searchQuery,
      keyMoments: [
        '0:35 Concepto base de la materia con ejemplos cotidianos',
        '1:45 Propiedades generales y específicas paso a paso',
        '2:30 Resumen visual para repasar antes del examen'
      ]
    };
  }

  if (domain === 'ciencias') {
    return {
      videoId: '3y0dPYDLXPY',
      fallbackVideoIds: ['vrZIYVjR0js', 'ru6rZNQg3eM', 'swcjamDFsn0'],
      title: `Ecosistemas y Procesos Naturales (${cleanSubject})`,
      channelTitle: 'Happy Learning Español',
      searchQuery,
      keyMoments: [
        '0:30 Componentes principales explicados visualmente',
        '1:25 Cómo se relacionan los elementos entre sí',
        '2:15 Ideas clave para responder tu examen'
      ]
    };
  }

  if (domain === 'espanol') {
    return {
      videoId: 'B-Gt430Y-GY',
      fallbackVideoIds: ['aA-O5WW6dRQ'],
      title: `Comprensión Lectora y Estructura Narrativa (${cleanSubject})`,
      channelTitle: 'YouTube Educativo',
      searchQuery,
      keyMoments: [
        '0:40 Identificación rápida de las partes e ideas clave del texto',
        '1:50 Ejemplos prácticos paso a paso',
        '2:40 Trucos para evitar errores en lectura'
      ]
    };
  }

  return {
    videoId: 'bhGa-GNlBT0',
    title: `Resolución de Problemas y Ecuaciones Paso a Paso (${cleanSubject})`,
    channelTitle: 'Daniel Carreón',
    searchQuery,
    keyMoments: [
      '0:30 Regla visual inicial para no saturar la memoria',
      '1:15 Ejemplo guiado en cámara lenta paso a paso',
      '2:20 Verificación final antes de marcar la respuesta'
    ]
  };
}

/**
 * Extrae el perfil psicopedagógico en modo 100% SOLO LECTURA desde el documento PIAR del estudiante.
 * Nunca muta el objeto original.
 */
export function extractStudentPedagogicalProfile(piar) {
  const data = piar?.data || {};
  const gen1 = data?.anexo1?.general || {};
  const est = data?.anexo1?.estudiante || {};
  const salud = data?.anexo1?.salud || {};
  const hogar = data?.anexo1?.hogar || {};
  const trayectoria = data?.anexo1?.trayectoria || {};
  const inst1 = data?.anexo1?.institucion || {};
  const anexo2 = data?.anexo2 || {};
  const anexo3 = data?.anexo3 || {};

  const nombreCompleto =
    piar?.nombre ||
    data?.estudianteNombre ||
    `${est.nombres || ''} ${est.apellidos || ''}`.trim() ||
    'Estudiante';

  const edad = est.edad || '12';
  const grado = piar?.grado || est.gradoAspirado || anexo2?.general?.grado || 'Secundaria';
  const numeroIdentificacion = est.numeroIdentificacion || '1000000000';

  const diagnosticoSalud =
    salud.diagnosticoMedico === 'SI' && salud.diagnosticoCual
      ? salud.diagnosticoCual
      : 'Ritmo y estilo de aprendizaje particular en observación pedagógica';

  const tratamientoMedico =
    salud.tratamientoMedico === 'SI' && salud.tratamientoCual
      ? `${salud.tratamientoCual}${salud.medicamentosFrecuencia ? ` (${salud.medicamentosFrecuencia})` : ''}`
      : 'Sin medicación clínica reportada';

  const terapiasActivas = Array.isArray(salud.terapias)
    ? salud.terapias.filter((t) => t?.cual?.trim()).map((t) => `${t.cual} (${t.frecuencia || 'Periódica'})`)
    : [];

  const productosApoyo =
    salud.productosApoyo === 'SI' && salud.productosApoyoCuales
      ? salud.productosApoyoCuales
      : 'Apoyos visuales y tecnológicos en aula';

  const caracteristicas =
    anexo2.caracteristicasEstudiante?.trim() ||
    'Estudiante receptivo a explicaciones visuales y ejemplos concretos conectados con su cotidianidad. Requiere fragmentación de instrucciones extensas en pasos cortos y verificables.';

  const ajustesPorArea = Array.isArray(anexo2.ajustesRazonables)
    ? anexo2.ajustesRazonables
        .filter((a) => a?.area || a?.barreras || a?.ajustes || a?.objetivos)
        .map((a) => {
          const areaName = a.area || 'General';
          const asignaturaName = a.asignatura || areaName;
          const trimestreName = a.trimestre || 'Primer Trimestre';
          const docenteArea = a.docente || anexo2?.general?.docentesElaboran || 'Docente de Área';
          const objetivosText =
            a.objetivos?.trim() ||
            `Alcanzar los desempeños esenciales de ${asignaturaName} con andamiaje visual y secuencial.`;
          const barrerasText =
            a.barreras?.trim() ||
            'Sobrecarga en textos densos o instrucciones múltiples simultáneas.';
          const ajustesText =
            a.ajustes?.trim() ||
            'Uso de organizadores gráficos, cápsulas de audio y evaluación segmentada.';
          const evaluacionText =
            a.evaluacion?.trim() ||
            'Evaluación formativa por micro-retos con retroalimentación inmediata.';

          // El Agente IA deduce automáticamente el tipo de carencia a partir de las barreras y características del PIAR
          const lowerB = `${barrerasText} ${caracteristicas} ${diagnosticoSalud}`.toLowerCase();
          let carenciaInferida = 'Metodológica (Secuenciación de pasos y organización ejecutiva)';
          if (lowerB.includes('atención') || lowerB.includes('tdah') || lowerB.includes('distra') || lowerB.includes('larg')) {
            carenciaInferida = 'Atención Sostenida y Memoria de Trabajo (Detectada en Anexo 1 y 2)';
          } else if (lowerB.includes('escri') || lowerB.includes('lect') || lowerB.includes('text') || lowerB.includes('idea')) {
            carenciaInferida = 'Procesamiento Lector y Estructuración de Ideas (Detectada en Anexo 2)';
          } else if (lowerB.includes('impulsiv') || lowerB.includes('regla') || lowerB.includes('motiv')) {
            carenciaInferida = 'Autorregulación y Control Ejecutivo Paso a Paso (Detectada en Anexo 2)';
          }

          return {
            area: areaName,
            asignatura: asignaturaName,
            trimestre: trimestreName,
            docente: docenteArea,
            objetivos: objetivosText,
            barreras: barrerasText,
            ajustes: ajustesText,
            evaluacion: evaluacionText,
            carenciaDetectadaPorIa: carenciaInferida,
            temaExtraidoPorIa: objetivosText.replace(/\.$/, '')
          };
        })
    : [];

  const pmiRecomendaciones = Array.isArray(anexo2.pmiRecomendaciones)
    ? anexo2.pmiRecomendaciones
        .filter((r) => r?.acciones?.trim() || r?.estrategias?.trim())
        .map((r) => ({
          actor: r.actor || 'Actor Institucional',
          acciones: r.acciones?.trim() || '',
          estrategias: r.estrategias?.trim() || ''
        }))
    : [];

  const compromisosAula =
    anexo3.compromisosAula?.trim() ||
    'Brindar instrucciones paso a paso, verificar comprensión y permitir apoyos multisensoriales.';

  const actividadesHogar = Array.isArray(anexo3.actividadesHogar)
    ? anexo3.actividadesHogar.filter((h) => h?.actividad?.trim())
    : [];

  const institucionEducativa =
    inst1.nombreIE || anexo2?.general?.institucion || anexo3?.general?.institucionSede || 'Institución Educativa';

  const docentesEquipo =
    anexo2?.general?.docentesElaboran || anexo3?.general?.docentesEquipo || gen1.nombreDiligencia || 'Equipo Docente PIAR';

  // Calcular nivel de mapeo de los 3 Anexos del PIAR
  let filledSignals = 0;
  if (est.nombres || est.edad || est.numeroIdentificacion) filledSignals += 2;
  if (salud.diagnosticoCual || salud.atendidoTerapias === 'SI' || salud.productosApoyoCuales) filledSignals += 1;
  if (hogar.nombreCuidador || hogar.personasConQuienVive || trayectoria.observaciones) filledSignals += 1;
  if (anexo2.caracteristicasEstudiante?.trim()) filledSignals += 2;
  if (ajustesPorArea.length > 0) filledSignals += 2;
  if (pmiRecomendaciones.length > 0) filledSignals += 1;
  if (anexo3.compromisosAula?.trim() || actividadesHogar.length > 0) filledSignals += 1;
  const contextCompleteness = Math.min(100, Math.max(60, Math.round((filledSignals / 10) * 100)));

  return {
    piarId: piar?.id || 'demo',
    nombreCompleto,
    primerNombre: nombreCompleto.split(' ')[0] || 'Estudiante',
    edad,
    grado,
    numeroIdentificacion,
    institucionEducativa,
    docentesEquipo,
    diagnosticoSalud,
    tratamientoMedico,
    terapiasActivas,
    productosApoyo,
    apoyoFamiliar:
      hogar.personasConQuienVive ||
      (hogar.nombreCuidador ? `${hogar.nombreCuidador} (${hogar.parentescoCuidador || 'Acudiente'})` : 'Núcleo familiar'),
    observacionesTrayectoria:
      trayectoria.observaciones || 'Trayectoria académica en seguimiento continuo.',
    programasComplementarios: trayectoria.programasCuales || '',
    caracteristicas,
    ajustesPorArea,
    pmiRecomendaciones,
    compromisosAula,
    actividadesHogar,
    contextCompleteness
  };
}

/**
 * Construye el prompt estructurado para Gemini API cruzando el perfil del PIAR con la evidencia de clase.
 */
function buildGeminiPrompt({ profile, subject, topic, carenciaObservada, teacherNotes }) {
  const areaMatch =
    profile.ajustesPorArea.find(
      (a) =>
        a.area?.toLowerCase().includes(subject.toLowerCase()) ||
        a.asignatura?.toLowerCase().includes(subject.toLowerCase())
    ) || profile.ajustesPorArea[0] || {
      objetivos: 'Alcanzar los desempeños esenciales del periodo con andamiaje.',
      barreras: 'Dificultad para sostener atención en explicaciones abstractas extensas.',
      ajustes: 'Desglose visual paso a paso, ejemplos cotidianos y refuerzo auditivo.',
      evaluacion: 'Evaluación formativa por micro-retos.'
    };

  const allAreasSummary = (profile.ajustesPorArea || [])
    .map(
      (a) =>
        `  * [${a.area}] Objetivo: ${a.objetivos} | Barrera: ${a.barreras} | Ajuste: ${a.ajustes} | Evaluación: ${a.evaluacion}`
    )
    .join('\n');

  const pmiSummary = (profile.pmiRecomendaciones || [])
    .map((r) => `  * [${r.actor}] Acciones: ${r.acciones} | Estrategias: ${r.estrategias}`)
    .join('\n');

  const hogarSummary = (profile.actividadesHogar || [])
    .map((h) => `  * ${h.actividad}: ${h.descripcion || ''} (${h.frecuencia || 'Periódica'})`)
    .join('\n');

  return `Eres un Agente Psicopedagógico Especialista en Educación Inclusiva (Decreto 1421) y Diseño Universal para el Aprendizaje (DUA).
Evalúa el MAPEO INTEGRAL 360° DEL EXPEDIENTE PIAR del estudiante (Anexos 1, 2 y 3 en modo lectura), detecta sus carencias con precisión absoluta y genera un diagnóstico técnico para el docente junto con los 4 materiales didácticos adaptativos en formato JSON estricto.

MAPEO INTEGRAL DEL PIAR DEL ESTUDIANTE (CONTEXTO ABSOLUTO):
1. ANEXO 1 (ENTORNO PERSONAL, SALUD Y TRAYECTORIA):
- Estudiante (solo nombre de pila, datos anonimizados): ${profile.primerNombre} | Edad: ${profile.edad} años | Grado: ${profile.grado}
- Diagnóstico Clínico / Salud: ${profile.diagnosticoSalud}
- Tratamiento / Medicación: ${profile.tratamientoMedico}
- Terapias Activas: ${profile.terapiasActivas.join(', ') || 'En seguimiento pedagógico'}
- Productos de Apoyo: ${profile.productosApoyo}
- Entorno Familiar y Cuidador: ${profile.apoyoFamiliar}
- Observaciones de Trayectoria Educativa: ${profile.observacionesTrayectoria}

2. ANEXO 2 (CARACTERÍSTICAS, AJUSTES RAZONABLES POR ÁREA Y RECOMENDACIONES PMI):
- Características Psicopedagógicas y Estilo de Aprendizaje: ${profile.caracteristicas}
- Mapeo de todas las Áreas del PIAR:
${allAreasSummary || '  * Área general en observación'}
- Recomendaciones Institucionales (PMI):
${pmiSummary || '  * Implementación continua de ajustes DUA'}

3. ANEXO 3 (ACTA DE ACUERDO: AULA Y HOGAR):
- Compromisos Pedagógicos en el Aula: ${profile.compromisosAula}
- Actividades de Apoyo en el Hogar:
${hogarSummary || '  * Refuerzo cotidiano acompañado'}

ÁREA FOCALIZADA EN ESTA GENERACIÓN:
- Asignatura / Área del PIAR: ${subject} (${areaMatch.asignatura || subject})
- Meta / Desempeño del PIAR: ${topic}
- Carencia / Barrera Principal Detectada en el PIAR: ${carenciaObservada} — ${areaMatch.barreras}
- Ajuste Razonable y Evaluación Estipulados en el PIAR: ${teacherNotes}

REGLA DE COHERENCIA DISCIPLINAR ESTRICTA:
Todo el contenido (las 5 diapositivas, los 4 bloques de audio, las 4 escenas del video-guía, los juegos didácticos y las 5 preguntas del examen) debe pertenecer 100% al dominio real de "${subject}" y al tema "${topic}". Por ejemplo, si el área es Educación Física o Artes, usa ejemplos motrices, deportivos o expresivos reales — nunca metas problemas matemáticos ni fórmulas fuera de contexto.

REGLA DE ALINEACIÓN CON LA META DE APRENDIZAJE (OBLIGATORIA):
1. La meta de aprendizaje es: "${topic}". Las diapositivas ENSEÑAN esa meta, los juegos la PRACTICAN y el examen la EVALÚA. Nada puede salirse de ella.
2. Genera EXACTAMENTE 5 diapositivas, EXACTAMENTE 5 preguntas de examen (4 opciones cada una, "correctIndex" entre 0 y 3) y EXACTAMENTE 4 juegos en este orden: memory, order, classify, fill.
3. Cada pregunta del examen evalúa un concepto que se explicó explícitamente en una diapositiva; su "remediationRef" debe decir "Repasar Diapositiva N" con el número real de esa lámina.
4. Los juegos usan el MISMO vocabulario y conceptos de las diapositivas: memory = términos clave del tema con su significado; order = el proceso o secuencia real del tema; classify = dos categorías reales del tema; fill = frases clave de las diapositivas con la palabra técnica omitida ("___").
5. Las preguntas deben ser situaciones concretas y cercanas a un estudiante de ${profile.edad} años, aplicando el ajuste razonable del PIAR (enunciados cortos, una idea por pregunta, sin dobles negaciones).
6. No repitas la misma respuesta correcta en la misma posición en todas las preguntas.

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "teacherDiagnosis": {
    "deficitType": "Conceptual | Metodológica | Atención y Memoria de Trabajo | Motivacional",
    "cognitiveCalibration": "Explicación técnica para el docente sobre cómo se calibró el lenguaje y abstracción para ${profile.edad} años.",
    "rootCauseAnalysis": "Análisis psicopedagógico que cruza la falla del examen con las barreras del PIAR.",
    "pedagogicalStrategy": "Estrategia aplicada en las diapositivas, audio y video para superar el obstáculo.",
    "detectedStrengths": ["Fortaleza 1", "Fortaleza 2"],
    "detectedBarriers": ["Barrera puntual 1", "Barrera puntual 2"]
  },
  "studentDiagnosis": {
    "greetingTitle": "Saludo empático y motivador para ${profile.primerNombre}",
    "encouragementMessage": "Mensaje cálido en segunda persona resaltando lo que sí sabe hacer y explicando sin tecnicismos clínicos qué va a dominar hoy.",
    "learningGoal": "Meta clara y alcanzable en 1 frase",
    "superpowerTip": "Consejo práctico de estudio adaptado a su estilo de aprendizaje"
  },
  "slides": [
    {
      "step": 1,
      "title": "Título corto de la lámina",
      "badge": "Concepto Clave | Analogía Visual | Paso a Paso | Ejemplo Real | Resumen",
      "visualType": "concept | steps | comparison | example | summary",
      "bullets": ["Punto visual corto 1", "Punto visual corto 2", "Punto visual corto 3"],
      "content": "Explicación clara y directa adaptada a su edad",
      "visualAnalogy": "Ejemplo de la vida real o analogía cercana para el estudiante",
      "keyTakeaway": "Frase corta para recordar",
      "checkQuestion": "¿Pregunta rápida de reflexión en esta lámina?"
    }
  ],
  "audioCapsule": {
    "title": "Título de la cápsula de audio",
    "estimatedDurationSec": 95,
    "voiceTone": "Cálido, pausado y motivador",
    "segments": [
      { "id": 1, "timeLabel": "0:00", "speaker": "Mentor IA", "text": "Párrafo 1 conversacional..." },
      { "id": 2, "timeLabel": "0:25", "speaker": "Mentor IA", "text": "Párrafo 2 con ejemplo práctico..." },
      { "id": 3, "timeLabel": "0:55", "speaker": "Mentor IA", "text": "Párrafo 3 con truco paso a paso..." },
      { "id": 4, "timeLabel": "1:20", "speaker": "Mentor IA", "text": "Cierre motivador invitando al reto..." }
    ]
  },
  "videoGuide": {
    "title": "Título del Video / Guía Interactiva Paso a Paso",
    "durationLabel": "2 min 30 s",
    "scenes": [
      {
        "sceneNumber": 1,
        "title": "Escena 1: El punto de partida",
        "durationSec": 35,
        "visualCue": "Descripción visual esquemática",
        "narration": "Explicación guiada de la escena",
        "scaffoldingStep": "Acción concreta que el estudiante comprende en este paso"
      }
    ]
  },
  "quizQuestions": [
    {
      "id": "q1",
      "skillTag": "Nombre corto de la micro-habilidad evaluada",
      "question": "Enunciado claro de la pregunta adaptada",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctIndex": 0,
      "hint": "Pista de andamiaje cognitivo si falla en un intento",
      "remediationRef": "Repasar Diapositiva 2 o Escena 1 del Video",
      "explanation": "Por qué esta respuesta es la correcta explicado con sencillez"
    }
  ],
  "games": [
    {
      "type": "memory",
      "title": "Memoria de Conceptos Clave",
      "instructions": "Une cada concepto con su definición o llave visual.",
      "pairs": [
        { "term": "Concepto 1", "match": "Definición corta o ejemplo" },
        { "term": "Concepto 2", "match": "Definición corta o ejemplo" },
        { "term": "Concepto 3", "match": "Definición corta o ejemplo" }
      ]
    },
    {
      "type": "order",
      "title": "Ordena los Pasos",
      "instructions": "Organiza la secuencia correcta de inicio a fin.",
      "steps": ["Paso 1...", "Paso 2...", "Paso 3...", "Paso 4..."]
    },
    {
      "type": "classify",
      "title": "Clasifica sin Confundirte",
      "instructions": "Ubica cada tarjeta en la categoría correcta.",
      "categories": ["Categoría A", "Categoría B"],
      "items": [
        { "text": "Caso 1...", "category": "Categoría A" },
        { "text": "Caso 2...", "category": "Categoría B" },
        { "text": "Caso 3...", "category": "Categoría A" },
        { "text": "Caso 4...", "category": "Categoría B" }
      ]
    },
    {
      "type": "fill",
      "title": "Completa la Idea Clave",
      "instructions": "Elige la palabra exacta que completa cada frase (usa ___ en el espacio).",
      "sentences": [
        { "text": "Antes de resolver, debemos ___ el dato total.", "answer": "encerrar", "options": ["encerrar", "borrar", "saltar"] },
        { "text": "Cada ejercicio se divide en pasos ___.", "answer": "cortos", "options": ["cortos", "largos", "ocultos"] }
      ]
    }
  ],
  "youtubeVideo": {
    "searchQuery": "Términos exactos en español para buscar un video explicativo de ${topic} en YouTube",
    "title": "Título sugerido del video de apoyo para ${topic}",
    "keyMoments": ["0:30 Idea clave inicial", "1:15 Ejemplo paso a paso"]
  }
}`;
}

/**
 * Extrae el texto de respuesta desde la nueva API REST de Gemini Interactions (`steps` o `outputs`).
 */
function extractInteractionText(result) {
  if (!result || typeof result !== 'object') return '';
  if (typeof result.output_text === 'string' && result.output_text.trim()) {
    return result.output_text.trim();
  }
  if (Array.isArray(result.steps)) {
    const modelSteps = result.steps.filter((s) => s?.type === 'model_output' && Array.isArray(s.content));
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

function extractJsonObjectFromText(rawText) {
  const cleaned = String(rawText || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('JSON de respuesta incompleto.');
  }
}

/**
 * Respaldo directo hacia Gemini Interactions API usando `VITE_GEMINI_API_KEY`
 * cuando la Edge Function segura de Supabase no ha sido desplegada aún.
 */
async function invokeDirectGeminiFallback(promptText, evidenceImageBase64, onProgress) {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const parts = [{ text: promptText }];
  if (evidenceImageBase64 && evidenceImageBase64.includes('base64,')) {
    const [meta, base64Data] = evidenceImageBase64.split('base64,');
    const mimeMatch = meta.match(/data:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    if (base64Data && mimeType.startsWith('image/')) {
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
    }
  }

  for (const [modelIdx, model] of CANDIDATE_GEMINI_MODELS.entries()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS[model] || 25000);
    try {
      onProgress?.(
        modelIdx === 0
          ? 'El Agente IA está redactando diapositivas, juegos y examen alineados a la meta del PIAR...'
          : 'El primer modelo está saturado; reintentando con un modelo alterno de Gemini...'
      );
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
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
        const errBody = await response.text().catch(() => '');
        console.warn(`[piarAiEngine] Gemini REST (${model}) respondió ${response.status}:`, errBody.slice(0, 200));
        continue;
      }
      const payload = await response.json();
      const rawText =
        payload?.candidates?.[0]?.content?.parts
          ?.filter((p) => typeof p?.text === 'string' && !p.thought)
          .map((p) => p.text)
          .join('\n')
          .trim() || extractInteractionText(payload);
      if (!rawText) continue;
      const parsed = extractJsonObjectFromText(rawText);
      if (isCompleteGeneratedPackage(parsed)) {
        return { data: parsed, model };
      }
      console.warn(`[piarAiEngine] Gemini (${model}) devolvió materiales incompletos; probando siguiente modelo.`);
    } catch (err) {
      console.warn(`[piarAiEngine] Error en respaldo directo Gemini (${model}):`, err?.name === 'AbortError' ? 'tiempo agotado' : err);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/**
 * Invoca la ruta serverless segura de Vercel `/api/aula-ia-generate`
 * (la clave GEMINI_API_KEY vive solo en Vercel, nunca en el navegador).
 */
async function invokeVercelGeminiApi(promptText, evidenceImageBase64, onProgress) {
  if (vercelApiUnavailable || typeof fetch !== 'function') return null;
  try {
    onProgress?.('Conectando con el Agente IA en servidor seguro (Vercel)...');
    let image = null;
    if (evidenceImageBase64 && evidenceImageBase64.includes('base64,')) {
      const [meta, base64Data] = evidenceImageBase64.split('base64,');
      const mimeMatch = meta.match(/data:(.*?);/);
      image = { data: base64Data, mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg' };
    }

    const headers = { 'Content-Type': 'application/json' };
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // Continuar sin token si no hay sesión Supabase activa
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 65000);
    let response;
    try {
      response = await fetch('/api/aula-ia-generate', {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({ prompt: promptText, image })
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 404 || response.status === 405) {
      vercelApiUnavailable = true;
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      vercelApiUnavailable = true;
      return null;
    }

    const payload = await response.json();
    if (!response.ok || !payload?.data || !isCompleteGeneratedPackage(payload.data)) {
      console.warn('[piarAiEngine] /api/aula-ia-generate no devolvió paquete válido:', payload?.error || response.status);
      return null;
    }
    return payload;
  } catch (err) {
    console.warn('[piarAiEngine] /api/aula-ia-generate no disponible:', err?.name === 'AbortError' ? 'tiempo agotado' : err);
    return null;
  }
}

/**
 * Invoca la Edge Function segura `aula-ia-generate` (la clave de Gemini vive solo en Supabase).
 * Devuelve `{ data, model }` o `null` si el servicio no está disponible.
 */
async function invokeSecureGeminiFunction(promptText, evidenceImageBase64) {
  if (secureFunctionUnavailable) return null;
  try {
    if (!supabase?.functions) return null;

    let image = null;
    if (evidenceImageBase64 && evidenceImageBase64.includes('base64,')) {
      const [meta, base64Data] = evidenceImageBase64.split('base64,');
      const mimeMatch = meta.match(/data:(.*?);/);
      image = { data: base64Data, mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg' };
    }

    const { data, error } = await supabase.functions.invoke('aula-ia-generate', {
      body: { prompt: promptText, image }
    });

    if (error || !data?.data || !isCompleteGeneratedPackage(data.data)) {
      // No desplegada (404) o sin permisos: no reintentar en cada generación
      const status = error?.context?.status;
      if (status === 404 || status === 401 || status === 403 || status === 503) {
        secureFunctionUnavailable = true;
      }
      console.warn('[piarAiEngine] Edge Function aula-ia-generate no disponible:', error || data?.error);
      return null;
    }
    return data;
  } catch (err) {
    secureFunctionUnavailable = true;
    console.warn('[piarAiEngine] Error invocando aula-ia-generate:', err);
    return null;
  }
}

/**
 * Genera el paquete adaptativo con Gemini (vía Edge Function segura o respaldo con API key local)
 * o con el motor psicopedagógico local nutrido con los datos reales del PIAR del estudiante.
 */
export async function generateAdaptivePackageWithGemini({
  piar,
  subject = '',
  topic = '',
  carenciaObservada = '',
  teacherNotes = '',
  evidenceImageBase64 = null,
  maxAttempts = 3,
  onProgress = null
}) {
  const profile = extractStudentPedagogicalProfile(piar);

  const areaMatch =
    (subject &&
      profile.ajustesPorArea.find(
        (a) =>
          a.area?.toLowerCase().includes(subject.toLowerCase()) ||
          a.asignatura?.toLowerCase().includes(subject.toLowerCase())
      )) ||
    profile.ajustesPorArea[0] || {
      area: subject || 'Matemáticas',
      asignatura: subject || 'Matemáticas',
      objetivos: 'Alcanzar los desempeños esenciales del periodo mediante secuencias visuales fragmentadas.',
      barreras: 'Sobrecarga en memoria de trabajo ante enunciados extensos sin apoyo gráfico.',
      ajustes: 'Dividir cada procedimiento en 3 micro-pasos con apoyo visual y verificación guiada.',
      evaluacion: 'Evaluación formativa por micro-retos con retroalimentación inmediata.',
      carenciaDetectadaPorIa: 'Atención Sostenida y Secuenciación Ejecutiva (Inferida del PIAR)',
      temaExtraidoPorIa: 'Resolución de Problemas Paso a Paso con Apoyo Visual'
    };

  const finalSubject = subject || areaMatch.area || 'Matemáticas';
  const finalTopic =
    topic?.trim() ||
    areaMatch.temaExtraidoPorIa ||
    areaMatch.objetivos ||
    `Refuerzo Adaptativo de ${finalSubject}`;
  const finalCarencia =
    carenciaObservada?.trim() ||
    areaMatch.carenciaDetectadaPorIa ||
    'Atención Sostenida y Secuenciación Ejecutiva (Detectada del PIAR)';
  const finalNotes =
    teacherNotes?.trim() ||
    `Barrera detectada en Anexo 2 del PIAR: "${areaMatch.barreras}". Ajuste Razonable del PIAR: "${areaMatch.ajustes}". Evaluación PIAR: "${areaMatch.evaluacion}".`;

  {
    const promptText = buildGeminiPrompt({
      profile,
      subject: finalSubject,
      topic: finalTopic,
      carenciaObservada: finalCarencia,
      teacherNotes: finalNotes
    });

    onProgress?.('Leyendo el PIAR y preparando la meta de aprendizaje para el Agente IA...');
    const remote =
      (await invokeVercelGeminiApi(promptText, evidenceImageBase64, onProgress)) ||
      (await invokeSecureGeminiFunction(promptText, evidenceImageBase64)) ||
      (await invokeDirectGeminiFallback(promptText, evidenceImageBase64, onProgress));
    if (remote?.data) {
      onProgress?.('Validando coherencia entre diapositivas, juegos y examen...');
      return buildCompletePackageObject({
        profile,
        subject: finalSubject,
        topic: finalTopic,
        carenciaObservada: finalCarencia,
        teacherNotes: finalNotes,
        evidenceImageBase64,
        maxAttempts,
        areaMatch,
        generated: remote.data,
        engineSource: `Gemini API (${remote.model})`,
        engineMode: 'gemini'
      });
    }
  }

  onProgress?.('La IA no respondió a tiempo; armando materiales de respaldo con el PIAR...');
  // Motor Psicopedagógico Adaptativo Local (nutrido directamente por los datos del PIAR del estudiante)
  const fallbackGenerated = buildContextualPedagogicalContent({
    profile,
    subject: finalSubject,
    topic: finalTopic,
    carenciaObservada: finalCarencia,
    teacherNotes: finalNotes,
    areaMatch
  });

  return buildCompletePackageObject({
    profile,
    subject: finalSubject,
    topic: finalTopic,
    carenciaObservada: finalCarencia,
    teacherNotes: finalNotes,
    evidenceImageBase64,
    maxAttempts,
    areaMatch,
    generated: fallbackGenerated,
    engineSource: 'Plantilla local de respaldo (Gemini no respondió)',
    engineMode: 'local'
  });
}

function buildCompletePackageObject({
  profile,
  subject,
  topic,
  carenciaObservada,
  teacherNotes,
  evidenceImageBase64,
  maxAttempts,
  areaMatch,
  generated,
  engineSource,
  engineMode = 'local'
}) {
  const sanitizedQuiz = sanitizeQuizQuestions(generated.quizQuestions);
  const quizQuestions = sanitizedQuiz.length >= 3 ? sanitizedQuiz : generated.quizQuestions;

  // Completar los 4 juegos: los válidos de la IA + los derivados del mismo contenido para los tipos faltantes
  const aiGames = normalizeGames(generated.games);
  const presentTypes = new Set(aiGames.map((g) => g.type));
  const derivedGames =
    aiGames.length >= 4 ? [] : deriveGamesFromPackage({ ...generated, quizQuestions });
  const games = [...aiGames, ...derivedGames.filter((g) => !presentTypes.has(g.type))]
    .slice(0, 4)
    .map((g, idx) => ({ ...g, id: `game-${idx + 1}-${g.type}` }));

  const defaultYoutube = buildDefaultYoutubeVideo(subject, topic);
  // Nunca confiar en un videoId inventado por el LLM; conservar solo búsqueda, título y momentos clave de la IA + videoId verificado por defecto
  const youtubeVideo = {
    ...defaultYoutube,
    ...(generated.youtubeVideo || {}),
    videoId: defaultYoutube.videoId
  };

  return {
    id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    piarId: profile.piarId,
    studentName: profile.nombreCompleto,
    studentFirstName: profile.primerNombre,
    studentAge: profile.edad,
    studentGrade: profile.grado,
    studentDoc: profile.numeroIdentificacion,
    subject,
    topic,
    carenciaObservada,
    teacherNotes:
      teacherNotes ||
      `Evaluación analizada cruzando el perfil PIAR de ${profile.nombreCompleto} con el desempeño en ${topic}.`,
    hasEvidenceImage: Boolean(evidenceImageBase64),
    evidenceImagePreview: evidenceImageBase64 || null,
    status: 'draft', // Se genera en borrador para supervisión previa del docente antes de publicar
    maxAttempts: Number(maxAttempts) || 3,
    engineSource,
    engineMode,
    createdAt: new Date().toISOString(),
    publishedAt: null,
    piarContextSnapshot: {
      diagnosticoSalud: profile.diagnosticoSalud,
      caracteristicas: profile.caracteristicas,
      barrerasAplicadas: areaMatch.barreras,
      ajustesAplicados: areaMatch.ajustes,
      compromisosAula: profile.compromisosAula,
      contextCompleteness: profile.contextCompleteness
    },
    teacherDiagnosis: generated.teacherDiagnosis,
    studentDiagnosis: generated.studentDiagnosis,
    slides: generated.slides,
    audioCapsule: generated.audioCapsule,
    videoGuide: generated.videoGuide,
    quizQuestions,
    games,
    youtubeVideo
  };
}

function buildDomainMaterials({ domain, firstName, subject, topic }) {
  if (domain === 'edu_fisica') {
    return {
      slides: [
        {
          step: 1,
          title: `1. ¿Qué trabajaremos en "${topic}"?`,
          badge: 'Idea Principal',
          visualType: 'concept',
          bullets: [
            'Sincronizar vista, manos y pies al moverte',
            'Controlar el equilibrio y el ritmo del cuerpo',
            'Comunicarte claro con tu equipo en la cancha'
          ],
          content: `En ${subject}, dominar "${topic}" no es correr más rápido que todos, sino moverte con control y leer la jugada con calma junto a tus compañeros.`,
          visualAnalogy: 'Igual que en una coreografía o en un pase de baloncesto: si todos siguen el mismo ritmo y avisan antes de pasar, nadie choca ni pierde el balón.',
          keyTakeaway: 'Control corporal + comunicación visual = jugada en equipo.',
          checkQuestion: '¿Qué parte de tu cuerpo debe observar primero antes de dar un pase?'
        },
        {
          step: 2,
          title: '2. El Método de los 3 Tiempos en Movimiento',
          badge: 'Método Paso a Paso',
          visualType: 'steps',
          bullets: [
            '🟢 Observo el espacio y ubico a mi compañero libre',
            '🟡 Controlo mi cuerpo y freno antes de ejecutar',
            '🔵 Paso o ejecuto el movimiento y sigo atento'
          ],
          content: 'Cuando participes en un circuito motriz o juego grupal, divide la acción en tres tiempos cortos para no apurarte ni perder el equilibrio.',
          visualAnalogy: 'Como cruzar por tres estaciones con conos: miras el cono, equilibras tu postura y luego avanzas al siguiente punto.',
          keyTakeaway: 'Primero observa y estabiliza tu postura; después acelera o pasa.',
          checkQuestion: '¿Por qué conviene frenar un segundo y estabilizarte antes de lanzar o pasar?'
        },
        {
          step: 3,
          title: '3. Qué te ayuda vs. Qué desordena al equipo',
          badge: 'Truco Clave',
          visualType: 'comparison',
          bullets: [
            'Mirar al frente en lugar de mirar solo tus pies',
            'Avisar con la voz o la mano antes de soltar el balón',
            'Respetar el turno y zona asignada de cada compañero'
          ],
          content: 'El error más frecuente es recibir el balón y actuar con afán sin levantar la mirada. Una señal corta con la voz ("¡aquí!", "¡voy!") evita errores y choques.',
          visualAnalogy: 'Un equipo sin comunicación es como un cruce sin semáforo; con señas claras, el balón fluye de mano en mano sin tropiezos.',
          keyTakeaway: 'Levanta la vista y usa señales cortas de voz o mano con tu equipo.',
          checkQuestion: '¿Qué señal sencilla puedes hacerle a un compañero para recibir un pase?'
        },
        {
          step: 4,
          title: '4. Secuencia Guiada: Circuito de Conos y Pase',
          badge: 'Ejemplo Guiado',
          visualType: 'example',
          bullets: [
            'Paso 1: Zigzag suave entre 4 conos con rodillas activas',
            'Paso 2: Parada en dos apoyos mirando al compañero',
            'Paso 3: Pase firme al pecho o desplazamiento al relevo'
          ],
          content: `Observa un ejemplo práctico de "${topic}": respiras, regulas la velocidad entre los conos para no tropezar y entregas con precisión cuando el compañero te mira.`,
          visualAnalogy: 'Si en 6 relevos entregas 6 pases limpios sin caer el balón, tu equipo avanza constante sin perder tiempo recogiendo implementos.',
          keyTakeaway: 'Precisión y ritmo constante valen más que correr sin control.',
          checkQuestion: 'Si tu compañero está de espaldas, ¿debes lanzar el pase o llamarlo primero?'
        },
        {
          step: 5,
          title: `5. ¡Listo para la Cancha, ${firstName}! Resumen`,
          badge: 'Resumen Visual',
          visualType: 'summary',
          bullets: [
            'Observa el espacio libre antes de moverte',
            'Controla postura, respiración y apoyo de pies',
            'Coopera con señas claras y respeta los relevos'
          ],
          content: 'Ya tienes las 3 claves para brillar hoy en clase práctica: calma al iniciar, mirada arriba para coordinar y apoyo positivo hacia todo tu equipo.',
          visualAnalogy: 'Tu brújula motriz está lista: cuerpo equilibrado, vista atenta y trabajo solidario.',
          keyTakeaway: 'Vista atenta + Postura estable + Equipo unido = Meta lograda.',
          checkQuestion: '¿Cuál de los 3 tiempos vas a aplicar primero en tu próxima actividad física?'
        }
      ],
      audioCapsule: {
        title: `Cápsula de Audio para ${firstName}: ${topic}`,
        estimatedDurationSec: 80,
        voiceTone: 'Cálido, claro y motivador (Ritmo pausado)',
        segments: [
          {
            id: 1,
            timeLabel: '0:00',
            speaker: 'Mentor IA',
            text: `¡Hola ${firstName}! Qué gusto acompañarte hoy en ${subject}. Tienes buena energía para moverte, y con tres ajustes simples vas a sentir mucha más seguridad en "${topic}".`
          },
          {
            id: 2,
            timeLabel: '0:20',
            speaker: 'Mentor IA',
            text: `Cuando estés en la cancha o en un circuito con conos, no intentes hacer todo acelerado. Primero respira hondo, levanta la mirada y ubica dónde están tus compañeros y el espacio libre.`
          },
          {
            id: 3,
            timeLabel: '0:44',
            speaker: 'Mentor IA',
            text: `Segundo truco: estabiliza tus pies y usa la voz o una seña con la mano antes de pasar o recibir. Coordinar no es ser el más rápido, sino conectar tu movimiento con el del equipo.`
          },
          {
            id: 4,
            timeLabel: '1:05',
            speaker: 'Mentor IA',
            text: `Al final de esta ruta tienes unos juegos súper dinámicos y tu reto interactivo con varios intentos para repasar lo que vimos. ¡Vamos paso a paso!`
          }
        ]
      },
      videoGuide: {
        title: `Video-Guía Paso a Paso: ${topic}`,
        durationLabel: '2 min 00 s',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Escena 1: Activación y lectura del espacio',
            durationSec: 30,
            visualCue: '🟢 Zona de juego demarcada con conos y líneas de trayectoria.',
            narration: `Antes de arrancar la actividad de ${subject}, observamos dónde están las marcas, la distancia y la posición de cada compañero para movernos sin chocar.`,
            scaffoldingStep: 'Observar el espacio, los conos y la ubicación del equipo.'
          },
          {
            sceneNumber: 2,
            title: 'Escena 2: Equilibrio, postura y control del ritmo',
            durationSec: 30,
            visualCue: '🟡 Rodillas semiflexionadas, mirada al frente y ritmo constante.',
            narration: 'Mantener las rodillas activas y los brazos equilibrados nos permite cambiar de dirección con suavidad en el circuito de coordinación.',
            scaffoldingStep: 'Ajustar la postura y regular el ritmo del desplazamiento.'
          },
          {
            sceneNumber: 3,
            title: 'Escena 3: Seña visual y pase coordinado',
            durationSec: 30,
            visualCue: '🔵 Contacto visual entre compañeros antes del pase.',
            narration: 'Confirmamos que nuestro compañero nos esté mirando, hacemos una señal clara y enviamos el implemento a una altura cómoda.',
            scaffoldingStep: 'Confirmar contacto visual y ejecutar el pase en orden.'
          },
          {
            sceneNumber: 4,
            title: 'Escena 4: Relevo solidario y cierre limpio',
            durationSec: 30,
            visualCue: '✅ Entrega en zona de relevo y apoyo verbal al compañero.',
            narration: 'Al completar tu tramo, entregas el turno respetando la zona y animas al siguiente integrante. Así todo el equipo mantiene el ritmo.',
            scaffoldingStep: 'Entregar el relevo en orden y verificar la meta grupal.'
          }
        ]
      },
      quizQuestions: [
        {
          id: 'q1',
          skillTag: '1. Lectura del Espacio y Seguridad',
          question: `Antes de iniciar un ejercicio de "${topic}" en ${subject}, ¿qué acción inicial evita choques y mejora tu coordinación?`,
          options: [
            'Levantar la mirada para ubicar los conos, el espacio libre y a tus compañeros',
            'Correr a máxima velocidad mirando únicamente hacia el suelo',
            'Empezar sin escuchar la señal de inicio del docente o compañero',
            'Acercarse lo más posible al resto del grupo para ocupar un solo punto'
          ],
          correctIndex: 0,
          hint: 'Recuerda la Diapositiva 1 y la Escena 1 del Video: primero observamos la cancha y los compañeros libres.',
          remediationRef: 'Repasar Diapositiva 1 y Escena 1 del Video',
          explanation: 'Mirar el entorno antes de moverte le da tiempo al cerebro para planear trayectorias limpias y seguras.'
        },
        {
          id: 'q2',
          skillTag: '2. Postura y Control del Ritmo',
          question: 'Cuando estás haciendo un desplazamiento entre conos y sientes que te aceleras demasiado, ¿qué debes hacer según el Método de los 3 Tiempos?',
          options: [
            'Frenar levemente, equilibrar tus pies con rodillas activas y retomar el ritmo',
            'Soltar los brazos y correr más rápido para terminar antes',
            'Detenerte por completo y abandonar el ejercicio grupal',
            'Saltar los conos por encima sin mirar donde pisas'
          ],
          correctIndex: 0,
          hint: 'Revisa el paso amarillo de la Diapositiva 2: controlar postura y ritmo evita tropezar.',
          remediationRef: 'Repasar Diapositiva 2 (3 Tiempos)',
          explanation: 'Un breve ajuste de postura y rodillas semiflexionadas devuelve el equilibrio de inmediato.'
        },
        {
          id: 'q3',
          skillTag: '3. Comunicación y Pase en Equipo',
          question: 'Vas a pasar el balón a un compañero que está mirando hacia otro lado. ¿Cuál es la mejor decisión de trabajo en equipo?',
          options: [
            'Llamarlo por su nombre o esperar contacto visual antes de enviar el pase',
            'Lanzar el balón fuerte hacia su espalda para que se voltee rápido',
            'Tirar el balón fuera de la cancha para reiniciar la jugada',
            'Quedarte quieto en silencio hasta que suene el timbre'
          ],
          correctIndex: 0,
          hint: 'Mira la Diapositiva 3 y el Audio minuto 0:44: avisar con voz o seña asegura una buena recepción.',
          remediationRef: 'Repasar Diapositiva 3 y Minuto 0:44 del Audio',
          explanation: 'La comunicación previa garantiza que el compañero esté listo y fortalece la confianza grupal.'
        },
        {
          id: 'q4',
          skillTag: '4. Juego Limpio y Roles en Relevo',
          question: 'En una prueba de relevos por equipos, ¿cuál actitud ayuda a que todo el grupo logre un mejor resultado?',
          options: [
            'Respetar la zona de entrega, esperar el toque de relevo y animar al equipo',
            'Salir corriendo antes de que llegue tu compañero para ganar ventaja',
            'Culpar al compañero si un implemento cae al piso durante el circuito',
            'Cambiar las reglas del circuito sin avisar a los demás'
          ],
          correctIndex: 0,
          hint: 'Recuerda la Escena 4 del Video-Guía sobre el relevo solidario.',
          remediationRef: 'Repasar Escena 4 del Video-Guía',
          explanation: 'Respetar los turnos y apoyar al equipo mantiene la coordinación colectiva sin faltas ni desorden.'
        },
        {
          id: 'q5',
          skillTag: '5. Síntesis de Coordinación Motora',
          question: `¿Cuál combinación resume las tres claves vistas hoy para destacar en "${topic}"?`,
          options: [
            'Mirada arriba + postura equilibrada + señas claras con tu equipo',
            'Correr sin freno + vista en los zapatos + silencio absoluto',
            'Hacer todo individualmente + ignorar los conos + competir contra tus propios aliados',
            'Memorizar definiciones largas sin practicar los movimientos'
          ],
          correctIndex: 0,
          hint: 'Revisa la Diapositiva 5 (Resumen Visual) con tu lista de chequeo.',
          remediationRef: 'Repasar Diapositiva 5 (Resumen Visual)',
          explanation: 'Coordinación y trabajo en equipo unen percepción visual, equilibrio corporal y comunicación solidaria.'
        }
      ]
    };
  }

  if (domain === 'artes') {
    return {
      slides: [
        {
          step: 1,
          title: `1. Explorando "${topic}" en ${subject}`,
          badge: 'Idea Principal',
          visualType: 'concept',
          bullets: [
            'Observar formas básicas antes de detallar',
            'Organizar espacio, proporción y centro de interés',
            'Expresar ideas propias con calma y ritmo'
          ],
          content: `En ${subject}, dominar "${topic}" consiste en construir tu obra paso a paso: primero encajas las figuras simples y al final agregas color, textura y detalles.`,
          visualAnalogy: 'Como construir una casa: primero trazas las paredes suaves con lápiz antes de pintar las ventanas.',
          keyTakeaway: 'Trazo suave al comienzo -> detalle y color al final.',
          checkQuestion: '¿Por qué es mejor empezar con trazos suaves antes de remarcar duro?'
        },
        {
          step: 2,
          title: '2. El Método Creativo en 3 Capas',
          badge: 'Método Paso a Paso',
          visualType: 'steps',
          bullets: [
            '🟢 Boceto base: círculos, rectángulos y líneas guía',
            '🟡 Forma y luz: volumen, contornos y contrastes claros',
            '🔵 Color y toque personal: capas uniformes sin afán'
          ],
          content: 'Al trabajar en 3 capas ordenadas evitas manchas, borrones innecesarios y frustración si algo necesita ajustarse al inicio.',
          visualAnalogy: 'Igual que vestirte por capas: primero la base, luego las prendas principales y al final los accesorios.',
          keyTakeaway: 'Encaja primero, define después, colorea al final.',
          checkQuestion: '¿Qué haces en la primera capa antes de usar colores?'
        },
        {
          step: 3,
          title: '3. Armonía vs. Saturación Visual',
          badge: 'Truco Clave',
          visualType: 'comparison',
          bullets: [
            'Deja respirar espacios limpios en la composición',
            'Elige 2 o 3 colores protagonistas para dar fuerza',
            'Cuida la presión uniforme del lápiz o pincel'
          ],
          content: 'Usar demasiados tonos intensos al mismo tiempo cansa la vista. Elegir una paleta breve hace que tu idea central resalte al instante.',
          visualAnalogy: 'En un afiche bien hecho, el fondo suave hace brillar la figura principal sin competir con ella.',
          keyTakeaway: 'Menos ruido de color = mayor fuerza expresiva.',
          checkQuestion: '¿Qué pasa cuando el fondo tiene tantos colores fuertes como la figura central?'
        },
        {
          step: 4,
          title: '4. Demostración Guiada de Composición',
          badge: 'Ejemplo Guiado',
          visualType: 'example',
          bullets: [
            'Ubicar el objeto principal usando tercios o eje central',
            'Aplicar tonos claros primero y sombras al final',
            'Revisar proporciones a un brazo de distancia'
          ],
          content: `En un proyecto de "${topic}", alejar la hoja un momento te permite ver el equilibrio general entre izquierda, derecha, luz y sombra.`,
          visualAnalogy: 'Tomar un paso atrás ante tu dibujo es como poner zoom hacia afuera en una cámara para mirar toda la escena.',
          keyTakeaway: 'Alejar la mirada un instante revela qué zona necesita contraste.',
          checkQuestion: '¿Para qué sirve mirar tu trabajo a un brazo de distancia?'
        },
        {
          step: 5,
          title: `5. ¡Tu Taller Listo, ${firstName}! Resumen`,
          badge: 'Resumen Visual',
          visualType: 'summary',
          bullets: [
            'Formas simples suaves en el encaje inicial',
            'Paleta controlada con contraste claro/oscuro',
            'Limpieza y revisión a distancia antes de entregar'
          ],
          content: 'Ya dominas la ruta completa de creación: planeas con suavidad, construyes por capas y cierras con intención estética.',
          visualAnalogy: 'Tu caja de herramientas artísticas tiene orden, equilibrio y sello propio.',
          keyTakeaway: 'Encaje + Capas + Contraste = Composición armónica.',
          checkQuestion: '¿Qué primer trazo usarás en tu próxima actividad artística?'
        }
      ],
      audioCapsule: {
        title: `Cápsula de Audio para ${firstName}: ${topic}`,
        estimatedDurationSec: 78,
        voiceTone: 'Cálido, creativo y sereno',
        segments: [
          {
            id: 1,
            timeLabel: '0:00',
            speaker: 'Mentor IA',
            text: `¡Hola ${firstName}! Bienvenido a este taller de ${subject}. Hoy vamos a hacer que "${topic}" fluya sin estrés y con resultados muy llamativos.`
          },
          {
            id: 2,
            timeLabel: '0:20',
            speaker: 'Mentor IA',
            text: `El secreto de cualquier obra clara es el boceto suave: antes de presionar fuerte o aplicar colores intensos, dibuja círculos o líneas suaves para ubicar dónde irá cada elemento.`
          },
          {
            id: 3,
            timeLabel: '0:42',
            speaker: 'Mentor IA',
            text: `Luego avanza capa por capa. Selecciona pocos colores principales y combina tonos claros en el fondo para que tu personaje o idea central brille en primer plano.`
          },
          {
            id: 4,
            timeLabel: '1:02',
            speaker: 'Mentor IA',
            text: `Ahora observa el video guía y diviértete con los juegos interactivos antes del reto final. ¡Tu creatividad tiene muchísimo potencial!`
          }
        ]
      },
      videoGuide: {
        title: `Taller Paso a Paso: ${topic}`,
        durationLabel: '2 min 00 s',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Escena 1: Líneas guía y encaje suave',
            durationSec: 30,
            visualCue: '✏️ Trazos geométricos suaves centrando el motivo principal.',
            narration: `Comenzamos "${topic}" ubicando el tamaño general en la hoja con presión suave para poder ajustar libremente.`,
            scaffoldingStep: 'Trazar proporciones generales sin presionar el papel.'
          },
          {
            sceneNumber: 2,
            title: 'Escena 2: Definición de contornos y planos',
            durationSec: 30,
            visualCue: '📐 Contornos definidos separando figura principal y fondo.',
            narration: 'Unimos las formas básicas para dar identidad al diseño y limpiamos las líneas auxiliares sobrantes.',
            scaffoldingStep: 'Definir contornos claros de la figura principal.'
          },
          {
            sceneNumber: 3,
            title: 'Escena 3: Paleta de color y contraste de luz',
            durationSec: 30,
            visualCue: '🎨 Capas suaves del tono más claro al tono de sombra.',
            narration: 'Aplicamos el color en una misma dirección, reservando los tonos oscuros para generar volumen y profundidad.',
            scaffoldingStep: 'Aplicar colores base en capas parejas antes de sombrear.'
          },
          {
            sceneNumber: 4,
            title: 'Escena 4: Revisión visual y detalles expresivos',
            durationSec: 30,
            visualCue: '✨ Vista general equilibrada con detalles nítidos.',
            narration: 'Observamos el conjunto a distancia para equilibrar brillos, texturas y limpieza final.',
            scaffoldingStep: 'Evaluar equilibrio visual y afinar detalles finales.'
          }
        ]
      },
      quizQuestions: [
        {
          id: 'q1',
          skillTag: '1. Boceto Inicial',
          question: `Al empezar una creación sobre "${topic}" en ${subject}, ¿por qué conviene hacer los primeros trazos suaves?`,
          options: [
            'Permiten ajustar tamaño y ubicación fácilmente sin dañar el papel',
            'Para gastar el lápiz más rápido antes de pintar',
            'Porque los trazos suaves no se pueden corregir',
            'Para evitar planear la composición'
          ],
          correctIndex: 0,
          hint: 'Revisa la Diapositiva 1: trazo suave al inicio te da libertad de ajuste.',
          remediationRef: 'Repasar Diapositiva 1',
          explanation: 'El encaje suave permite corregir proporciones limpiamente antes del acabado final.'
        },
        {
          id: 'q2',
          skillTag: '2. Orden por Capas',
          question: 'Según el Método Creativo de las 3 Capas, ¿cuál secuencia mantiene tu trabajo ordenado?',
          options: [
            'Boceto geométrico -> Definición y contraste -> Color y detalles',
            'Detalles pequeños -> Manchas oscuras -> Boceto final',
            'Pintar el marco -> Recortar sin medir -> Empezar el centro',
            'Usar marcador permanente desde el primer segundo'
          ],
          correctIndex: 0,
          hint: 'Observa el Semáforo de 3 Capas en la Diapositiva 2.',
          remediationRef: 'Repasar Diapositiva 2',
          explanation: 'Avanzar de lo general a lo particular evita errores difíciles de corregir.'
        },
        {
          id: 'q3',
          skillTag: '3. Contraste y Paleta',
          question: '¿Cómo logras que la figura principal de tu composición llame la atención de inmediato?',
          options: [
            'Creando contraste entre la figura protagonista y un fondo más sereno',
            'Llenando cada milímetro con colores neón idénticos',
            'Dibujando las figuras sin bordes ni diferencias de luz',
            'Ocultando el elemento central en una esquina'
          ],
          correctIndex: 0,
          hint: 'Repasa la Diapositiva 3 sobre armonía vs. saturación.',
          remediationRef: 'Repasar Diapositiva 3',
          explanation: 'El contraste guía el ojo del espectador directamente hacia tu idea central.'
        },
        {
          id: 'q4',
          skillTag: '4. Aplicación de Color',
          question: 'Al colorear o pintar por zonas, ¿qué dirección de sombreado se recomienda primero?',
          options: [
            'Empezar por los tonos claros y construir las sombras encima progresivamente',
            'Poner el negro puro primero y luego intentar taparlo con amarillo',
            'Rayar en todas direcciones con mucha fuerza al inicio',
            'Aplicar agua encima del grafito sin probar en un borde'
          ],
          correctIndex: 0,
          hint: 'Revisa la Escena 3 del Video-Guía.',
          remediationRef: 'Repasar Escena 3 del Video-Guía',
          explanation: 'Trabajar de claro a oscuro conserva la luminosidad del soporte y facilita mezclas limpias.'
        },
        {
          id: 'q5',
          skillTag: '5. Revisión Estética',
          question: '¿Por qué es útil sostener tu trabajo a un brazo de distancia antes de darlo por terminado?',
          options: [
            'Ayuda a apreciar si la composición entera está equilibrada',
            'Sirve para esconder el dibujo de la luz',
            'Evita mirar los colores empleados',
            'Para borrar todo y comenzar desde cero siempre'
          ],
          correctIndex: 0,
          hint: 'Mira la Diapositiva 4 sobre la vista general a distancia.',
          remediationRef: 'Repasar Diapositiva 4',
          explanation: 'La perspectiva global revela desbalances entre zonas que de cerca pasan inadvertidos.'
        }
      ]
    };
  }

  if (domain === 'ciencias') {
    return {
      slides: [
        {
          step: 1,
          title: `1. Comprendiendo "${topic}" en ${subject}`,
          badge: 'Idea Principal',
          visualType: 'concept',
          bullets: [
            'Identificar qué elementos interactúan en el fenómeno',
            'Distinguir causa inicial y efecto observable',
            'Conectar la teoría científica con algo cotidiano'
          ],
          content: `En ${subject}, estudiar "${topic}" es como ser detective de la naturaleza: primero observamos qué ocurre y qué componentes participan antes de memorizar nombres difíciles.`,
          visualAnalogy: 'Cuando hierves agua en la cocina ves vapor subir: la causa es el calor y el efecto es el cambio de estado líquido a gaseoso.',
          keyTakeaway: 'Observa qué cambia, por qué ocurre y qué evidencia deja.',
          checkQuestion: '¿Cuál es la diferencia entre una causa y un efecto en un fenómeno natural?'
        },
        {
          step: 2,
          title: '2. El Método Científico en 3 Pasos',
          badge: 'Método Paso a Paso',
          visualType: 'steps',
          bullets: [
            '🟢 Observo: anoto los elementos y condiciones iniciales',
            '🟡 Analizo relación: identifico qué factor produce el cambio',
            '🔵 Compruebo: contrasto mi respuesta con la evidencia'
          ],
          content: 'Al enfrentar una pregunta científica larga, no intentes adivinar de memoria. Aplica siempre esta ruta corta de tres pasos.',
          visualAnalogy: 'Igual que revisar por qué una planta creció más cerca de la ventana: comparas luz, agua y resultado final.',
          keyTakeaway: 'Pregunta clave -> Variables en juego -> Evidencia real.',
          checkQuestion: '¿Qué haces en el primer paso antes de formular una explicación?'
        },
        {
          step: 3,
          title: '3. Datos clave vs. Texto distractor',
          badge: 'Truco Clave',
          visualType: 'comparison',
          bullets: [
            'Subraya la variable que cambia en el experimento',
            'Identifica unidades, temperatura o seres involucrados',
            'Descarta adornos de contexto que no alteran el proceso'
          ],
          content: 'Muchos enunciados de ciencias cuentan una historia larga alrededor del experimento. Subraya solo qué cambió y qué se midió.',
          visualAnalogy: 'En una receta de laboratorio, el color del frasco no cambia la reacción, pero sí la cantidad o temperatura.',
          keyTakeaway: 'Focus en lo que cambia (causa) y lo que se mide (resultado).',
          checkQuestion: '¿Qué tipo de detalles de un enunciado científico puedes ignorar con seguridad?'
        },
        {
          step: 4,
          title: '4. Caso Experimental Paso a Paso',
          badge: 'Ejemplo Guiado',
          visualType: 'example',
          bullets: [
            'Situación: dos muestras idénticas bajo una sola diferencia',
            'Registro: anotar el cambio observable después del tiempo dado',
            'Conclusión: vincular el resultado únicamente con esa diferencia'
          ],
          content: `Para explicar "${topic}", comparamos dos casos donde solo cambia un factor. Así comprobamos con certeza qué produjo la transformación.`,
          visualAnalogy: 'Dos vasos con hielo: uno al sol y otro a la sombra. El único cambio es la luz solar; el resultado nos confirma su efecto térmico.',
          keyTakeaway: 'Cambia una sola condición a la vez para sacar conclusiones seguras.',
          checkQuestion: 'Si cambias tres condiciones a la vez en un experimento, ¿sabrás cuál causó el efecto?'
        },
        {
          step: 5,
          title: `5. ¡Modo Científico Activo, ${firstName}!`,
          badge: 'Resumen Visual',
          visualType: 'summary',
          bullets: [
            'Identifica componentes y causa -> efecto',
            'Filtra el enunciado buscando la variable que cambia',
            'Valida tu respuesta contra las evidencias del caso'
          ],
          content: 'Ya cuentas con tu método visual de ciencias. Escucha tu cápsula de audio y revisa el video para reforzar cada concepto antes del reto.',
          visualAnalogy: 'Tu lupa científica está calibrada: observas, comparas y concluyes sin enredos.',
          keyTakeaway: 'Evidencia clara + Causa y efecto = Respuesta científica segura.',
          checkQuestion: '¿Qué es lo primero que subrayarás en tu siguiente pregunta de ciencias?'
        }
      ],
      audioCapsule: {
        title: `Cápsula de Audio para ${firstName}: ${topic}`,
        estimatedDurationSec: 82,
        voiceTone: 'Cálido, curioso y claro',
        segments: [
          {
            id: 1,
            timeLabel: '0:00',
            speaker: 'Mentor IA',
            text: `¡Hola ${firstName}! Qué alegría repasar ${subject} contigo. El tema "${topic}" se vuelve mucho más claro cuando dejamos de memorizar frases sueltas y miramos cómo funciona en la vida real.`
          },
          {
            id: 2,
            timeLabel: '0:22',
            speaker: 'Mentor IA',
            text: `Cada vez que leas un caso o experimento, hazte dos preguntas cortas: qué elemento provocó el cambio y qué se observó al final. Esa conexión causa y efecto es la clave.`
          },
          {
            id: 3,
            timeLabel: '0:46',
            speaker: 'Mentor IA',
            text: `Si ves un enunciado largo, subraya únicamente las sustancias, organismos o condiciones que varían entre una muestra y otra, y descarta los adornos del relato.`
          },
          {
            id: 4,
            timeLabel: '1:08',
            speaker: 'Mentor IA',
            text: `Revisa ahora el video explicativo y supera los juegos didácticos. ¡Verás que el examen será pan comido!`
          }
        ]
      },
      videoGuide: {
        title: `Video-Guía Científica: ${topic}`,
        durationLabel: '2 min 00 s',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Escena 1: Observación del fenómeno real',
            durationSec: 30,
            visualCue: '🔬 Esquema visual mostrando los elementos iniciales en calma.',
            narration: `Ubicamos los protagonistas del fenómeno en "${topic}" y observamos cómo se encuentran antes de que actúe el factor de cambio.`,
            scaffoldingStep: 'Identificar los componentes iniciales del sistema.'
          },
          {
            sceneNumber: 2,
            title: 'Escena 2: Identificación de causa y efecto',
            durationSec: 30,
            visualCue: '⚡ Flecha luminosa conectando el estímulo con la transformación.',
            narration: 'Seguimos qué variable cambia (luz, temperatura, mezcla o interacción) y qué transformación directa desencadena.',
            scaffoldingStep: 'Relacionar la variable de cambio con su efecto directo.'
          },
          {
            sceneNumber: 3,
            title: 'Escena 3: Comparación experimental',
            durationSec: 30,
            visualCue: '🧪 Dos recipientes comparados manteniendo todo igual excepto un factor.',
            narration: 'Comparamos la muestra de control con la experimental para confirmar qué propiedad realmente explica el comportamiento.',
            scaffoldingStep: 'Comparar evidencia manteniendo un único factor variable.'
          },
          {
            sceneNumber: 4,
            title: 'Escena 4: Conclusión verificada',
            durationSec: 30,
            visualCue: '✅ Síntesis visual con la regla científica comprobada.',
            narration: 'Validamos que la explicación elegida responda exactamente lo que muestran los datos observados.',
            scaffoldingStep: 'Comprobar coherencia entre evidencia y conclusión.'
          }
        ]
      },
      quizQuestions: [
        {
          id: 'q1',
          skillTag: '1. Lectura Experimental',
          question: `Al analizar un caso sobre "${topic}" en ${subject}, ¿qué debes identificar primero en el enunciado?`,
          options: [
            'Los elementos que participan y cuál condición o variable está cambiando',
            'La palabra más larga para memorizarla sin comprenderla',
            'El color de la hoja o del frasco mencionado como adorno',
            'Responder sin leer los resultados observados'
          ],
          correctIndex: 0,
          hint: 'Recuerda la Diapositiva 2 y 3: ubica qué cambia y qué se observa.',
          remediationRef: 'Repasar Diapositivas 2 y 3',
          explanation: 'Separar la variable que cambia del resto de información aclara de inmediato qué fenómeno está ocurriendo.'
        },
        {
          id: 'q2',
          skillTag: '2. Causa y Efecto',
          question: 'Si colocas una planta en oscuridad total manteniendo el mismo riego, y notas que sus hojas pierden color verde, ¿cuál fue la causa directa?',
          options: [
            'La falta de luz solar para realizar sus procesos normales',
            'El nombre científico de la maceta',
            'Que recibió exactamente la misma cantidad de agua',
            'La hora del día en que se tomó la fotografía'
          ],
          correctIndex: 0,
          hint: 'Mira la Diapositiva 4: identifica cuál fue la única condición que varió.',
          remediationRef: 'Repasar Diapositiva 4 (Caso Experimental)',
          explanation: 'Al mantener constante el riego, el cambio en las hojas se explica por la ausencia de luz.'
        },
        {
          id: 'q3',
          skillTag: '3. Control de Variables',
          question: 'Para estar 100% seguro de qué ingrediente aceleró una transformación en laboratorio, ¿cómo debes probarlo?',
          options: [
            'Comparando dos muestras iguales donde solo cambie ese ingrediente',
            'Cambiando la temperatura, el frasco y cuatro sustancias al mismo tiempo',
            'Adivinando antes de observar lo que pasa en las muestras',
            'Ignorando la muestra testigo'
          ],
          correctIndex: 0,
          hint: 'Revisa el consejo de la Escena 3 del Video-Guía.',
          remediationRef: 'Repasar Escena 3 del Video-Guía',
          explanation: 'Variar un solo factor a la vez garantiza saber exactamente qué produjo el cambio.'
        },
        {
          id: 'q4',
          skillTag: '4. Evidencia vs. Suposición',
          question: '¿Qué diferencia una conclusión científica válida de una suposición sin respaldo?',
          options: [
            'La conclusión se apoya en hechos y mediciones observadas directamente',
            'La conclusión siempre es más larga y tiene palabras complicadas',
            'La suposición nunca se puede probar ni comparar',
            'Ambas valen exactamente lo mismo aunque contradigan los datos'
          ],
          correctIndex: 0,
          hint: 'Recuerda la Diapositiva 5 y Escena 4.',
          remediationRef: 'Repasar Diapositiva 5 y Escena 4',
          explanation: 'Toda afirmación científica debe coincidir con la evidencia observada.'
        },
        {
          id: 'q5',
          skillTag: '5. Síntesis del Método',
          question: '¿Cuál ruta ordenada te ayuda a resolver cualquier pregunta de ciencias sin saturar tu memoria?',
          options: [
            'Observar elementos -> Detectar qué factor cambia -> Confirmar el efecto con los datos',
            'Elegir la opción C automáticamente cuando el texto tiene más de tres líneas',
            'Leer solo la última palabra del párrafo',
            'Cambiar los datos del experimento mentalmente'
          ],
          correctIndex: 0,
          hint: 'Repasa el Método Científico en 3 Pasos de la Diapositiva 2.',
          remediationRef: 'Repasar Diapositiva 2',
          explanation: 'Seguir observación, relación causa-efecto y validación vuelve predecible cualquier caso.'
        }
      ]
    };
  }

  if (domain === 'espanol') {
    return {
      slides: [
        {
          step: 1,
          title: `1. Claves de "${topic}" en ${subject}`,
          badge: 'Idea Principal',
          visualType: 'concept',
          bullets: [
            'Distinguir la idea central de los detalles secundarios',
            'Identificar quién realiza la acción y para qué',
            'Detectar conectores que unen las ideas del texto'
          ],
          content: `Leer o redactar sobre "${topic}" no exige memorizar párrafos enteros: basta con extraer el mensaje central de cada bloque y ver cómo se conecta con el siguiente.`,
          visualAnalogy: 'La idea principal es el tronco de un árbol; los ejemplos y fechas son las ramas que lo sostienen.',
          keyTakeaway: 'Pregúntate siempre: "¿De qué o de quién habla principalmente este párrafo?"',
          checkQuestion: '¿Qué representa el "tronco" del árbol dentro de un texto corto?'
        },
        {
          step: 2,
          title: '2. El Filtro Lector de los 3 Pasos',
          badge: 'Método Paso a Paso',
          visualType: 'steps',
          bullets: [
            '🟢 Primer vistazo: lee título y primera oración de cada bloque',
            '🟡 Subrayado activo: marca sujeto, acción y conector clave',
            '🔵 Respuesta propia: explica la idea con 5 palabras sencillas'
          ],
          content: 'Si un texto largo te cansa, léelo por párrafos cortos usando este filtro visual antes de mirar las preguntas.',
          visualAnalogy: 'Es como ver el tráiler y los capítulos de una serie antes de contarle a un amigo de qué trata.',
          keyTakeaway: 'Lee por bloques breves y resume cada párrafo en una mini-frase.',
          checkQuestion: '¿Cuántas palabras necesitas aproximadamente para resumir la idea de un párrafo?'
        },
        {
          step: 3,
          title: '3. Idea Central vs. Detalle Decorativo',
          badge: 'Truco Clave',
          visualType: 'comparison',
          bullets: [
            'Idea principal: si la quitas, el párrafo pierde sentido',
            'Detalle secundario: ejemplo o adorno que amplía la idea',
            'Conector clave: "sin embargo", "por eso", "primero"'
          ],
          content: 'Las opciones distractoras suelen copiar una frase exacta del texto que solo era un ejemplo menor. Verifica siempre si abarca todo el párrafo.',
          visualAnalogy: 'El titular de una noticia resume todo el evento; la ropa del protagonista es solo un detalle.',
          keyTakeaway: 'Elige la idea que resume todo el bloque, no un ejemplo suelto.',
          checkQuestion: '¿Cómo sabes si una frase es la idea principal y no un simple detalle?'
        },
        {
          step: 4,
          title: '4. Lectura Guiada en Cámara Lenta',
          badge: 'Ejemplo Guiado',
          visualType: 'example',
          bullets: [
            'Texto: "Las abejas polinizan flores; por eso protegen los cultivos."',
            'Conector causal detectado: "por eso" indica consecuencia',
            'Idea central: importancia ecológica de la polinización'
          ],
          content: `Observa cómo en "${topic}" un conector como "por eso" o "sin embargo" te revela al instante hacia dónde va la intención del autor.`,
          visualAnalogy: 'Los conectores son señales de tránsito en la lectura: te avisan si sigues recto, frenas o cambias de dirección.',
          keyTakeaway: 'Encierra conectores lógicos: indican causa, contraste u orden.',
          checkQuestion: '¿Qué te indica el conector "sin embargo" dentro de una oración?'
        },
        {
          step: 5,
          title: `5. ¡A Dominar la Lectura, ${firstName}!`,
          badge: 'Resumen Visual',
          visualType: 'summary',
          bullets: [
            'Divide el texto en párrafos manejables',
            'Encuentra el tema central y los conectores lógicos',
            'Comprueba tus respuestas volviendo al fragmento clave'
          ],
          content: 'Ya cuentas con tu estrategia de comprensión y expresión. Escucha tu cápsula de audio y mira la guía en video antes de jugar y evaluar.',
          visualAnalogy: 'Tu mapa de lectura está listo: sin releer diez veces a ciegas, vas directo al punto clave.',
          keyTakeaway: 'Bloque corto + Conector + Resumen propio = Comprensión segura.',
          checkQuestion: '¿Cuál paso aplicarás al encontrarte un texto de cuatro párrafos?'
        }
      ],
      audioCapsule: {
        title: `Cápsula de Audio para ${firstName}: ${topic}`,
        estimatedDurationSec: 80,
        voiceTone: 'Cálido, expresivo y pausado',
        segments: [
          {
            id: 1,
            timeLabel: '0:00',
            speaker: 'Mentor IA',
            text: `¡Hola ${firstName}! En ${subject} tienes una gran ventaja cuando ves el texto por partes. Hoy vamos a dominar "${topic}" con tres trucos muy fáciles.`
          },
          {
            id: 2,
            timeLabel: '0:21',
            speaker: 'Mentor IA',
            text: `No leas todo de golpe tratando de recordarlo palabra por palabra. Lee un párrafo corto, encierra palabras enlace como "sin embargo" o "por eso", y pregúntate de qué trató en una frase.`
          },
          {
            id: 3,
            timeLabel: '0:45',
            speaker: 'Mentor IA',
            text: `Recuerda distinguir la idea tronco del texto frente a los detalles secundarios. Si dudas entre dos opciones del examen, regresa exactamente al párrafo que responde la pregunta.`
          },
          {
            id: 4,
            timeLabel: '1:06',
            speaker: 'Mentor IA',
            text: `Ahora dale un vistazo al video de apoyo y practica con los juegos interactivos antes del reto final. ¡Tú puedes!`
          }
        ]
      },
      videoGuide: {
        title: `Guía de Lectura y Lenguaje: ${topic}`,
        durationLabel: '2 min 00 s',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Escena 1: Exploración del título y párrafos',
            durationSec: 30,
            visualCue: '📖 Título resaltado y texto dividido visualmente en bloques cortos.',
            narration: `Antes de leer al detalle sobre "${topic}", miramos el título y dividimos el texto en bloques cortos para no saturar la atención.`,
            scaffoldingStep: 'Segmentar el texto por párrafos y ubicar palabras clave.'
          },
          {
            sceneNumber: 2,
            title: 'Escena 2: Caza de conectores y acción central',
            durationSec: 30,
            visualCue: '🖍️ Sujeto y conectores lógicos ("por eso", "pero") destacados.',
            narration: 'Subrayamos quién realiza la acción y el conector que une la causa con la consecuencia o contraste.',
            scaffoldingStep: 'Detectar sujetos, verbos clave y conectores.'
          },
          {
            sceneNumber: 3,
            title: 'Escena 3: Separar idea tronco de detalles',
            durationSec: 30,
            visualCue: '🌳 Diagrama de tronco (idea principal) y ramas (ejemplos).',
            narration: 'Comprobamos qué idea sostiene todo el párrafo y cuáles solo agregan ejemplos complementarios.',
            scaffoldingStep: 'Diferenciar idea principal de detalles secundarios.'
          },
          {
            sceneNumber: 4,
            title: 'Escena 4: Verificación textual antes de responder',
            durationSec: 30,
            visualCue: '✅ Señal de regreso exacto al renglón de evidencia.',
            narration: 'Antes de marcar en el examen, confirmamos que nuestra opción coincida con la evidencia escrita en el texto.',
            scaffoldingStep: 'Verificar la respuesta directamente en el texto base.'
          }
        ]
      },
      quizQuestions: [
        {
          id: 'q1',
          skillTag: '1. Segmentación Lectora',
          question: `Cuando te encuentras con una lectura extensa sobre "${topic}", ¿qué estrategia inicial facilita tu comprensión?`,
          options: [
            'Leer por párrafos cortos identificando la idea central de cada bloque',
            'Leer lo más rápido posible sin detenerte en los puntos',
            'Saltarte el primer párrafo e intentar adivinar el tema',
            'Contar cuántas letras mayúsculas tiene toda la página'
          ],
          correctIndex: 0,
          hint: 'Revisa el Filtro Lector de la Diapositiva 2.',
          remediationRef: 'Repasar Diapositiva 2',
          explanation: 'Fragmentar el texto descarga la memoria de trabajo y evita perder el hilo.'
        },
        {
          id: 'q2',
          skillTag: '2. Idea Principal vs. Detalle',
          question: '¿Cómo reconoces cuál es la idea principal de un párrafo?',
          options: [
            'Es la idea general sin la cual el resto del párrafo perdería sentido',
            'Es siempre la palabra más rara que aparece entre paréntesis',
            'Es un número o color decorativo mencionado una sola vez',
            'Es obligatoriamente la última palabra del texto'
          ],
          correctIndex: 0,
          hint: 'Recuerda la metáfora del árbol en la Diapositiva 1 y la Diapositiva 3.',
          remediationRef: 'Repasar Diapositivas 1 y 3',
          explanation: 'La idea principal sostiene todo el bloque; los detalles la ilustran.'
        },
        {
          id: 'q3',
          skillTag: '3. Uso de Conectores',
          question: 'En la frase "Practicamos la lectura diaria; por eso comprendemos mejor los textos", ¿qué función cumple el conector "por eso"?',
          options: [
            'Indica que la segunda parte es consecuencia de la primera',
            'Contradice y niega lo que se dijo al principio',
            'Indica un lugar geográfico diferente',
            'Reemplaza al sujeto de la oración'
          ],
          correctIndex: 0,
          hint: 'Mira el ejemplo guiado de la Diapositiva 4.',
          remediationRef: 'Repasar Diapositiva 4',
          explanation: '"Por eso" es un conector de consecuencia que une una acción con su resultado.'
        },
        {
          id: 'q4',
          skillTag: '4. Conectores de Contraste',
          question: '¿Para qué utiliza un autor la expresión "sin embargo" al unir dos oraciones?',
          options: [
            'Para introducir una idea que contrasta o matiza la anterior',
            'Para repetir exactamente las mismas palabras otra vez',
            'Para indicar que el texto ha finalizado por completo',
            'Para enumerar ingredientes sin relación'
          ],
          correctIndex: 0,
          hint: 'Piensa en las señales de tránsito de la Diapositiva 4.',
          remediationRef: 'Repasar Diapositiva 4',
          explanation: '"Sin embargo" advierte un giro o contraste respecto al enunciado previo.'
        },
        {
          id: 'q5',
          skillTag: '5. Comprobación Textual',
          question: 'Si dudas entre dos respuestas de comprensión lectora, ¿qué paso rápido te da seguridad?',
          options: [
            'Regresar al párrafo exacto y comprobar qué opción se respalda en lo escrito',
            'Elegir la opción que inventa datos no mencionados',
            'Seleccionar siempre la respuesta más corta sin releer',
            'Dejar el punto sin responder aunque haya intentos disponibles'
          ],
          correctIndex: 0,
          hint: 'Revisa la Escena 4 del Video-Guía y la Diapositiva 5.',
          remediationRef: 'Repasar Escena 4 y Diapositiva 5',
          explanation: 'Validar contra el párrafo evita caer en suposiciones fuera del texto.'
        }
      ]
    };
  }

  if (domain === 'convivencia') {
    return {
      slides: [
        {
          step: 1,
          title: `1. Entendiendo "${topic}" en ${subject}`,
          badge: 'Idea Principal',
          visualType: 'concept',
          bullets: [
            'Reconocer qué personas o actores participan en la situación',
            'Identificar emociones, necesidades y normas de respeto',
            'Buscar acuerdos justos donde todos puedan convivir'
          ],
          content: `En ${subject}, abordar "${topic}" significa analizar situaciones cotidianas pensando tanto en lo que tú sientes como en el bienestar del grupo o comunidad.`,
          visualAnalogy: 'La convivencia es como una mesa firme: necesita las cuatro patas (escucha, respeto, diálogo y acuerdos) para no tambalear.',
          keyTakeaway: 'Escucha + Respeto + Acuerdo = Solución constructiva.',
          checkQuestion: '¿Qué ocurre en un grupo cuando todos quieren hablar pero nadie escucha?'
        },
        {
          step: 2,
          title: '2. La Ruta del Acuerdo en 3 Pasos',
          badge: 'Método Paso a Paso',
          visualType: 'steps',
          bullets: [
            '🟢 Pausa y escucha: calma antes de responder impulsivamente',
            '🟡 Ponerse en el lugar del otro: comprender qué necesita cada parte',
            '🔵 Propuesta justa: elegir una acción concreta y respetuosa'
          ],
          content: 'Ante cualquier conflicto escolar o dilema ciudadano, seguir estos 3 pasos transforma una discusión en un acuerdo práctico.',
          visualAnalogy: 'Antes de responder con enojo, respira 3 segundos como poner en pausa un video para mirar toda la escena con claridad.',
          keyTakeaway: 'Pausa primero, comprende después, acuerda al final.',
          checkQuestion: '¿Por qué es clave hacer una pausa breve antes de reaccionar en un desacuerdo?'
        },
        {
          step: 3,
          title: '3. Diálogo Asertivo vs. Reacción Impulsiva',
          badge: 'Truco Clave',
          visualType: 'comparison',
          bullets: [
            'Expresar cómo te sientes sin atacar ni burlarte',
            'Proponer turnos claros de participación',
            'Diferenciar hechos concretos de chismes o suposiciones'
          ],
          content: 'Decir "me incomoda cuando..." en lugar de gritar o acusar mantiene abiertas las puertas al respeto mutuo.',
          visualAnalogy: 'Hablar en primera persona construye puentes; insultar levanta muros que impiden entendernos.',
          keyTakeaway: 'Comunica tu punto con firmeza y respeto, nunca con agresión.',
          checkQuestion: '¿Cuál forma de hablar facilita que un compañero te escuche mejor?'
        },
        {
          step: 4,
          title: '4. Caso Escolar Resuelto Paso a Paso',
          badge: 'Ejemplo Guiado',
          visualType: 'example',
          bullets: [
            'Caso: dos compañeros quieren usar el mismo espacio al tiempo',
            'Análisis: ambos tienen derecho a participar sin exclusión',
            'Acuerdo: dividir turnos iguales o trabajar en roles compartidos'
          ],
          content: `Al aplicar "${topic}" a un caso real del colegio, evaluamos cuál decisión respeta las normas y cuida las relaciones entre pares.`,
          visualAnalogy: 'Turnarse por tiempos iguales permite que ambos participen en paz en lugar de bloquearse.',
          keyTakeaway: 'Un buen acuerdo beneficia la convivencia sin dejar a nadie excluido.',
          checkQuestion: 'Si dos equipos quieren la misma cancha, ¿cómo logran un acuerdo justo?'
        },
        {
          step: 5,
          title: `5. ¡Líder de Convivencia, ${firstName}!`,
          badge: 'Resumen Visual',
          visualType: 'summary',
          bullets: [
            'Escucha activa mirando los hechos con calma',
            'Empatía y respeto hacia todas las personas',
            'Acuerdos concretos y verificables en comunidad'
          ],
          content: 'Ya tienes claras las herramientas para resolver dilemas ciudadanos y escolares con criterio propio. Continúa al audio y video antes del reto.',
          visualAnalogy: 'Tu brújula ciudadana te guía hacia decisiones justas, solidarias y pacíficas.',
          keyTakeaway: 'Calma + Empatía + Compromiso = Convivencia armónica.',
          checkQuestion: '¿Qué compromiso sencillo aplicarías hoy en tu salón de clases?'
        }
      ],
      audioCapsule: {
        title: `Cápsula de Audio para ${firstName}: ${topic}`,
        estimatedDurationSec: 78,
        voiceTone: 'Cálido, cercano y reflexivo',
        segments: [
          {
            id: 1,
            timeLabel: '0:00',
            speaker: 'Mentor IA',
            text: `¡Hola ${firstName}! En ${subject} valoramos muchísimo cómo entiendes las situaciones humanas. Hoy vamos a fortalecer "${topic}" de manera práctica.`
          },
          {
            id: 2,
            timeLabel: '0:21',
            speaker: 'Mentor IA',
            text: `Cuando leas un caso o vivas un desacuerdo en el aula, no actúes en automático. Haz una pausa breve, identifica quiénes están involucrados y qué necesita cada persona.`
          },
          {
            id: 3,
            timeLabel: '0:44',
            speaker: 'Mentor IA',
            text: `Recuerda usar la comunicación asertiva: explicar lo que piensas con respeto y buscar soluciones donde todos tengan turnos y normas justas.`
          },
          {
            id: 4,
            timeLabel: '1:04',
            speaker: 'Mentor IA',
            text: `Revisa ahora el video paso a paso y diviértete con los juegos interactivos antes de responder tu reto.`
          }
        ]
      },
      videoGuide: {
        title: `Video-Guía Ciudadana: ${topic}`,
        durationLabel: '2 min 00 s',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Escena 1: Lectura serena de la situación',
            durationSec: 30,
            visualCue: '🤝 Dos puntos de vista frente a frente analizados con calma.',
            narration: `Identificamos qué pasó realmente en el caso de "${topic}", separando los hechos reales de las emociones del momento.`,
            scaffoldingStep: 'Describir los hechos y actores involucrados sin juzgar.'
          },
          {
            sceneNumber: 2,
            title: 'Escena 2: Pausa y escucha empática',
            durationSec: 30,
            visualCue: '💬 Turnos de palabra claros con escucha atenta.',
            narration: 'Damos turno para escuchar a cada integrante sin interrupciones para entender sus necesidades.',
            scaffoldingStep: 'Escuchar activamente la perspectiva de la otra persona.'
          },
          {
            sceneNumber: 3,
            title: 'Escena 3: Construcción de opciones justas',
            durationSec: 30,
            visualCue: '⚖️ Balanza equilibrada mostrando alternativas respetuosas.',
            narration: 'Comparamos posibles salidas y descartamos las que humillan o excluyen a alguien del grupo.',
            scaffoldingStep: 'Evaluar alternativas que respeten normas y dignidad.'
          },
          {
            sceneNumber: 4,
            title: 'Escena 4: Acuerdo y seguimiento en grupo',
            durationSec: 30,
            visualCue: '✅ Compromiso concreto firmado con respeto mutuo.',
            narration: 'Cerramos con un compromiso claro que ambos pueden cumplir en el aula o comunidad.',
            scaffoldingStep: 'Elegir un acuerdo práctico y verificar su cumplimiento.'
          }
        ]
      },
      quizQuestions: [
        {
          id: 'q1',
          skillTag: '1. Pausa y Calma',
          question: `Ante un desacuerdo relacionado con "${topic}", ¿cuál es el primer paso recomendado para evitar empeorar la situación?`,
          options: [
            'Hacer una pausa breve y escuchar qué ocurrió realmente antes de responder',
            'Gritar más fuerte para que todos hagan silencio',
            'Culpar inmediatamente a otra persona sin preguntar',
            'Abandonar el equipo dejando el problema sin hablar'
          ],
          correctIndex: 0,
          hint: 'Recuerda el paso verde de la Diapositiva 2.',
          remediationRef: 'Repasar Diapositiva 2',
          explanation: 'La pausa previa calma la impulsividad y abre espacio al diálogo respetuoso.'
        },
        {
          id: 'q2',
          skillTag: '2. Comunicación Asertiva',
          question: '¿Cuál frase expresa un desacuerdo de manera respetuosa y asertiva?',
          options: [
            '"No estoy de acuerdo con esa idea; propongo que probemos turnos iguales"',
            '"Tu idea no sirve para nada y siempre lo haces mal"',
            '"Nadie te pidió opinión en este grupo"',
            'Burlarse en voz baja con otro compañero'
          ],
          correctIndex: 0,
          hint: 'Revisa la comparación de la Diapositiva 3.',
          remediationRef: 'Repasar Diapositiva 3',
          explanation: 'El lenguaje asertivo defiende un punto con firmeza sin herir ni descalificar.'
        },
        {
          id: 'q3',
          skillTag: '3. Acuerdos Justos',
          question: 'Dos estudiantes necesitan usar el mismo material didáctico al mismo tiempo. ¿Qué solución aplica mejor el trabajo colaborativo?',
          options: [
            'Organizar turnos por tiempo igualitario o trabajar juntos en parejas',
            'Esconder el material para que nadie lo use',
            'Discutir hasta que termine la clase sin avanzar',
            'Romper el material en dos partes iguales aunque deje de servir'
          ],
          correctIndex: 0,
          hint: 'Mira el ejemplo guiado de la Diapositiva 4.',
          remediationRef: 'Repasar Diapositiva 4',
          explanation: 'Turnarse o compartir roles resuelve el uso del recurso cuidando a ambas partes.'
        },
        {
          id: 'q4',
          skillTag: '4. Empatía y Normas',
          question: '¿Por qué es importante respetar los acuerdos establecidos en el salón de clase?',
          options: [
            'Porque crean un ambiente seguro donde todos saben qué esperar y pueden aprender en paz',
            'Para impedir que los estudiantes compartan ideas',
            'Únicamente para evitar hablar con los compañeros',
            'Porque las normas cambian cada cinco minutos sin sentido'
          ],
          correctIndex: 0,
          hint: 'Repasa la Diapositiva 1 y Escena 3 del Video.',
          remediationRef: 'Repasar Diapositiva 1 y Escena 3',
          explanation: 'Los acuerdos claros protegen los derechos de todo el grupo y evitan conflictos innecesarios.'
        },
        {
          id: 'q5',
          skillTag: '5. Cierre Ciudadano',
          question: '¿Qué combinación resume la mejor ruta de convivencia aprendida hoy?',
          options: [
            'Pausa y escucha + Empatía + Acuerdo justo para todos',
            'Impulsividad + Silencio hostil + Exclusión',
            'Competir por el control + Ignorar reglas',
            'Tomar decisiones sin escuchar a nadie más'
          ],
          correctIndex: 0,
          hint: 'Consulta tu Resumen Visual en la Diapositiva 5.',
          remediationRef: 'Repasar Diapositiva 5',
          explanation: 'Calma, empatía y acuerdos construyen comunidades escolares más inclusivas.'
        }
      ]
    };
  }

  // Dominio por defecto: Matemáticas y Pensamiento Cuantitativo
  return {
    slides: [
      {
        step: 1,
        title: `1. ¿Qué es realmente "${topic}"?`,
        badge: 'Idea Principal',
        visualType: 'concept',
        bullets: [
          'Identificar datos reales antes de operar',
          'Agrupar cantidades iguales para ver patrones',
          'Evitar cálculos mentales largos sin esquema'
        ],
        content: `Antes de hacer cálculos largos, piensa en "${topic}" como organizar información de algo que te gusta para descubrir relaciones y patrones de un solo vistazo.`,
        visualAnalogy: 'Imagina organizar los resultados de tus 10 partidos o videojuegos favoritos: primero agrupas los datos iguales y luego miras cuál se repite más.',
        keyTakeaway: 'Paso 1: Observar y agrupar sin mezclar los datos.',
        checkQuestion: '¿Por qué es más fácil agrupar primero los datos iguales antes de operar?'
      },
      {
        step: 2,
        title: '2. El Semáforo de los 3 Pasos (Tu Mapa Mental)',
        badge: 'Método Paso a Paso',
        visualType: 'steps',
        bullets: [
          '🟢 Identifico los datos clave y lo que me preguntan',
          '🟡 Aplico la relación u operación en orden limpio',
          '🔵 Verifico si el resultado final tiene sentido lógico'
        ],
        content: 'Cuando veas un ejercicio en un examen, nunca intentes resolver todo de golpe en la mente. Aplica siempre el Semáforo en tres micro-pasos.',
        visualAnalogy: 'Igual que armar una estructura por bloques: si pones la base verde primero, el bloque amarillo encaja sin esfuerzo.',
        keyTakeaway: 'Divide el problema grande en 3 pasos cortos y tacha cada uno al completarlo.',
        checkQuestion: '¿Cuál es el color del primer paso que debes hacer al leer una pregunta?'
      },
      {
        step: 3,
        title: '3. Donde todos se confunden (y cómo tú lo evitarás)',
        badge: 'Truco Clave',
        visualType: 'comparison',
        bullets: [
          'Encierra el total de referencia en una esquina visible',
          'No saltes directo del primer número a la respuesta',
          'Usa la unidad correcta en cada paso de la tabla'
        ],
        content: `El error más común en ${subject} al trabajar "${topic}" es saltar del dato inicial a la respuesta final olvidando el total general. Siempre escribe el total aparte.`,
        visualAnalogy: 'Si divides una pizza en 8 porciones y tomas 2, el número 8 (el total) nunca cambia: es tu punto de referencia fijo.',
        keyTakeaway: 'Ancla visual: encierra en un círculo el dato total antes de empezar a calcular.',
        checkQuestion: '¿Qué dato debes encerrar en un círculo antes de hacer el paso intermedio?'
      },
      {
        step: 4,
        title: '4. Ejemplo Resuelto en Cámara Lenta',
        badge: 'Ejemplo Guiado',
        visualType: 'example',
        bullets: [
          'Contamos cada subgrupo con calma (4 aciertos de 8)',
          'Comprobamos que todas las partes sumen el total (4 + 4 = 8)',
          'Interpretamos la relación o proporción final (50%)'
        ],
        content: `Observa cómo resolvemos un caso típico de "${topic}": primero contamos cuántos elementos hay en cada grupo, verificamos el total y luego hallamos el resultado.`,
        visualAnalogy: 'Si de 10 lanzamientos encestas 5, la mitad exacta (50% o 5 de 10) fueron aciertos. ¡Así de directo!',
        keyTakeaway: 'Si la suma de las partes coincide con tu total encerrado, vas 100% seguro.',
        checkQuestion: 'Si tienes 4 aciertos de 8 intentos, ¿qué parte o mitad representa?'
      },
      {
        step: 5,
        title: `5. ¡Listo para el Reto, ${firstName}! Resumen`,
        badge: 'Resumen Visual',
        visualType: 'summary',
        bullets: [
          'Agrupa datos limpios descargando tu memoria',
          'Encierra el total como ancla fija',
          'Valida con tu prueba rápida de 5 segundos'
        ],
        content: 'Ya tienes las 3 llaves: 1) Agrupar con orden, 2) Encerrar el total como referencia fija y 3) Comprobar que las partes sumen el total.',
        visualAnalogy: 'Tu lista de chequeo mental está completa. Si dudas en el examen, vuelve a esta lámina en cualquier momento.',
        keyTakeaway: 'Orden visual + Paso a paso = Respuesta segura.',
        checkQuestion: '¿Estás listo para escuchar tu cápsula de audio?'
      }
    ],
    audioCapsule: {
      title: `Cápsula de Audio para ${firstName}: Dominando ${topic}`,
      estimatedDurationSec: 85,
      voiceTone: 'Cálido, claro y motivador (Ritmo pausado)',
      segments: [
        {
          id: 1,
          timeLabel: '0:00',
          speaker: 'Mentor IA',
          text: `¡Hola ${firstName}! Qué gusto acompañarte hoy en ${subject}. En tu última evaluación vimos que tienes buenas bases, así que este audio corto es para darte un truco infalible sobre ${topic}.`
        },
        {
          id: 2,
          timeLabel: '0:22',
          speaker: 'Mentor IA',
          text: 'A veces los enunciados largos parecen confusos porque traen muchos datos juntos. El secreto está en no guardar todo en la memoria al mismo tiempo: primero subraya qué te preguntan y encierra el número total.'
        },
        {
          id: 3,
          timeLabel: '0:48',
          speaker: 'Mentor IA',
          text: 'Luego, avanza en tres micro-pasos: organiza los datos en una fila limpia, haz una sola operación a la vez y revisa si el resultado tiene lógica con el ejemplo real que vimos en las diapositivas.'
        },
        {
          id: 4,
          timeLabel: '1:10',
          speaker: 'Mentor IA',
          text: 'Recuerda que al final tienes tu evaluación interactiva con varios intentos. Si alguna pregunta te reta, el sistema te dará una pista exacta para que en el siguiente intento la domines al cien por ciento.'
        }
      ]
    },
    videoGuide: {
      title: `Video-Guía Paso a Paso: ${topic} en 4 Escenas`,
      durationLabel: '2 min 00 s',
      scenes: [
        {
          sceneNumber: 1,
          title: 'Escena 1: Lectura limpia y subrayado inteligente',
          durationSec: 30,
          visualCue: '🎯 Enunciado iluminado con el dato principal en verde y el total en azul.',
          narration: `En esta primera escena vemos cómo limpiar el ruido de un problema de ${subject}: descartamos el texto decorativo y dejamos solo las cantidades clave.`,
          scaffoldingStep: 'Identificar y separar los datos numéricos del texto.'
        },
        {
          sceneNumber: 2,
          title: 'Escena 2: Construcción de la estructura paso a paso',
          durationSec: 30,
          visualCue: '📊 Tabla visual de 3 columnas que se completa bloque por bloque.',
          narration: 'Observa cómo cada dato pasa a su casilla correspondiente. Al ordenarlos visualmente, tu cerebro ya no tiene que recordarlos de memoria.',
          scaffoldingStep: 'Ubicar cada valor en su columna antes de calcular.'
        },
        {
          sceneNumber: 3,
          title: 'Escena 3: El cálculo intermedio sin errores',
          durationSec: 30,
          visualCue: '⚡ Relación entre la parte y el total resaltada con una barra de progreso.',
          narration: 'Aquí aplicamos el truco de la Diapositiva 3: comparamos cada dato con el total que encerramos al inicio para obtener la respuesta correcta.',
          scaffoldingStep: 'Relacionar la parte con el total de referencia.'
        },
        {
          sceneNumber: 4,
          title: 'Escena 4: Verificación rápida antes de marcar',
          durationSec: 30,
          visualCue: '✅ Sello de comprobación sumando los valores obtenidos.',
          narration: 'Antes de elegir una opción en el examen, hacemos la prueba de 5 segundos: comprobamos que el resultado guarde proporción con el total.',
          scaffoldingStep: 'Validar la respuesta final y descartar opciones distractoras.'
        }
      ]
    },
    quizQuestions: [
      {
        id: 'q1',
        skillTag: '1. Identificación y Agrupación de Datos',
        question: `Al iniciar un ejercicio de "${topic}" en ${subject}, ¿cuál es el primer paso recomendado para evitar confusiones con enunciados largos?`,
        options: [
          'Identificar los datos clave, agrupar los iguales y encerrar el total de referencia',
          'Intentar hacer todas las operaciones mentalmente sin escribir nada',
          'Elegir el número más grande del texto como respuesta final',
          'Saltarse la lectura de los datos e ir directo a las opciones'
        ],
        correctIndex: 0,
        hint: 'Recuerda el Semáforo de la Diapositiva 2 y la Escena 1 del Video: primero ordenamos visualmente y encerramos el total.',
        remediationRef: 'Repasar Diapositiva 2 y Escena 1 del Video',
        explanation: 'Separar y agrupar visualmente los datos descarga tu memoria de trabajo y evita errores por distracción.'
      },
      {
        id: 'q2',
        skillTag: '2. Conteo y Frecuencia Base',
        question: 'En una práctica escolar se registraron estos puntajes en 6 rondas: 3, 2, 3, 1, 3, 2. ¿Cuántas veces se repite el puntaje 3 (su frecuencia)?',
        options: [
          '2 veces',
          '3 veces (aparece en tres de las seis rondas)',
          '6 veces',
          '14 puntos en total'
        ],
        correctIndex: 1,
        hint: 'Cuenta únicamente cuántas veces aparece escrito el número 3 dentro de la lista de las 6 rondas.',
        remediationRef: 'Repasar Diapositiva 1 (Agrupación de datos)',
        explanation: 'El número 3 aparece exactamente en la primera, tercera y quinta ronda, por lo tanto su frecuencia es 3.'
      },
      {
        id: 'q3',
        skillTag: '3. Verificación del Total de Referencia',
        question: 'Si en un grupo de 10 actividades ya clasificaste 4 de tipo A y 4 de tipo B, ¿cuántas actividades faltan por clasificar para completar el total?',
        options: [
          'Faltan 2 actividades para llegar al total de 10',
          'Faltan 8 actividades',
          'Faltan 10 actividades',
          'No falta ninguna actividad'
        ],
        correctIndex: 0,
        hint: 'Usa el truco de la Diapositiva 3: tu total fijo es 10. Si ya llevas 4 + 4 = 8, ¿cuánto te falta para 10?',
        remediationRef: 'Repasar Diapositiva 3 y Minuto 0:48 del Audio',
        explanation: 'Al sumar las partes (4 + 4 = 8) y comparar con el total fijo (10), comprobamos que faltan 2.'
      },
      {
        id: 'q4',
        skillTag: '4. Proporción y Mitad Exacta',
        question: 'Si un estudiante realiza 8 ejercicios prácticos y resuelve correctamente 4 de ellos, ¿qué parte del total logró resolver?',
        options: [
          'La mitad exacta (50%, es decir 4 de 8)',
          'El total completo (100%)',
          'Menos de la cuarta parte (10%)',
          'El doble de los ejercicios'
        ],
        correctIndex: 0,
        hint: 'Mira el ejemplo guiado de la Diapositiva 4 y la Escena 3 del Video: 4 es exactamente la mitad de 8.',
        remediationRef: 'Repasar Diapositiva 4 y Escena 3 del Video',
        explanation: '4 de 8 equivale a la mitad del total, lo que representa el 50%.'
      },
      {
        id: 'q5',
        skillTag: '5. Aplicación Completa Paso a Paso',
        question: `Antes de marcar tu respuesta definitiva en un problema de "${topic}", ¿qué comprobación rápida de 5 segundos te asegura que no hubo error en el paso intermedio?`,
        options: [
          'Verificar que la suma de las partes coincida con el total encerrado al inicio',
          'Cambiar todos los números por otros diferentes al azar',
          'Borrar el procedimiento de la tabla',
          'Multiplicar el resultado por cien sin revisar la pregunta'
        ],
        correctIndex: 0,
        hint: 'Revisa la Escena 4 del Video-Guía y la Diapositiva 5: la suma de las partes siempre debe cuadrar con el total.',
        remediationRef: 'Repasar Escena 4 del Video y Diapositiva 5',
        explanation: 'Comprobar que las partes sumen el total valida todo tu procedimiento de principio a fin.'
      }
    ]
  };
}

function buildContextualPedagogicalContent({
  profile,
  subject,
  topic,
  carenciaObservada,
  teacherNotes,
  areaMatch
}) {
  const firstName = profile.primerNombre;
  const age = profile.edad || '13';
  const domain = resolveSubjectDomain(subject, topic);
  const domainContent = buildDomainMaterials({ domain, firstName, subject, topic });

  return {
    teacherDiagnosis: {
      deficitType: carenciaObservada || 'Metodológica y de Memoria de Trabajo',
      cognitiveCalibration: `Contenido calibrado para ${age} años (Grado ${profile.grado}) en el área de ${subject}. Se redujo la densidad léxica de los enunciados y se estructuró el tema "${topic}" en 5 diapositivas visuales con lectura en voz alta, video de apoyo en YouTube y práctica interactiva.`,
      rootCauseAnalysis: `Al cruzar el desempeño actual con el Anexo 2 del PIAR de ${profile.nombreCompleto}, se identifica que el estudiante comprende la noción inicial del tema, pero experimenta sobrecarga ejecutiva al encadenar pasos sin apoyo gráfico (${areaMatch.barreras}). ${teacherNotes ? `Observación docente integrada: "${teacherNotes}".` : ''}`,
      pedagogicalStrategy: `Aplicación directa del Ajuste Razonable pactado en su PIAR: "${areaMatch.ajustes}". Se diseñaron 5 láminas de presentación visual (con voz y descarga PowerPoint), un video de apoyo en YouTube con puntos clave y 4 juegos didácticos antes de la evaluación multi-intento.`,
      detectedStrengths: [
        'Excelente receptividad cuando el concepto se conecta con ejemplos visuales y cercanos',
        'Capacidad para resolver el primer paso operativo cuando la instrucción está resaltada',
        'Persistencia positiva cuando recibe retroalimentación formativa sin penalización brusca'
      ],
      detectedBarriers: [
        areaMatch.barreras,
        `Pérdida de secuencia en el paso intermedio de "${topic}" cuando no hay esquema o guía visual`
      ]
    },
    studentDiagnosis: {
      greetingTitle: `¡Hola, ${firstName}! Preparé esta ruta especial para ti`,
      encouragementMessage: `Revisamos tu avance en ${subject} y vimos que tienes muy buena base. Para que "${topic}" te resulte súper claro y práctico, organizamos 5 diapositivas con voz y descarga PowerPoint, un video de apoyo en YouTube y juegos interactivos.`,
      learningGoal: `Dominar "${topic}" en pasos sencillos y superar tu reto interactivo a tu propio ritmo.`,
      superpowerTip: `Usa tu superpoder visual: primero explora las 5 láminas (puedes escucharlas en voz alta), mira el video de YouTube y luego diviértete con los juegos antes de tu examen.`
    },
    ...domainContent,
    youtubeVideo: buildDefaultYoutubeVideo(subject, topic)
  };
}

/**
 * Normaliza e hidrata paquetes guardados previamente para corregir desajustes de dominio
 * (por ejemplo, áreas prácticas que tenían texto genérico de cálculo o video incorrecto).
 */
export function hydrateCoherentPackage(pkg) {
  if (!pkg || typeof pkg !== 'object') return pkg;
  const domain = resolveSubjectDomain(pkg.subject, pkg.topic);
  const firstSlideText = String(pkg.slides?.[0]?.content || '');
  const firstAudioText = String(pkg.audioCapsule?.segments?.[1]?.text || '');

  const hasStaleMathFallback =
    domain !== 'matematicas' &&
    (firstSlideText.includes('Antes de hacer cálculos largos') ||
      firstAudioText.includes('traen muchos datos juntos'));

  const hasMisclassifiedEduFisicaVideo =
    domain === 'edu_fisica' && pkg.youtubeVideo?.videoId === 'aG3j675kZbc';

  if (!hasStaleMathFallback && !hasMisclassifiedEduFisicaVideo) {
    return pkg;
  }

  const coherent = buildDomainMaterials({
    domain,
    firstName: pkg.studentFirstName || 'Estudiante',
    subject: pkg.subject || 'Área General',
    topic: pkg.topic || pkg.subject || 'Tema de refuerzo'
  });

  const nextYoutube = hasMisclassifiedEduFisicaVideo
    ? buildDefaultYoutubeVideo(pkg.subject, pkg.topic)
    : pkg.youtubeVideo || buildDefaultYoutubeVideo(pkg.subject, pkg.topic);

  return {
    ...pkg,
    ...(hasStaleMathFallback
      ? {
          ...coherent,
          games: deriveGamesFromPackage(coherent)
        }
      : {}),
    youtubeVideo: nextYoutube
  };
}


