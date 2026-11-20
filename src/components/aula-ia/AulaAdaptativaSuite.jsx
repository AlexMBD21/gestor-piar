import { useState, useEffect, useRef, useMemo } from 'react';
import { usePiar } from '../../context/PiarContext';
import { useAulaIa } from '../../context/AulaIaContext';
import { supabase } from '../../lib/supabaseClient';
import { extractStudentPedagogicalProfile } from '../../lib/piarAiEngine';
import StudentAdaptivePortal from './StudentAdaptivePortal';
import TeacherTelemetryAnalytics from './TeacherTelemetryAnalytics';
import StudentAccessModal from './StudentAccessModal';
import { getStudentCredential } from '../../lib/studentAccessService';

export default function AulaAdaptativaSuite({
  activeSubTab = 'ia-studio',
  setActiveSubTab,
  showToast,
  onSwitchToPiarSuite
}) {
  const { piars, activeStudentId, setActiveStudentId, getActiveStudent } = usePiar();
  const {
    packagesByStudent,
    activityByPackage,
    hydrateFromPiarRecord,
    refreshActivityFromCloud,
    createAdaptivePackage,
    togglePackagePublishStatus,
    deleteAdaptivePackage
  } = useAulaIa();

  const validPiars = piars.filter((p) => p.data?.id !== 'blanco-temp');
  const activeStudent = getActiveStudent() || validPiars[0] || null;

  // Seleccionar automáticamente el primer estudiante si no hay uno activo
  useEffect(() => {
    if (!activeStudentId && validPiars.length > 0) {
      setActiveStudentId(validPiars[0].id);
    }
  }, [activeStudentId, validPiars, setActiveStudentId]);

  const studentPackages = activeStudent?.id ? packagesByStudent[activeStudent.id] || [] : [];
  const [selectedPkgId, setSelectedPkgId] = useState(null);

  // Controla qué tarjeta de materia generada está desplegada (acordeón contraíble para no alargar la pantalla)
  const [expandedPkgId, setExpandedPkgId] = useState(null);
  const [pendingDeletePkg, setPendingDeletePkg] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [studentAccessMeta, setStudentAccessMeta] = useState(null);
  const [lastTelemetrySyncAt, setLastTelemetrySyncAt] = useState(null);
  const [isSyncingTelemetry, setIsSyncingTelemetry] = useState(false);

  const currentPkg =
    studentPackages.find((p) => p.id === selectedPkgId) || studentPackages[0] || null;
  const currentActivity = currentPkg?.id ? activityByPackage[currentPkg.id] : null;

  const profile = useMemo(
    () => (activeStudent ? extractStudentPedagogicalProfile(activeStudent) : null),
    [activeStudent]
  );

  // Áreas y carencias detectadas automáticamente por la IA al leer el Anexo 2 del PIAR
  const detectedAreas = useMemo(() => {
    if (profile?.ajustesPorArea?.length > 0) {
      const seenCounts = {};
      return profile.ajustesPorArea.map((a) => {
        const baseLabel =
          a.asignatura && a.asignatura !== a.area ? `${a.area} (${a.asignatura})` : a.area;
        seenCounts[baseLabel] = (seenCounts[baseLabel] || 0) + 1;
        const displayArea =
          seenCounts[baseLabel] > 1 ? `${baseLabel} #${seenCounts[baseLabel]}` : baseLabel;
        return {
          ...a,
          displayArea
        };
      });
    }
    return [
      {
        area: 'Matemáticas',
        displayArea: 'Matemáticas',
        asignatura: 'Pensamiento Numérico y Espacial',
        objetivos: 'Resolver problemas cotidianos paso a paso con apoyo visual.',
        barreras: 'Sobrecarga en memoria de trabajo ante instrucciones extensas sin apoyo gráfico.',
        ajustes: 'Fragmentación en micro-pasos visuales, audio-guía y retroalimentación formativa.',
        evaluacion: 'Evaluación por micro-retos con hasta 3 intentos y pistas de andamiaje.',
        carenciaDetectadaPorIa: 'Atención Sostenida y Secuenciación Ejecutiva (Detectada del PIAR)',
        temaExtraidoPorIa: 'Resolución de Problemas Paso a Paso con Apoyo Visual'
      }
    ];
  }, [profile]);

  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const resultsSectionRef = useRef(null);

  useEffect(() => {
    setSelectedAreaIndex(0);
    setExpandedPkgId(null);
    setPendingDeletePkg(null);
    setShowAccessModal(false);
    let mounted = true;
    if (activeStudent) {
      hydrateFromPiarRecord(activeStudent);
      getStudentCredential(activeStudent.id).then((cred) => {
        if (mounted) setStudentAccessMeta(cred);
      });
    } else {
      setStudentAccessMeta(null);
    }
    return () => {
      mounted = false;
    };
  }, [activeStudent, hydrateFromPiarRecord]);

  // Sincronización en tiempo real de Telemetría e Intentos cuando el docente observa "Intentos y Telemetría"
  useEffect(() => {
    if (activeSubTab !== 'ia-analytics' || !activeStudent?.id) return undefined;
    let active = true;

    const runSync = async () => {
      const ok = await refreshActivityFromCloud(activeStudent.id);
      if (active && ok) setLastTelemetrySyncAt(new Date().toISOString());
    };

    runSync();

    // Sondeo ligero cada 8s + suscripción Realtime de Supabase para ver intentos sin recargar
    const intervalId = setInterval(runSync, 8000);
    const channel = supabase
      .channel(`piar-telemetry-${activeStudent.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'piars',
          filter: `id=eq.${activeStudent.id}`
        },
        () => {
          runSync();
        }
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [activeSubTab, activeStudent?.id, refreshActivityFromCloud]);

  const handleManualTelemetrySync = async () => {
    if (!activeStudent?.id || isSyncingTelemetry) return;
    setIsSyncingTelemetry(true);
    const ok = await refreshActivityFromCloud(activeStudent.id);
    if (ok) setLastTelemetrySyncAt(new Date().toISOString());
    setIsSyncingTelemetry(false);
  };

  useEffect(() => {
    if (!pendingDeletePkg) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPendingDeletePkg(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDeletePkg]);

  const handleConfirmDeletePackage = () => {
    if (!pendingDeletePkg || !activeStudent?.id) return;
    const deleted = pendingDeletePkg;
    deleteAdaptivePackage(activeStudent.id, deleted.id, activeStudent);
    if (selectedPkgId === deleted.id) setSelectedPkgId(null);
    if (expandedPkgId === deleted.id) setExpandedPkgId(null);
    setPendingDeletePkg(null);
    if (showToast) {
      showToast(`Material de ${deleted.subject} eliminado correctamente.`);
    }
  };

  if (!activeStudent || !profile) {
    return (
      <div className="aia-bento-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '42px', color: 'var(--primary)' }}>
          person_search
        </span>
        <h3 style={{ marginTop: '12px' }}>Primero crea o selecciona un estudiante en el Gestor PIAR</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '520px', margin: '8px auto 20px' }}>
          Recuerda que el documento PIAR se crea primero en el Apartado 1 y es la fuente que alimenta automáticamente de información psicopedagógica a nuestro Agente IA.
        </p>
        {onSwitchToPiarSuite && (
          <button type="button" className="aia-btn-primary" onClick={onSwitchToPiarSuite}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              assignment
            </span>
            <span>Ir al Apartado 1 (Gestor PIAR)</span>
          </button>
        )}
      </div>
    );
  }

  const activeArea = detectedAreas[selectedAreaIndex] || detectedAreas[0];

  // Ejecución 100% automática: el Agente IA toma los datos del PIAR, evalúa las carencias de esa área y genera el diagnóstico + materiales en borrador
  const handleAutoGenerateFromPiar = async (areaToProcess = activeArea) => {
    if (!areaToProcess) return;
    setIsGenerating(true);
    setGenerationStep(`Leyendo el PIAR para ${areaToProcess.displayArea || areaToProcess.area}...`);
    try {
      const areaTitle = areaToProcess.displayArea || areaToProcess.area;
      const created = await createAdaptivePackage({
        piar: activeStudent,
        subject: areaTitle,
        topic: areaToProcess.temaExtraidoPorIa || areaToProcess.objetivos,
        carenciaObservada: areaToProcess.carenciaDetectadaPorIa,
        teacherNotes: `Barrera detectada automáticamente en el PIAR: "${areaToProcess.barreras}". Ajuste Razonable del PIAR: "${areaToProcess.ajustes}". Evaluación PIAR: "${areaToProcess.evaluacion}".`,
        maxAttempts: 3,
        publishImmediately: false, // Queda en supervisión para que el docente lo revise primero
        onProgress: (msg) => setGenerationStep(msg)
      });
      setSelectedPkgId(created.id);
      setExpandedPkgId(created.id); // Abre la nueva área generada y contrae automáticamente las anteriores
      if (showToast) {
        if (created.engineMode === 'gemini') {
          showToast(
            `Gemini IA generó diapositivas, juegos y examen de ${areaTitle} alineados al PIAR de ${profile.primerNombre}.`
          );
        } else {
          showToast(
            `Gemini no respondió a tiempo; se creó un paquete de respaldo local para ${areaTitle}. Puedes volver a generar cuando desees.`
          );
        }
      }
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Verificar si un área del PIAR ya tiene paquete generado para mostrar un indicador en su chip
  const hasPackageForArea = (areaLabel) =>
    studentPackages.some((p) => p.subject === areaLabel);

  const visiblePackages = studentPackages;

  return (
    <div className="aia-suite-container">
      {/* BARRA SUPERIOR DEL APARTADO 2: Selector de Estudiante y Credencial de Acceso */}
      <div className="aia-top-control-bar">
        <div className="aia-student-context-selector">
          <div className="aia-context-avatar">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <div className="aia-context-fields">
            <label htmlFor="aia-student-select" className="aia-context-eyebrow">
              EXPEDIENTE PIAR QUE ALIMENTA AUTOMÁTICAMENTE AL AGENTE IA (SOLO LECTURA)
            </label>
            <div className="aia-context-row">
              <select
                id="aia-student-select"
                className="aia-student-select-input"
                value={activeStudent.id}
                onChange={(e) => setActiveStudentId(e.target.value)}
              >
                {validPiars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — Grado {p.grado || 'S/A'} (Doc: {p.data?.anexo1?.estudiante?.numeroIdentificacion || '1000000000'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                className={`aia-credential-chip ${studentAccessMeta?.isActive ? 'is-active' : ''}`}
                onClick={() => setShowAccessModal(true)}
                title="Asignar o gestionar el documento y PIN de acceso del estudiante"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  key
                </span>
                <span className="aia-tabular">
                  {studentAccessMeta?.isActive
                    ? `Acceso Activo · Doc: ${studentAccessMeta.studentDoc}`
                    : studentAccessMeta
                      ? `Acceso Pausado · Doc: ${studentAccessMeta.studentDoc}`
                      : `Asignar Acceso Alumno (${profile.numeroIdentificacion})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-VISTA 1: ESTUDIO DOCENTE — 100% AUTOMATIZADO Y CONTRAÍBLE POR ÁREA */}
      {activeSubTab === 'ia-studio' && (
        <div className="aia-studio-vertical-flow">
          {/* BLOQUE 1 (ARRIBA): Lectura Automática del PIAR y Carencias Detectadas por Área */}
          <div className="aia-bento-card">
            <div className="aia-bento-header">
              <div>
                <span className="aia-eyebrow">
                  PASO 1 · LECTURA Y DETECCIÓN AUTOMÁTICA DE CARENCIAS DESDE EL PIAR (ANEXOS 1, 2 Y 3)
                </span>
                <h3 className="aia-bento-title">
                  Análisis Automático del Expediente PIAR de {profile.nombreCompleto}
                </h3>
              </div>

              <span className="aia-status-badge readonly aia-tabular">
                🔒 Lectura Automática PIAR ({profile.contextCompleteness}% Contexto)
              </span>
            </div>

            {/* Mapeo Integral 360° de los Anexos 1, 2 y 3 del PIAR */}
            <div className="aia-piar-dna-grid" style={{ marginBottom: '14px' }}>
              <div className="aia-dna-item">
                <span className="aia-dna-label">Anexo 1 · Perfil, Grado y Entorno Familiar</span>
                <strong className="aia-dna-value">
                  {profile.edad} años · Grado {profile.grado} ({profile.institucionEducativa})
                </strong>
                <p className="aia-dna-text" style={{ marginTop: '4px' }}>
                  <strong>Núcleo familiar:</strong> {profile.apoyoFamiliar}
                </p>
              </div>
              <div className="aia-dna-item">
                <span className="aia-dna-label">Anexo 1 · Salud, Terapias y Productos de Apoyo</span>
                <strong className="aia-dna-value">{profile.diagnosticoSalud}</strong>
                <p className="aia-dna-text" style={{ marginTop: '4px' }}>
                  <strong>Apoyos / Terapias:</strong>{' '}
                  {profile.terapiasActivas?.length > 0
                    ? `${profile.terapiasActivas.join(', ')} · ${profile.productosApoyo}`
                    : profile.productosApoyo}
                </p>
              </div>
              <div className="aia-dna-item full">
                <span className="aia-dna-label">
                  Anexo 1 y 2 · Trayectoria Educativa y Características Psicopedagógicas Mapeadas
                </span>
                <p className="aia-dna-text">{profile.caracteristicas}</p>
                {profile.observacionesTrayectoria && (
                  <p className="aia-dna-text" style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                    <strong>Trayectoria (Anexo 1):</strong> {profile.observacionesTrayectoria}
                  </p>
                )}
              </div>
              <div className="aia-dna-item full">
                <span className="aia-dna-label">
                  Anexo 2 (PMI) y Anexo 3 · Directrices de Aula y Acuerdos con Hogar Mapeados
                </span>
                <p className="aia-dna-text">{profile.compromisosAula}</p>
              </div>
            </div>

            {/* Carencias y Barreras por Área extraídas automáticamente por la IA desde el Anexo 2 */}
            <div className="aia-dna-item full" style={{ marginBottom: '16px' }}>
              <span className="aia-dna-label">
                Selecciona un Área / Materia del PIAR para que la IA genere sus Materiales ({detectedAreas.length} áreas en su PIAR)
              </span>
              <div className="aia-package-pills" style={{ marginTop: '8px', marginBottom: '12px' }}>
                {detectedAreas.map((ar, idx) => {
                  const alreadyGenerated = hasPackageForArea(ar.displayArea);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAreaIndex(idx)}
                      className={`aia-pkg-pill ${selectedAreaIndex === idx ? 'active' : ''}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {alreadyGenerated ? 'check_circle' : 'auto_awesome'}
                      </span>
                      <span>{ar.displayArea}</span>
                    </button>
                  );
                })}
              </div>

              {/* Ficha de lo que la IA detectó automáticamente en el área seleccionada del PIAR */}
              {activeArea && (
                <div className="aia-piar-dna-grid">
                  <div className="aia-dna-item">
                    <span className="aia-dna-label">
                      Carencia / Dificultad Detectada por la IA en {activeArea.displayArea}
                    </span>
                    <strong className="aia-dna-value" style={{ color: 'var(--primary)' }}>
                      {activeArea.carenciaDetectadaPorIa}
                    </strong>
                    <p className="aia-dna-text" style={{ marginTop: '4px' }}>
                      <strong>Barrera en PIAR:</strong> {activeArea.barreras}
                    </p>
                  </div>

                  <div className="aia-dna-item">
                    <span className="aia-dna-label">
                      Meta de Aprendizaje y Ajuste Razonable Extraídos del PIAR
                    </span>
                    <strong className="aia-dna-value">{activeArea.objetivos}</strong>
                    <p className="aia-dna-text" style={{ marginTop: '4px' }}>
                      <strong>Ajuste a aplicar por la IA:</strong> {activeArea.ajustes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botón Único de Generación Automática con Gemini IA */}
            <button
              type="button"
              className="aia-btn-primary aia-btn-full"
              disabled={isGenerating}
              onClick={() => handleAutoGenerateFromPiar(activeArea)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                {isGenerating ? 'hourglass_top' : 'auto_awesome'}
              </span>
              <span>
                {isGenerating
                  ? generationStep || `Generando material de ${activeArea.displayArea}...`
                  : `Generar Material IA · ${activeArea.displayArea}`}
              </span>
            </button>
          </div>

          {/* BLOQUE 2 (DEBAJO DEL BOTÓN): Lista Acordeón de Paquetes por Materia / Área (Contraíbles para no extender la pantalla) */}
          {visiblePackages.length > 0 && (
            <div ref={resultsSectionRef} className="aia-generated-results-section">
              <div className="aia-accordion-section-header">
                <div>
                  <span className="aia-eyebrow">
                    PASO 2 · MATERIALES POR ÁREA GENERADOS PARA {profile.primerNombre.toUpperCase()} ({visiblePackages.length}{' '}
                    {visiblePackages.length === 1 ? 'ÁREA' : 'ÁREAS'})
                  </span>
                  <h4 className="aia-accordion-section-title">
                    Haz clic en cada asignatura para desplegar o contraer su diagnóstico sin extender la pantalla
                  </h4>
                </div>
              </div>

              <div className="aia-packages-accordion-stack">
                {visiblePackages.map((pkg) => {
                  const isExpanded = expandedPkgId === pkg.id;
                  const pkgDiag = pkg.teacherDiagnosis || {};
                  const pkgActivity = activityByPackage[pkg.id] || null;
                  const pkgAttemptsCount = pkgActivity?.attempts?.length || 0;
                  const pkgLatestScore =
                    pkgAttemptsCount > 0
                      ? pkgActivity.attempts[pkgAttemptsCount - 1].percentage
                      : null;

                  return (
                    <div
                      key={pkg.id}
                      className={`aia-bento-card aia-collapsible-pkg-card ${
                        isExpanded ? 'expanded' : 'collapsed'
                      }`}
                    >
                      {/* Cabecera siempre visible de cada Área / Materia (Permite contraer, supervisar o publicar en 1 clic) */}
                      <div className="aia-collapsible-pkg-header">
                        <button
                          type="button"
                          className="aia-collapsible-pkg-trigger"
                          onClick={() => {
                            setSelectedPkgId(pkg.id);
                            setExpandedPkgId((prev) => (prev === pkg.id ? null : pkg.id));
                          }}
                          title={
                            isExpanded
                              ? `Contraer diagnóstico y materiales de ${pkg.subject}`
                              : `Desplegar diagnóstico y materiales de ${pkg.subject}`
                          }
                        >
                          <span className="aia-collapsible-pkg-icon">
                            <span className="material-symbols-outlined">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </span>

                          <div className="aia-collapsible-pkg-title-wrap">
                            <strong className="aia-collapsible-pkg-subject">{pkg.subject}</strong>
                            <span className="aia-collapsible-pkg-summary-pills">
                              {pkg.slides?.length || 5} Diapositivas (.pptx) · Video YouTube · {pkg.games?.length || 4} Juegos · Examen
                              {pkg.engineMode === 'local'
                                ? ' · Respaldo local'
                                : pkg.engineMode === 'gemini' || String(pkg.engineSource || '').startsWith('Gemini')
                                  ? ' · Gemini IA'
                                  : ''}
                            </span>
                            <span className="aia-collapsible-pkg-topic">{pkg.topic}</span>
                          </div>
                        </button>

                        <div className="aia-collapsible-pkg-actions">
                          <span
                            className={`aia-status-icon-badge ${
                              pkg.status === 'published' ? 'published' : 'draft'
                            }`}
                            data-tooltip={
                              pkg.status === 'published'
                                ? 'Publicado y activo en el Portal del Estudiante'
                                : 'En Supervisión Docente (Oculto al estudiante)'
                            }
                            title={
                              pkg.status === 'published'
                                ? 'Publicado y activo en el Portal del Estudiante'
                                : 'En Supervisión Docente (Oculto al estudiante)'
                            }
                          >
                            {pkg.status === 'published' ? (
                              <svg
                                className="aia-published-live-svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  fill="rgba(22, 163, 74, 0.14)"
                                />
                                <path
                                  d="M8.5 12.3L10.9 14.7L15.8 9.6"
                                  stroke="currentColor"
                                  strokeWidth="2.3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="aia-hourglass-svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="none"
                                aria-hidden="true"
                              >
                                <defs>
                                  <clipPath id={`hg-top-${pkg.id}`}>
                                    <path d="M6.5 4.5 H17.5 C17.5 8.5 13.5 10.5 12 12 C10.5 10.5 6.5 8.5 6.5 4.5 Z" />
                                  </clipPath>
                                  <clipPath id={`hg-bot-${pkg.id}`}>
                                    <path d="M12 12 C13.5 13.5 17.5 15.5 17.5 19.5 H6.5 C6.5 15.5 10.5 13.5 12 12 Z" />
                                  </clipPath>
                                </defs>
                                <g className="aia-hg-flip-group">
                                  {/* Arena superior que va bajando */}
                                  <g clipPath={`url(#hg-top-${pkg.id})`}>
                                    <rect
                                      className="aia-hg-sand-top"
                                      x="6"
                                      y="5.2"
                                      width="12"
                                      height="7"
                                      fill="#f59e0b"
                                    />
                                  </g>

                                  {/* Hilo de arena cayendo por el centro */}
                                  <line
                                    className="aia-hg-sand-stream"
                                    x1="12"
                                    y1="11.5"
                                    x2="12"
                                    y2="19.2"
                                    stroke="#f59e0b"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />

                                  {/* Arena inferior que se va acumulando en la base */}
                                  <g clipPath={`url(#hg-bot-${pkg.id})`}>
                                    <rect
                                      className="aia-hg-sand-bottom"
                                      x="6"
                                      y="12.5"
                                      width="12"
                                      height="7"
                                      fill="#f59e0b"
                                    />
                                  </g>

                                  {/* Estructura del reloj de arena */}
                                  <path
                                    d="M6.5 4.5 H17.5 C17.5 8.5 13.5 10.5 12 12 C13.5 13.5 17.5 15.5 17.5 19.5 H6.5 C6.5 15.5 10.5 13.5 12 12 C10.5 10.5 6.5 8.5 6.5 4.5 Z"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinejoin="round"
                                  />
                                  <rect
                                    x="5"
                                    y="3"
                                    width="14"
                                    height="2"
                                    rx="1"
                                    fill="currentColor"
                                  />
                                  <rect
                                    x="5"
                                    y="19"
                                    width="14"
                                    height="2"
                                    rx="1"
                                    fill="currentColor"
                                  />
                                </g>
                              </svg>
                            )}
                          </span>

                          <button
                            type="button"
                            className={
                              pkg.status === 'published'
                                ? 'aia-btn-secondary aia-btn-sm'
                                : 'aia-btn-primary aia-btn-sm'
                            }
                            onClick={() => {
                              setSelectedPkgId(pkg.id);
                              setActiveSubTab('ia-mirror');
                            }}
                            title={`Entrar a supervisar los materiales didácticos de ${pkg.subject} como los verá el estudiante`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              visibility
                            </span>
                            <span>Supervisar</span>
                          </button>

                          {pkg.status === 'published' && (
                            <button
                              type="button"
                              className="aia-btn-secondary aia-btn-sm"
                              onClick={() => {
                                togglePackagePublishStatus(activeStudent.id, pkg.id, activeStudent);
                                if (showToast) {
                                  showToast(
                                    `${pkg.subject} fue despublicado y volvió a Supervisión Docente.`
                                  );
                                }
                              }}
                              title={`Despublicar ${pkg.subject} del portal del estudiante`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                visibility_off
                              </span>
                              <span>Despublicar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="aia-btn-danger-icon"
                            onClick={() => setPendingDeletePkg(pkg)}
                            title={`Eliminar material de ${pkg.subject}`}
                            aria-label={`Eliminar material de ${pkg.subject}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                              delete
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Cuerpo Desplegable del Área (Se oculta al contraer para no alargar la pantalla) */}
                      {isExpanded && (
                        <div className="aia-collapsible-pkg-body">
                          <div className="aia-bento-header" style={{ marginTop: '14px' }}>
                            <div>
                              <span className="aia-eyebrow">
                                INFORME PSICOPEDAGÓGICO DEL AGENTE IA PARA EL PROFESOR ({pkg.subject.toUpperCase()})
                              </span>
                              <h3 className="aia-bento-title">
                                Diagnóstico Automático: {pkg.subject}
                              </h3>
                            </div>
                            <span className="aia-status-badge ok">
                              ✓ Evaluado automáticamente desde el PIAR de {profile.primerNombre}
                            </span>
                          </div>

                          <div className="aia-teacher-report-stack">
                            <div className="aia-report-block">
                              <span className="aia-report-block-label">
                                1. Carencias Detectadas y Causa Raíz (Evaluación Automática del PIAR)
                              </span>
                              <p className="aia-report-block-text">{pkgDiag.rootCauseAnalysis}</p>
                            </div>

                            <div className="aia-form-row-2">
                              <div className="aia-report-block">
                                <span className="aia-report-block-label">
                                  2. Calibración Cognitiva ({profile.edad} años · Grado {profile.grado})
                                </span>
                                <p className="aia-report-block-text">
                                  {pkgDiag.cognitiveCalibration}
                                </p>
                              </div>

                              <div className="aia-report-block">
                                <span className="aia-report-block-label">
                                  3. Estrategia DUA Aplicada en los Materiales Didácticos
                                </span>
                                <p className="aia-report-block-text">{pkgDiag.pedagogicalStrategy}</p>
                              </div>
                            </div>

                            <div className="aia-report-two-cols">
                              <div className="aia-report-list-box strengths">
                                <strong>✓ Fortalezas del PIAR Apalancadas por la IA</strong>
                                <ul>
                                  {(pkgDiag.detectedStrengths || []).map((st, i) => (
                                    <li key={i}>{st}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="aia-report-list-box barriers">
                                <strong>⚡ Carencias y Barreras Atendidas por la IA</strong>
                                <ul>
                                  {(pkgDiag.detectedBarriers || []).map((b, i) => (
                                    <li key={i}>{b}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Resumen de la Fábrica de Contenidos Generada para esta Área */}
                          <div className="aia-factory-summary">
                            <div className="aia-factory-summary-header">
                              <span>
                                Materiales Didácticos de {pkg.subject} Generados para{' '}
                                {profile.primerNombre}
                              </span>
                              {pkgLatestScore !== null && (
                                <span className="aia-tabular aia-latest-score-pill">
                                  Último intento del alumno: {pkgLatestScore}% ({pkgAttemptsCount}{' '}
                                  intentos)
                                </span>
                              )}
                            </div>

                            <div className="aia-factory-cards-mini four-cols">
                              <div className="aia-factory-mini-item">
                                <span className="material-symbols-outlined">slideshow</span>
                                <div>
                                  <strong>{pkg.slides?.length || 5} Diapositivas (.pptx)</strong>
                                  <small>Con voz, analogías y descarga PowerPoint</small>
                                </div>
                              </div>

                              <div className="aia-factory-mini-item">
                                <span className="material-symbols-outlined">smart_display</span>
                                <div>
                                  <strong>Video YouTube</strong>
                                  <small>Video de apoyo + puntos clave IA</small>
                                </div>
                              </div>

                              <div className="aia-factory-mini-item">
                                <span className="material-symbols-outlined">sports_esports</span>
                                <div>
                                  <strong>Juegos Didácticos IA</strong>
                                  <small>{pkg.games?.length || 4} retos interactivos</small>
                                </div>
                              </div>

                              <div className="aia-factory-mini-item">
                                <span className="material-symbols-outlined">quiz</span>
                                <div>
                                  <strong>Examen Multi-Intento</strong>
                                  <small>
                                    {pkg.quizQuestions?.length || 5} preguntas con pistas
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VISTA 2: MODO ESPEJO ("VER COMO ESTUDIANTE" PARA SUPERVISIÓN MULTI-ÁREA DEL PROFESOR) */}
      {activeSubTab === 'ia-mirror' && (
        <div className="aia-studio-vertical-flow">
          {studentPackages.length > 0 && currentPkg && (
            <div className="aia-package-bar">
              <div className="aia-package-bar-left">
                <span className="aia-package-bar-label">
                  Supervisando materiales por área de {profile.primerNombre}:
                </span>
                <div className="aia-package-pills">
                  {studentPackages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPkgId(p.id)}
                      className={`aia-pkg-pill ${currentPkg?.id === p.id ? 'active' : ''}`}
                    >
                      <span>{p.subject}</span>
                      <span
                        className={`aia-pkg-dot ${p.status === 'published' ? 'pub' : 'draft'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="aia-package-bar-right">
                <span
                  className={`aia-status-icon-badge ${
                    currentPkg.status === 'published' ? 'published' : 'draft'
                  }`}
                  data-tooltip={
                    currentPkg.status === 'published'
                      ? 'Publicado y activo en el Portal del Estudiante'
                      : 'En Supervisión Docente (Oculto al estudiante)'
                  }
                  title={
                    currentPkg.status === 'published'
                      ? 'Publicado y activo en el Portal del Estudiante'
                      : 'En Supervisión Docente (Oculto al estudiante)'
                  }
                >
                  {currentPkg.status === 'published' ? (
                    <svg
                      className="aia-published-live-svg"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="currentColor"
                        fillOpacity="0.18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M8.5 12.3L10.9 14.7L15.8 9.6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="aia-hourglass-live-svg"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <defs>
                        <clipPath id={`hg-top-mirror-${currentPkg.id}`}>
                          <path d="M6.5 4.5 H17.5 C17.5 8.5 13.5 10.5 12 12 C10.5 10.5 6.5 8.5 6.5 4.5 Z" />
                        </clipPath>
                        <clipPath id={`hg-bot-mirror-${currentPkg.id}`}>
                          <path d="M12 12 C13.5 13.5 17.5 15.5 17.5 19.5 H6.5 C6.5 15.5 10.5 13.5 12 12 Z" />
                        </clipPath>
                      </defs>
                      <g className="aia-hg-flip-group">
                        <g clipPath={`url(#hg-top-mirror-${currentPkg.id})`}>
                          <rect
                            className="aia-hg-sand-top"
                            x="6"
                            y="5.2"
                            width="12"
                            height="7"
                            fill="#f59e0b"
                          />
                        </g>
                        <line
                          className="aia-hg-sand-stream"
                          x1="12"
                          y1="11.5"
                          x2="12"
                          y2="19.2"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <g clipPath={`url(#hg-bot-mirror-${currentPkg.id})`}>
                          <rect
                            className="aia-hg-sand-bottom"
                            x="6"
                            y="12.5"
                            width="12"
                            height="7"
                            fill="#f59e0b"
                          />
                        </g>
                        <path
                          d="M6.5 4.5 H17.5 C17.5 8.5 13.5 10.5 12 12 C13.5 13.5 17.5 15.5 17.5 19.5 H6.5 C6.5 15.5 10.5 13.5 12 12 C10.5 10.5 6.5 8.5 6.5 4.5 Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinejoin="round"
                        />
                        <rect x="5" y="3" width="14" height="2" rx="1" fill="currentColor" />
                        <rect x="5" y="19" width="14" height="2" rx="1" fill="currentColor" />
                      </g>
                    </svg>
                  )}
                </span>

                <button
                  type="button"
                  className={
                    currentPkg.status === 'published'
                      ? 'aia-btn-secondary aia-btn-sm'
                      : 'aia-btn-primary aia-btn-sm'
                  }
                  onClick={() => {
                    togglePackagePublishStatus(activeStudent.id, currentPkg.id, activeStudent);
                    if (showToast) {
                      showToast(
                        currentPkg.status === 'published'
                          ? `${currentPkg.subject} fue despublicado y volvió a Supervisión Docente.`
                          : `¡Supervisión aprobada! ${currentPkg.subject} publicado en el Aula de ${profile.primerNombre}.`
                      );
                    }
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {currentPkg.status === 'published' ? 'visibility_off' : 'rocket_launch'}
                  </span>
                  <span>
                    {currentPkg.status === 'published' ? 'Despublicar' : 'Aprobar y Publicar'}
                  </span>
                </button>

                <button
                  type="button"
                  className="aia-btn-danger-icon"
                  onClick={() => setPendingDeletePkg(currentPkg)}
                  title={`Eliminar material de ${currentPkg.subject}`}
                  aria-label={`Eliminar material de ${currentPkg.subject}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    delete
                  </span>
                </button>
              </div>
            </div>
          )}

          <StudentAdaptivePortal
            pkg={currentPkg}
            activity={currentActivity}
            isMirrorPreview={true}
            studentProfile={profile}
          />
        </div>
      )}

      {/* SUB-VISTA 3: ANALÍTICA DE INTENTOS Y VERIFICACIÓN EN TIEMPO REAL POR MATERIA */}
      {activeSubTab === 'ia-analytics' && (
        <div className="aia-studio-vertical-flow">
          {studentPackages.length > 0 && currentPkg ? (
            <>
              <div className="aia-bento-card aia-telemetry-subject-picker">
                <div className="aia-telemetry-picker-head">
                  <div>
                    <span className="aia-eyebrow">SELECCIONA LA ASIGNATURA PARA VER SUS RESULTADOS</span>
                    <h3 className="aia-bento-title">
                      Materias de {profile.primerNombre} ({studentPackages.length})
                    </h3>
                  </div>

                  <div className="aia-telemetry-live-controls">
                    <span className="aia-live-sync-pill">
                      <span className="aia-live-dot" aria-hidden="true" />
                      <span>
                        En vivo
                        {lastTelemetrySyncAt
                          ? ` · ${new Date(lastTelemetrySyncAt).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}`
                          : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="aia-btn-secondary aia-btn-sm"
                      onClick={handleManualTelemetrySync}
                      disabled={isSyncingTelemetry}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {isSyncingTelemetry ? 'hourglass_top' : 'sync'}
                      </span>
                      <span>{isSyncingTelemetry ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>
                  </div>
                </div>

                <div className="aia-telemetry-subject-tabs" role="tablist" aria-label="Materias con estadísticas">
                  {studentPackages.map((p) => {
                    const pAct = activityByPackage[p.id];
                    const pAttempts = pAct?.attempts || [];
                    const pBest =
                      pAttempts.length > 0
                        ? Math.max(...pAttempts.map((a) => a.percentage || 0))
                        : null;
                    const isSelected = currentPkg?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setSelectedPkgId(p.id)}
                        className={`aia-telemetry-subject-tab ${isSelected ? 'active' : ''}`}
                      >
                        <div className="aia-telemetry-subject-tab-top">
                          <span
                            className={`aia-pkg-dot ${p.status === 'published' ? 'pub' : 'draft'}`}
                            title={p.status === 'published' ? 'Publicado' : 'Borrador'}
                          />
                          <strong>{p.subject}</strong>
                        </div>
                        <span className="aia-telemetry-subject-tab-meta aia-tabular">
                          {pBest !== null
                            ? `Mejor nota: ${pBest}% (${pAttempts.length} int.)`
                            : 'Sin intentos aún'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <TeacherTelemetryAnalytics
                pkg={currentPkg}
                activity={currentActivity}
                studentPiar={activeStudent}
              />
            </>
          ) : (
            <div className="aia-bento-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)' }}>
                bar_chart
              </span>
              <h3 style={{ marginTop: '10px' }}>Aún no hay materias generadas para {profile.primerNombre}</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '460px', margin: '8px auto 0' }}>
                Genera al menos un material en <strong>Estudio Docente IA</strong> y publícalo para comenzar a registrar estadísticas en tiempo real.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de gestión de cuenta estudiantil (Documento + PIN) */}
      <StudentAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        studentPiar={activeStudent}
        profile={profile}
        onSaved={(cred) => {
          setStudentAccessMeta(cred);
          if (showToast) {
            showToast(
              cred.isActive
                ? `Acceso activado para ${profile.primerNombre} (Doc: ${cred.studentDoc} · PIN: ${cred.accessPin}).`
                : `Acceso pausado para ${profile.primerNombre}.`
            );
          }
        }}
      />

      {/* Modal de confirmación antes de eliminar un material */}
      {pendingDeletePkg && (
        <div
          className="aia-confirm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aia-delete-pkg-title"
          onClick={() => setPendingDeletePkg(null)}
        >
          <div className="aia-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aia-confirm-modal-icon">
              <span className="material-symbols-outlined">delete_forever</span>
            </div>
            <h3 id="aia-delete-pkg-title">¿Eliminar este material?</h3>
            <p>
              Se eliminará el paquete de <strong>{pendingDeletePkg.subject}</strong> (
              {pendingDeletePkg.topic}) junto con su progreso y telemetría local. Podrás volver a
              generarlo con el Agente IA cuando quieras.
            </p>
            <div className="aia-confirm-modal-actions">
              <button
                type="button"
                className="aia-btn-secondary"
                onClick={() => setPendingDeletePkg(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="aia-btn-danger"
                onClick={handleConfirmDeletePackage}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                  delete
                </span>
                <span>Eliminar material</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
