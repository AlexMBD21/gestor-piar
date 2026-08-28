// Estructuras de datos para el formato PIAR
export const PLantillasPIAR = {
  // Plantilla en blanco
  blanco: {
    id: "blanco-temp",
    estudianteNombre: "Nuevo Estudiante",
    grado: "",
    anexo1: {
      general: { fechaDiligenciamiento: "", lugarDiligenciamiento: "", nombreDiligencia: "", rolDiligencia: "" },
      estudiante: {
        nombres: "", apellidos: "", lugarNacimiento: "", edad: "", fechaNacimiento: "",
        tipoIdentificacion: "TI", tipoIdentificacionOtro: "", numeroIdentificacion: "",
        departamento: "", municipio: "", direccion: "", barrioVereda: "", telefono: "", email: "",
        centroProteccion: "NO", centroProteccionDonde: "", grupoEtnico: "NO", grupoEtnicoCual: "",
        victimaConflicto: "NO", victimaConflictoRegistro: "NO", gradoAspirado: ""
      },
      salud: {
        afiliacionSalud: "NO", eps: "", regimen: "Subsidiado", lugarEmergencia: "",
        atendidoSectorSalud: "NO", frecuenciaAtencion: "", diagnosticoMedico: "NO", diagnosticoCual: "",
        atendidoTerapias: "NO", terapias: [{ cual: "", frecuencia: "" }, { cual: "", frecuencia: "" }, { cual: "", frecuencia: "" }],
        tratamientoMedico: "NO", tratamientoCual: "", consumeMedicamentos: "NO", medicamentosFrecuencia: "",
        productosApoyo: "NO", productosApoyoCuales: ""
      },
      hogar: {
        nombreMadre: "", ocupacionMadre: "", nivelMadre: "Prim/Bto/Téc/Tecn/univ.", nombrePadre: "",
        ocupacionPadre: "", nivelPadre: "Prim/Bto/Téc/Tecn/univ.", nombreCuidador: "", parentescoCuidador: "",
        nivelCuidador: "", telefonoCuidador: "", emailCuidador: "", numHermanos: "", lugarHermanos: "",
        apoyanCrianza: "", personasConQuienVive: "", bajoProteccion: "NO", recibeSubsidio: "NO", subsidioCual: ""
      },
      trayectoria: {
        vinculadoAntes: "NO", vinculadoCuales: "", ultimoGrado: "", aprobo: "SI", observaciones: "",
        recibeInforme: "NO", informeProcedencia: "", programasComplementarios: "NO", programasCuales: ""
      },
      institucion: { nombreIE: "", sede: "", medioTransporte: "", distanciaTiempo: "" },
      firmas: [{ nombre: "", area: "" }, { nombre: "", area: "" }, { nombre: "", area: "" }]
    },
    anexo2: {
      general: { fechaElaboracion: "", institucion: "", sede: "", jornada: "", docentesElaboran: "", grado: "" },
      caracteristicasEstudiante: "",
      ajustesRazonables: [
        { id: "ar-1", area: "Trigonometría", trimestre: "Primer Cuatrimestre", docente: "", objetivos: "", barreras: "", ajustes: "", evaluacion: "" },
        { id: "ar-2", area: "Estadística", trimestre: "Primer Cuatrimestre", docente: "", objetivos: "", barreras: "", ajustes: "", evaluacion: "" },
        { id: "ar-3", area: "Otras: Convivencia", trimestre: "Primer Cuatrimestre", docente: "", objetivos: "", barreras: "", ajustes: "", evaluacion: "" },
        { id: "ar-4", area: "Otras: Socialización", trimestre: "Primer Cuatrimestre", docente: "", objetivos: "", barreras: "", ajustes: "", evaluacion: "" },
        { id: "ar-5", area: "Otras: Participación", trimestre: "Primer Cuatrimestre", docente: "", objetivos: "", barreras: "", ajustes: "", evaluacion: "" },
        { id: "ar-6", area: "Otras: Autonomía", trimestre: "Primer Cuatrimestre", docente: "", objetivos: "", barreras: "", ajustes: "", evaluacion: "" },
        { id: "ar-7", area: "Otras: Autocontrol", trimestre: "Primer Cuatrimestre", docente: "", objetivos: "", barreras: "", ajustes: "", evaluacion: "" }
      ],
      pmiRecomendaciones: [
        { actor: "FAMILIA, CUIDADORES O CON QUIENES VIVE", acciones: "", estrategias: "" },
        { actor: "DOCENTES", acciones: "", estrategias: "" },
        { actor: "DIRECTIVOS", acciones: "", estrategias: "" },
        { actor: "ADMINISTRATIVOS", acciones: "", estrategias: "" },
        { actor: "PARES (Sus compañeros)", acciones: "", estrategias: "" }
      ],
      firmas: [{ nombre: "", area: "" }, { nombre: "", area: "" }, { nombre: "", area: "" }]
    },
    anexo3: {
      general: {
        fecha: "", institucionSede: "", docentesEquipo: "",
        familiaEstudiante: [{ nombre: "", parentesco: "" }, { nombre: "", parentesco: "" }]
      },
      compromisosAula: "",
      actividadesHogar: [{ id: "ah-1", actividad: "", descripcion: "", frecuencia: "D" }],
      firmas: { estudiante: "", acudiente: "", docentes: "", directivo: "" }
    }
  }
};

export function createBlankPiar(name, lastname, grade) {
  const newStudent = JSON.parse(JSON.stringify(PLantillasPIAR.blanco));
  newStudent.id = "student-" + Date.now();
  newStudent.estudianteNombre = `${name} ${lastname}`;
  newStudent.grado = grade;
  newStudent.anexo1.estudiante.nombres = name;
  newStudent.anexo1.estudiante.apellidos = lastname;
  newStudent.anexo1.estudiante.gradoAspirado = grade;
  newStudent.anexo2.general.grado = grade;
  newStudent.anexo2.general.fechaElaboracion = new Date().toISOString().split('T')[0];
  newStudent.anexo1.general.fechaDiligenciamiento = new Date().toISOString().split('T')[0];
  return newStudent;
}

export function createDemoPiar() {
  const demo = JSON.parse(JSON.stringify(PLantillasPIAR.blanco));
  const today = new Date().toISOString().split('T')[0];
  demo.id = 'demo-' + Date.now();
  demo.estudianteNombre = 'Santiago Gómez Herrera';
  demo.grado = '9°1';

  // Anexo 1 - General
  demo.anexo1.general = {
    fechaDiligenciamiento: today,
    lugarDiligenciamiento: 'Montería, Córdoba',
    nombreDiligencia: 'María Alejandra Torres Ruiz',
    rolDiligencia: 'Docente de Apoyo Pedagógico'
  };

  // Anexo 1 - Estudiante
  demo.anexo1.estudiante = {
    nombres: 'Santiago',
    apellidos: 'Gómez Herrera',
    lugarNacimiento: 'Montería',
    edad: '15',
    fechaNacimiento: '2009-03-14',
    tipoIdentificacion: 'TI',
    tipoIdentificacionOtro: '',
    numeroIdentificacion: '1065987234',
    departamento: 'Córdoba',
    municipio: 'Montería',
    direccion: 'Cra 15 # 23-45, Barrio Los Araujos',
    barrioVereda: 'Los Araujos',
    telefono: '3214567890',
    email: 'familia.gomez@gmail.com',
    centroProteccion: 'NO',
    centroProteccionDonde: '',
    grupoEtnico: 'NO',
    grupoEtnicoCual: '',
    victimaConflicto: 'NO',
    victimaConflictoRegistro: 'NO',
    gradoAspirado: '9°1'
  };

  // Anexo 1 - Salud
  demo.anexo1.salud = {
    afiliacionSalud: 'SI',
    eps: 'Comfacor',
    regimen: 'Subsidiado',
    lugarEmergencia: 'Clínica Montería',
    atendidoSectorSalud: 'SI',
    frecuenciaAtencion: 'Mensual',
    diagnosticoMedico: 'SI',
    diagnosticoCual: 'Trastorno por Déficit de Atención con Hiperactividad (TDAH) - CIE-10: F90.0',
    atendidoTerapias: 'SI',
    terapias: [
      { cual: 'Terapia Psicológica', frecuencia: 'Quincenal' },
      { cual: 'Terapia Ocupacional', frecuencia: 'Semanal' },
      { cual: 'Fonoaudiología', frecuencia: 'Mensual' }
    ],
    tratamientoMedico: 'SI',
    tratamientoCual: 'Metilfenidato 10mg bajo supervisión médica',
    consumeMedicamentos: 'SI',
    medicamentosFrecuencia: 'Diario en horas de la mañana',
    productosApoyo: 'SI',
    productosApoyoCuales: 'Agenda de organización y cronómetro visual'
  };

  // Anexo 1 - Hogar
  demo.anexo1.hogar = {
    nombreMadre: 'Lucía Herrera de Gómez',
    ocupacionMadre: 'Ama de casa',
    nivelMadre: 'Bachillerato',
    nombrePadre: 'Carlos Andrés Gómez Peña',
    ocupacionPadre: 'Conductor de transporte público',
    nivelPadre: 'Bachillerato',
    nombreCuidador: 'Lucía Herrera de Gómez',
    parentescoCuidador: 'Madre',
    nivelCuidador: 'Bachillerato',
    telefonoCuidador: '3214567890',
    emailCuidador: 'familia.gomez@gmail.com',
    numHermanos: '2',
    lugarHermanos: '1° y 4° grado, misma institución',
    apoyanCrianza: 'Abuela materna, Rosa Herrera',
    personasConQuienVive: 'Padre, Madre, 2 hermanos y abuela materna',
    bajoProteccion: 'NO',
    recibeSubsidio: 'SI',
    subsidioCual: 'Más Familias en Acción'
  };

  // Anexo 1 - Trayectoria
  demo.anexo1.trayectoria = {
    vinculadoAntes: 'SI',
    vinculadoCuales: 'Programa de Aula de Apoyo - IE Camilo Torres (2022)',
    ultimoGrado: '8° - Aprobado',
    aprobo: 'SI',
    observaciones: 'Estudiante con habilidades artísticas sobresalientes. Presenta dificultades en atención sostenida y organización del tiempo. Requiere adaptaciones en evaluaciones.',
    recibeInforme: 'SI',
    informeProcedencia: 'Centro de Salud Mental de Córdoba - Dr. Julián Martínez',
    programasComplementarios: 'SI',
    programasCuales: 'Jornada Única - Componente de Arte y Cultura'
  };

  // Anexo 1 - Institución
  demo.anexo1.institucion = {
    nombreIE: 'I.E. Camilo Torres Restrepo',
    sede: 'Sede Principal',
    medioTransporte: 'A pie y transporte público',
    distanciaTiempo: '25 minutos'
  };

  // Anexo 1 - Firmas
  demo.anexo1.firmas = [
    { nombre: 'María Alejandra Torres Ruiz', area: 'Docente de Apoyo Pedagógico' },
    { nombre: 'Lucía Herrera de Gómez', area: 'Acudiente / Madre' },
    { nombre: 'Roberto Ávila Díaz', area: 'Rector' }
  ];

  // Anexo 2 - General
  demo.anexo2.general = {
    fechaElaboracion: today,
    institucion: 'I.E. Camilo Torres Restrepo',
    sede: 'Sede Principal',
    jornada: 'Mañana',
    docentesElaboran: 'María Alejandra Torres, Pedro Suárez (Matemáticas), Ana Roa (Español)',
    grado: '9°1'
  };

  demo.anexo2.caracteristicasEstudiante =
    'Santiago es un estudiante de 15 años con diagnóstico de TDAH (Tipo Combinado). Presenta habilidades superiores en artes plásticas y música. Sus principales barreras son: dificultad para mantener la atención en tareas largas, impulsividad en situaciones de grupo, y dificultad para organizar el tiempo y los materiales. Se destaca por su creatividad, empatía con sus compañeros y alta motivación cuando las actividades son de su interés. Aprende mejor con instrucciones visuales, tareas fragmentadas y retroalimentación inmediata y positiva.';

  // Anexo 2 - Ajustes Razonables
  demo.anexo2.ajustesRazonables = [
    {
      id: 'ar-1',
      area: 'Matemáticas',
      trimestre: 'Primer Trimestre',
      docente: 'Pedro Suárez Mendoza',
      objetivos: 'Resolver problemas algebraicos y geométricos básicos aplicados a situaciones cotidianas.',
      barreras: 'Dificultad para mantener la atención en procedimientos largos. Se distrae con facilidad en el salón.',
      ajustes: 'Fragmentar los ejercicios en pasos cortos. Usar fichas de colores para representar variables. Permitir el uso de calculadora para cálculos mecánicos. Evaluaciones orales como alternativa. Ubicación en primera fila.',
      evaluacion: 'Portafolio de evidencias, evaluación oral y prueba escrita fragmentada con tiempo extendido (50% adicional).'
    },
    {
      id: 'ar-2',
      area: 'Español y Literatura',
      trimestre: 'Primer Trimestre',
      docente: 'Ana María Roa Castro',
      objetivos: 'Producir textos escritos coherentes y comprender textos narrativos y argumentativos.',
      barreras: 'Dificultad para organizar ideas al escribir. Letra ilegible en períodos prolongados de escritura.',
      ajustes: 'Permitir el uso de organizadores gráficos y mapas mentales antes de escribir. Aceptar entregas digitales. Lectura de enunciados por parte del docente. Banco de palabras de apoyo.',
      evaluacion: 'Producción de texto corto con apoyo de organizador gráfico. Lectura en voz alta. Evaluación continua de proceso.'
    },
    {
      id: 'ar-3',
      area: 'Ciencias Naturales',
      trimestre: 'Primer Trimestre',
      docente: 'Claudia Muñoz Pérez',
      objetivos: 'Identificar los sistemas del cuerpo humano y su funcionamiento.',
      barreras: 'Impulsividad en prácticas de laboratorio. Dificultad para seguir instrucciones secuenciales.',
      ajustes: 'Instrucciones visuales paso a paso impresas. Asignación de rol específico en trabajos grupales. Supervisión cercana en prácticas.',
      evaluacion: 'Maqueta del sistema elegido, exposición oral de 5 minutos y cuestionario de selección múltiple.'
    },
    {
      id: 'ar-4',
      area: 'Educación Física',
      trimestre: 'Primer Trimestre',
      docente: 'Jorge Herrera Solano',
      objetivos: 'Mejorar la coordinación motora y el trabajo en equipo.',
      barreras: 'Dificultad para seguir reglas de juego complejas. Conflictos ocasionales con compañeros por impulsividad.',
      ajustes: 'Explicar las reglas de forma gráfica y simplificada. Asignar rol de líder de equipo para canalizar energía. Pausas activas breves.',
      evaluacion: 'Participación activa, actitud colaborativa y desempeño motor observado.'
    },
    {
      id: 'ar-5',
      area: 'Artes Plásticas',
      trimestre: 'Primer Trimestre',
      docente: 'Valentina Ríos',
      objetivos: 'Desarrollar proyectos artísticos creativos con identidad propia.',
      barreras: 'Ninguna barrera significativa. Área de alta motivación y desempeño.',
      ajustes: 'Promover como área de fortalecimiento de autoestima. Permitir proyectos de libre elección temática.',
      evaluacion: 'Portafolio artístico, exposición al grupo y autoevaluación.'
    },
    {
      id: 'ar-6',
      area: 'Otras: Convivencia',
      trimestre: 'Primer Trimestre',
      docente: 'Orientadora Escolar - Patricia Vidal',
      objetivos: 'Fortalecer habilidades de autorregulación emocional y resolución pacífica de conflictos.',
      barreras: 'Respuestas impulsivas ante la frustración. Interrupciones frecuentes en clase.',
      ajustes: 'Acuerdo de señales discretas docente-estudiante para manejo de impulsos. Espacio de pausa regulada. Tutoría semanal con orientadora.',
      evaluacion: 'Seguimiento de compromisos en bitácora personal y reporte bimestral de la orientadora.'
    },
    {
      id: 'ar-7',
      area: 'Otras: Autonomía',
      trimestre: 'Primer Trimestre',
      docente: 'Equipo Interdisciplinario',
      objetivos: 'Desarrollar habilidades de organización personal, gestión del tiempo y automonitoreo académico.',
      barreras: 'Olvido frecuente de tareas y materiales. Dificultad para estimar el tiempo necesario para las actividades.',
      ajustes: 'Uso de agenda diaria revisada por el acudiente. Checklist visual de materiales. Recordatorio de tareas vía grupo de WhatsApp familiar.',
      evaluacion: 'Revisión semanal de agenda. Reporte mensual de entregas a tiempo.'
    }
  ];

  // Anexo 2 - PMI
  demo.anexo2.pmiRecomendaciones = [
    {
      actor: 'FAMILIA, CUIDADORES O CON QUIENES VIVE',
      acciones: 'Establecer rutinas fijas en casa para tareas, sueño y alimentación. Revisar la agenda escolar diariamente.',
      estrategias: 'Reuniones bimestrales con la orientadora. Acceso a guías de crianza con pautas para TDAH. Grupo de apoyo de familias.'
    },
    {
      actor: 'DOCENTES',
      acciones: 'Implementar los ajustes razonables acordados. Comunicar avances y dificultades al equipo de apoyo mensualmente.',
      estrategias: 'Reunión de equipo pedagógico cada mes. Formación en estrategias inclusivas para TDAH. Uso de rúbricas flexibles.'
    },
    {
      actor: 'DIRECTIVOS',
      acciones: 'Garantizar los tiempos de la docente de apoyo para seguimiento. Adecuar los espacios para evaluaciones con tiempo extendido.',
      estrategias: 'Asignación de aula tranquila para evaluaciones. Incluir en el manual de convivencia protocolos de inclusión.'
    },
    {
      actor: 'ADMINISTRATIVOS',
      acciones: 'Registrar las adaptaciones en el sistema de información. Facilitar los procesos de matrícula y reportes.',
      estrategias: 'Carpeta de seguimiento del estudiante. Reporte semestral al sector salud.'
    },
    {
      actor: 'PARES (Sus compañeros)',
      acciones: 'Fomentar la cultura de inclusión y el respeto a la diversidad en el aula.',
      estrategias: 'Proyecto de aula sobre diversidad. Actividades de aprendizaje cooperativo donde Santiago asuma roles de liderazgo artístico.'
    }
  ];

  demo.anexo2.firmas = [
    { nombre: 'María Alejandra Torres Ruiz', area: 'Docente de Apoyo' },
    { nombre: 'Ana María Roa Castro', area: 'Docente de Español' },
    { nombre: 'Pedro Suárez Mendoza', area: 'Docente de Matemáticas' }
  ];

  // Anexo 3
  demo.anexo3.general = {
    fecha: today,
    institucionSede: 'I.E. Camilo Torres Restrepo - Sede Principal',
    docentesEquipo: 'María Alejandra Torres, Pedro Suárez, Ana Roa, Claudia Muñoz, Patricia Vidal',
    familiaEstudiante: [
      { nombre: 'Lucía Herrera de Gómez', parentesco: 'Madre' },
      { nombre: 'Carlos Andrés Gómez Peña', parentesco: 'Padre' }
    ]
  };

  demo.anexo3.compromisosAula =
    'El equipo docente se compromete a: (1) Implementar los ajustes razonables acordados en cada área. (2) Comunicar al acudiente cualquier situación relevante en un plazo máximo de 48 horas. (3) Garantizar un ambiente de respeto e inclusión. (4) Revisar los avances de Santiago de forma bimestral en reunión de equipo. (5) Proporcionar retroalimentación positiva y constante para fortalecer su autoestima académica.';

  demo.anexo3.actividadesHogar = [
    { id: 'ah-1', actividad: 'Revisión de agenda escolar', descripcion: 'El acudiente revisa con Santiago la agenda, tareas pendientes y materiales para el día siguiente.', frecuencia: 'D' },
    { id: 'ah-2', actividad: 'Lectura en voz alta', descripcion: 'Lectura de un texto de su elección durante 15 minutos para fortalecer comprensión lectora y concentración.', frecuencia: 'D' },
    { id: 'ah-3', actividad: 'Ejercicio físico', descripcion: 'Actividad física (fútbol, bicicleta) durante al menos 30 minutos para liberar energía y mejorar la concentración.', frecuencia: 'D' },
    { id: 'ah-4', actividad: 'Actividad artística libre', descripcion: 'Tiempo para dibujo, pintura o música como medio de expresión y autorregulación emocional.', frecuencia: 'S' },
    { id: 'ah-5', actividad: 'Reunión familiar de seguimiento', descripcion: 'Conversación con los padres sobre sus logros de la semana, dificultades y cómo se siente en el colegio.', frecuencia: 'S' }
  ];

  demo.anexo3.firmas = {
    estudiante: 'Santiago Gómez Herrera',
    acudiente: 'Lucía Herrera de Gómez',
    docentes: 'María Alejandra Torres Ruiz / Pedro Suárez Mendoza',
    directivo: 'Roberto Ávila Díaz'
  };

  return demo;
}

export function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
