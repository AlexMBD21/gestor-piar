import { useState, useEffect, useRef, useMemo } from 'react';
import { usePiar } from '../../context/PiarContext';
import { useAulaIa } from '../../context/AulaIaContext';
import { supabase } from '../../lib/supabaseClient';
import {
  extractStudentPedagogicalProfile,
  computePiarAnalysisFingerprint
} from '../../lib/piarAiEngine';
import { getScoreTone, computePackageMetrics } from '../../lib/aulaProgress';
import StudentAdaptivePortal from './StudentAdaptivePortal';
import TeacherTelemetryAnalytics from './TeacherTelemetryAnalytics';
import StudentAccessModal from './StudentAccessModal';
import StudioPiarCard from './StudioPiarCard';
import PackageAccordionList from './PackageAccordionList';
import SubjectDock from './SubjectDock';
import ConfirmModal from './ConfirmModal';
import CustomSelect from '../CustomSelect';
import { getStudentCredential } from '../../lib/studentAccessService';
import { runViewTransition, animateStaggerIn } from '../../lib/motionCraft';

export default function AulaAdaptativaSuite({
  activeSubTab = 'ia-studio',
  setActiveSubTab,
  showToast,
  onSwitchToPiarSuite
}) {
  const { piars, loading: piarsLoading } = usePiar();
  const {
    ready: aulaReady,
    aulaStudentId,
    setAulaStudentId,
    packagesByStudent,
    activityByPackage,
    piarAnalysisByStudent,
    hydrateFromPiarRecord,
    refreshActivityFromCloud,
    analyzeStudentPiar,
    createAdaptivePackage,
    togglePackagePublishStatus,
    deleteAdaptivePackage
  } = useAulaIa();

  const validPiars = useMemo(
    () => piars.filter((p) => p.data?.id !== 'blanco-temp'),
    [piars]
  );
  const activeStudent = useMemo(
    () => (aulaStudentId ? validPiars.find((p) => p.id === aulaStudentId) || null : null),
    [aulaStudentId, validPiars]
  );

  // Si el estudiante guardado en el Aula ya no existe en la lista (ej. fue eliminado), limpiar sin afectar al Gestor PIAR
  useEffect(() => {
    if (piarsLoading || !aulaStudentId) return;
    const existsInList = validPiars.some((p) => p.id === aulaStudentId);
    if (!existsInList) {
      setAulaStudentId(null);
    }
  }, [piarsLoading, aulaStudentId, validPiars, setAulaStudentId]);

  const studentPackages = activeStudent?.id ? packagesByStudent[activeStudent.id] || [] : [];
  const [selectedPkgId, setSelectedPkgId] = useState(() => {
    try {
      return sessionStorage.getItem('aula_ia_selected_pkg_id') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (selectedPkgId) {
        sessionStorage.setItem('aula_ia_selected_pkg_id', String(selectedPkgId));
      } else {
        sessionStorage.removeItem('aula_ia_selected_pkg_id');
      }
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
  }, [selectedPkgId]);

  // Controla qué tarjeta de materia generada está desplegada (acordeón contraíble para no alargar la pantalla)
  const [expandedPkgId, setExpandedPkgId] = useState(null);
  const [pendingDeletePkg, setPendingDeletePkg] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [studentAccessMeta, setStudentAccessMeta] = useState(null);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);

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
  const [isAnalyzingPiar, setIsAnalyzingPiar] = useState(false);
  const resultsSectionRef = useRef(null);

  const currentPiarFingerprint = useMemo(
    () => (activeStudent ? computePiarAnalysisFingerprint(activeStudent) : null),
    [activeStudent]
  );
  const studentAnalysis = activeStudent?.id ? piarAnalysisByStudent[activeStudent.id] || null : null;
  const isAnalysisStale = Boolean(
    studentAnalysis?.fingerprint &&
      currentPiarFingerprint &&
      studentAnalysis.fingerprint !== currentPiarFingerprint
  );

  useEffect(() => {
    setSelectedAreaIndex(0);
    setExpandedPkgId(null);
    setPendingDeletePkg(null);
    setShowAccessModal(false);
    let mounted = true;
    if (activeStudent) {
      hydrateFromPiarRecord(activeStudent);
      setIsLoadingAccess(true);
      getStudentCredential(activeStudent.id)
        .then((cred) => {
          if (mounted) setStudentAccessMeta(cred);
        })
        .finally(() => {
          if (mounted) setIsLoadingAccess(false);
        });
    } else {
      setStudentAccessMeta(null);
      setIsLoadingAccess(false);
    }
    return () => {
      mounted = false;
    };
  }, [activeStudent, hydrateFromPiarRecord]);

  useEffect(() => {
    if (activeSubTab !== 'ia-studio' || !resultsSectionRef.current) return undefined;
    return animateStaggerIn(resultsSectionRef.current, '.aia-collapsible-pkg-card', {
      y: 8,
      duration: 0.3,
      stagger: 0.04
    });
  }, [activeSubTab, activeStudent?.id]);

  // Sincronización automática de Telemetría e Intentos cuando el docente observa "Intentos y Telemetría"
  useEffect(() => {
    if (activeSubTab !== 'ia-analytics' || !activeStudent?.id) return undefined;

    const runSync = async () => {
      await refreshActivityFromCloud(activeStudent.id);
    };

    // El sondeo se pausa cuando la pestaña está oculta y se reanuda al volver
    const runSyncIfVisible = () => {
      if (document.visibilityState === 'visible') runSync();
    };

    runSync();

    // Sondeo ligero cada 8s + suscripción Realtime de Supabase para ver intentos sin recargar
    const intervalId = setInterval(runSyncIfVisible, 8000);
    document.addEventListener('visibilitychange', runSyncIfVisible);
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
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', runSyncIfVisible);
      supabase.removeChannel(channel);
    };
  }, [activeSubTab, activeStudent?.id, refreshActivityFromCloud]);

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

  const renderMirrorSkeleton = () => (
    <div className="aia-suite-container aia-skel-suite" role="status" aria-live="polite" aria-label="Cargando vista de estudiante">
      {/* Contenedor 1: Barra SubjectDock (Supervisión Docente) */}
      <div className="aia-bento-card aia-skel-dock">
        <div className="aia-skel-dock-left">
          <span className="aia-skel" style={{ width: '160px', height: '10px' }} />
          <div className="aia-skel-dock-row">
            <span className="aia-skel aia-skel-pill" style={{ width: '158px', height: '32px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '116px', height: '24px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '82px', height: '24px' }} />
          </div>
        </div>
        <div className="aia-skel-pkg-actions">
          <span className="aia-skel" style={{ width: '108px', height: '32px', borderRadius: '8px' }} />
          <span className="aia-skel" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
        </div>
      </div>

      {/* Contenedor 2: Tarjeta de foco de estudio + Guía y meta */}
      <div className="aia-bento-card aia-skel-focus-bar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div className="aia-skel-dock-row">
            <span className="aia-skel aia-skel-pill" style={{ width: '124px', height: '24px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '148px', height: '24px' }} />
          </div>
          <span className="aia-skel" style={{ width: '320px', maxWidth: '80%', height: '17px' }} />
        </div>
        <span className="aia-skel aia-skel-pill" style={{ width: '126px', height: '36px', flexShrink: 0 }} />
      </div>

      {/* Contenedor 3: Stepper de 4 pasos (Diapositivas, Video, Juegos, Mi Examen) */}
      <div className="aia-skel-stepper-grid">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="aia-skel-step-card">
            <div className="aia-skel-step-top">
              <span className="aia-skel" style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div className="aia-skel-row-between">
                  <span className="aia-skel" style={{ width: '48px', height: '10px' }} />
                  <span className="aia-skel" style={{ width: '36px', height: '10px' }} />
                </div>
                <span className="aia-skel" style={{ width: idx === 1 ? '82%' : '68%', height: '13px' }} />
              </div>
            </div>
            <span className="aia-skel aia-skel-pill" style={{ width: '100%', height: '4px' }} />
          </div>
        ))}
      </div>

      {/* Contenedor 4: Escenario activo (cabecera + progreso + tarjeta + barra inferior) */}
      <div className="aia-bento-card aia-skel-stage-card">
        <div className="aia-skel-row-between">
          <div className="aia-skel-dock-row">
            <span className="aia-skel aia-skel-pill" style={{ width: '172px', height: '26px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '184px', height: '24px' }} />
          </div>
          <div className="aia-skel-pkg-actions">
            <span className="aia-skel aia-skel-pill" style={{ width: '138px', height: '26px' }} />
            <span className="aia-skel" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          </div>
        </div>

        {/* Barra de progreso y selector rápido */}
        <div className="aia-skel-stage-box">
          <div className="aia-skel-row-between">
            <span className="aia-skel" style={{ width: '165px', height: '12px' }} />
            <span className="aia-skel" style={{ width: '92px', height: '12px' }} />
          </div>
          <span className="aia-skel aia-skel-pill" style={{ width: '100%', height: '6px' }} />
          <div className="aia-skel-chips-row">
            {[0, 1, 2, 3, 4].map((n) => (
              <span key={n} className="aia-skel" style={{ width: '34px', height: '24px', borderRadius: '7px' }} />
            ))}
          </div>
        </div>

        {/* Tarjeta central (pregunta/lámina + grilla 2x2) */}
        <div className="aia-skel-stage-box">
          <div className="aia-skel-row-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="aia-skel" style={{ width: '28px', height: '20px', borderRadius: '6px' }} />
              <span className="aia-skel" style={{ width: '94px', height: '12px' }} />
            </div>
            <span className="aia-skel" style={{ width: '134px', height: '30px', borderRadius: '8px' }} />
          </div>
          <span className="aia-skel" style={{ width: '58%', height: '17px' }} />
          <div className="aia-skel-options-grid">
            {[0, 1, 2, 3].map((opt) => (
              <span key={opt} className="aia-skel" style={{ width: '100%', height: '44px', borderRadius: '10px' }} />
            ))}
          </div>
        </div>

        {/* Footer de navegación */}
        <div className="aia-skel-row-between" style={{ paddingTop: '6px' }}>
          <span className="aia-skel" style={{ width: '104px', height: '36px', borderRadius: '10px' }} />
          <span className="aia-skel" style={{ width: '220px', maxWidth: '40%', height: '12px' }} />
          <span className="aia-skel" style={{ width: '154px', height: '36px', borderRadius: '10px' }} />
        </div>
      </div>
    </div>
  );

  const renderAnalyticsSkeleton = () => (
    <div className="aia-suite-container aia-skel-suite" role="status" aria-live="polite" aria-label="Cargando telemetría e intentos">
      {/* Contenedor 1: Barra SubjectDock (Telemetría en Vivo) */}
      <div className="aia-bento-card aia-skel-dock">
        <div className="aia-skel-dock-left">
          <span className="aia-skel" style={{ width: '156px', height: '10px' }} />
          <div className="aia-skel-dock-row">
            <span className="aia-skel aia-skel-pill" style={{ width: '182px', height: '32px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '116px', height: '24px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '84px', height: '24px' }} />
          </div>
        </div>
      </div>

      {/* Contenedor 2: Resumen de progreso (4 KPIs + chips de juegos + estado) */}
      <div className="aia-bento-card aia-skel-stage-card">
        <div className="aia-skel-row-between">
          <span className="aia-skel" style={{ width: '290px', maxWidth: '70%', height: '16px' }} />
          <span className="aia-skel" style={{ width: '165px', height: '12px' }} />
        </div>

        <div className="aia-skel-stepper-grid">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="aia-skel-step-card">
              <div className="aia-skel-step-top">
                <span className="aia-skel" style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <span className="aia-skel" style={{ width: '68%', height: '12px' }} />
                  <span className="aia-skel" style={{ width: '82%', height: '10px' }} />
                </div>
                <span className="aia-skel aia-skel-pill" style={{ width: idx === 1 ? '74px' : '48px', height: '20px', flexShrink: 0 }} />
              </div>
              <span className="aia-skel aia-skel-pill" style={{ width: '100%', height: '4px' }} />
            </div>
          ))}
        </div>

        <div className="aia-skel-chips-row" style={{ alignItems: 'center' }}>
          <span className="aia-skel" style={{ width: '48px', height: '12px' }} />
          <span className="aia-skel aia-skel-pill" style={{ width: '132px', height: '24px' }} />
          <span className="aia-skel aia-skel-pill" style={{ width: '148px', height: '24px' }} />
          <span className="aia-skel aia-skel-pill" style={{ width: '154px', height: '24px' }} />
          <span className="aia-skel aia-skel-pill" style={{ width: '144px', height: '24px' }} />
        </div>

        <span className="aia-skel aia-skel-pill" style={{ width: '108px', height: '24px' }} />
      </div>

      {/* Contenedor 3: Resultados del examen + comparativa + lista de respuestas */}
      <div className="aia-bento-card aia-skel-stage-card">
        <div className="aia-skel-row-between">
          <span className="aia-skel" style={{ width: '170px', height: '16px' }} />
          <span className="aia-skel" style={{ width: '128px', height: '32px', borderRadius: '8px' }} />
        </div>

        <span className="aia-skel" style={{ width: '100%', height: '36px', borderRadius: '9px' }} />

        <div className="aia-skel-row-between">
          <span className="aia-skel" style={{ width: '64px', height: '13px' }} />
          <div className="aia-skel-dock-row">
            <span className="aia-skel aia-skel-pill" style={{ width: '104px', height: '30px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '98px', height: '30px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '112px', height: '30px' }} />
          </div>
        </div>

        <div className="aia-skel-telemetry-split">
          {/* Resultado del intento */}
          <div className="aia-skel-stage-box">
            <div className="aia-skel-row-between">
              <span className="aia-skel" style={{ width: '132px', height: '10px' }} />
              <span className="aia-skel aia-skel-pill" style={{ width: '82px', height: '20px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span className="aia-skel" style={{ width: '58px', height: '24px' }} />
              <span className="aia-skel" style={{ width: '94px', height: '13px' }} />
            </div>
            <span className="aia-skel aia-skel-pill" style={{ width: '100%', height: '7px' }} />
            <div className="aia-skel-row-between">
              <span className="aia-skel" style={{ width: '112px', height: '11px' }} />
              <span className="aia-skel" style={{ width: '48px', height: '11px' }} />
            </div>
          </div>

          {/* Comparativa entre intentos (barras) */}
          <div className="aia-skel-stage-box">
            <span className="aia-skel" style={{ width: '168px', height: '10px' }} />
            <div className="aia-skel-bars-row">
              {[44, 18, 56].map((h, i) => (
                <div key={i} className="aia-skel-bar-col">
                  <span className="aia-skel" style={{ width: '28px', height: '10px' }} />
                  <span className="aia-skel" style={{ width: '26px', height: `${h}px`, borderRadius: '6px' }} />
                  <span className="aia-skel" style={{ width: '18px', height: '10px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de respuestas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="aia-skel-row-between">
            <span className="aia-skel" style={{ width: '174px', height: '14px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="aia-skel" style={{ width: '76px', height: '12px' }} />
              <span className="aia-skel" style={{ width: '126px', height: '28px', borderRadius: '8px' }} />
            </div>
          </div>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="aia-skel-answer-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span className="aia-skel" style={{ width: '26px', height: '18px', borderRadius: '5px', flexShrink: 0 }} />
                <span className="aia-skel" style={{ width: `${38 + (row % 3) * 10}%`, height: '12px' }} />
              </div>
              <div className="aia-skel-pkg-actions">
                <span className="aia-skel aia-skel-pill" style={{ width: '68px', height: '20px' }} />
                <span className="aia-skel aia-skel-pill" style={{ width: '64px', height: '20px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (piarsLoading && validPiars.length === 0) {
    if (activeSubTab === 'ia-mirror') {
      return renderMirrorSkeleton();
    }
    if (activeSubTab === 'ia-analytics') {
      return renderAnalyticsSkeleton();
    }

    let isAnalysisCollapsedSaved = false;
    try {
      isAnalysisCollapsedSaved =
        window.sessionStorage.getItem('aula_ia_analysis_collapsed') === 'true';
    } catch {
      isAnalysisCollapsedSaved = false;
    }

    return (
      <div className="aia-suite-container aia-skel-suite" role="status" aria-live="polite" aria-label="Cargando Aula Adaptativa IA">
        {/* Contenedor 1: Barra superior de selector de estudiante y acceso */}
        <div className="aia-top-control-bar aia-skel-topbar">
          <span className="aia-skel aia-skel-avatar" />
          <div className="aia-skel-topbar-fields">
            <span className="aia-skel" style={{ width: '175px', height: '10px' }} />
            <div className="aia-skel-topbar-row">
              <span className="aia-skel" style={{ width: '280px', maxWidth: '100%', height: '38px', borderRadius: '10px' }} />
              <span className="aia-skel aia-skel-access-pill" />
            </div>
          </div>
        </div>

        {/* Contenedor 2: Tarjeta Expediente PIAR + Análisis Agente IA + Áreas + Meta + CTA */}
        <div className="aia-bento-card aia-skel-studio-card">
          <div className="aia-skel-row-between">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
              <span className="aia-skel" style={{ width: '250px', maxWidth: '72%', height: '19px' }} />
              <span className="aia-skel" style={{ width: '210px', maxWidth: '58%', height: '12px' }} />
            </div>
            <span className="aia-skel aia-skel-pill" style={{ width: '116px', height: '26px' }} />
          </div>

          {/* Panel de Análisis Agente IA (respeta si el docente lo dejó contraído) */}
          <div className="aia-skel-analysis">
            <div className="aia-skel-row-between">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="aia-skel aia-skel-pill" style={{ width: '124px', height: '24px' }} />
                <span className="aia-skel" style={{ width: '88px', height: '12px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="aia-skel" style={{ width: '112px', height: '26px', borderRadius: '8px' }} />
                <span className="aia-skel" style={{ width: '74px', height: '26px', borderRadius: '8px' }} />
              </div>
            </div>

            {!isAnalysisCollapsedSaved && (
              <>
                <span className="aia-skel" style={{ width: '94%', height: '13px' }} />

                <div className="aia-skel-analysis-grid">
                  <div className="aia-skel-analysis-box is-strength">
                    <span className="aia-skel" style={{ width: '44%', height: '10px' }} />
                    <span className="aia-skel" style={{ width: '86%', height: '12px' }} />
                    <span className="aia-skel" style={{ width: '72%', height: '12px' }} />
                    <span className="aia-skel" style={{ width: '80%', height: '12px' }} />
                  </div>
                  <div className="aia-skel-analysis-box is-barrier">
                    <span className="aia-skel" style={{ width: '42%', height: '10px' }} />
                    <span className="aia-skel" style={{ width: '88%', height: '12px' }} />
                    <span className="aia-skel" style={{ width: '76%', height: '12px' }} />
                    <span className="aia-skel" style={{ width: '82%', height: '12px' }} />
                  </div>
                  <div className="aia-skel-analysis-box full">
                    <span className="aia-skel" style={{ width: '28%', height: '10px' }} />
                    <span className="aia-skel" style={{ width: '64%', height: '12px' }} />
                    <span className="aia-skel" style={{ width: '58%', height: '12px' }} />
                    <span className="aia-skel" style={{ width: '68%', height: '12px' }} />
                  </div>
                </div>

                <span className="aia-skel" style={{ width: '54%', height: '11px' }} />
              </>
            )}
          </div>

          {/* Selector de Áreas del PIAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="aia-skel" style={{ width: '108px', height: '10px' }} />
            <div className="aia-skel-chips-row">
              <span className="aia-skel aia-skel-pill" style={{ width: '164px', height: '32px' }} />
              <span className="aia-skel aia-skel-pill" style={{ width: '132px', height: '32px' }} />
              <span className="aia-skel aia-skel-pill" style={{ width: '126px', height: '32px' }} />
              <span className="aia-skel aia-skel-pill" style={{ width: '118px', height: '32px' }} />
              <span className="aia-skel aia-skel-pill" style={{ width: '108px', height: '32px' }} />
              <span className="aia-skel aia-skel-pill" style={{ width: '126px', height: '32px' }} />
            </div>
          </div>

          {/* Caja Meta PIAR */}
          <div className="aia-skel-meta-bar">
            <span className="aia-skel" style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0 }} />
            <span className="aia-skel" style={{ width: '48%', height: '13px' }} />
          </div>

          {/* Botón Generar Material IA */}
          <span className="aia-skel" style={{ width: '100%', height: '44px', borderRadius: '11px' }} />
        </div>

        {/* Contenedor 3: Materiales generados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="aia-skel" style={{ width: '148px', height: '15px' }} />
            <span className="aia-skel aia-skel-pill" style={{ width: '24px', height: '20px' }} />
          </div>

          {[0, 1].map((idx) => (
            <div key={idx} className="aia-bento-card aia-skel-pkg-card">
              <div className="aia-skel-pkg-left">
                <span className="aia-skel" style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }} />
                <div className="aia-skel-pkg-lines">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="aia-skel" style={{ width: idx === 0 ? '138px' : '182px', height: '14px' }} />
                    <span className="aia-skel aia-skel-pill" style={{ width: '74px', height: '20px' }} />
                    <span className="aia-skel" style={{ width: '185px', height: '11px' }} />
                  </div>
                  <span className="aia-skel" style={{ width: idx === 0 ? '44%' : '52%', height: '12px' }} />
                </div>
              </div>
              <div className="aia-skel-pkg-actions">
                <span className="aia-skel" style={{ width: '96px', height: '32px', borderRadius: '8px' }} />
                {idx === 0 && (
                  <span className="aia-skel" style={{ width: '104px', height: '32px', borderRadius: '8px' }} />
                )}
                <span className="aia-skel" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (validPiars.length === 0) {
    return (
      <div className="aia-bento-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '42px', color: 'var(--primary)' }}>
          person_search
        </span>
        <h3 style={{ marginTop: '12px' }}>Primero crea un estudiante en el Gestor PIAR</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '520px', margin: '8px auto 20px' }}>
          Recuerda que el documento PIAR se crea primero en el Apartado 1 y es la fuente que alimenta en solo lectura al Aula Adaptativa IA.
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

  if (!activeStudent || !profile) {
    return (
      <div className="aia-suite-container">
        <div className="aia-top-control-bar">
          <div className="aia-student-context-selector">
            <div className="aia-context-avatar">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <div className="aia-context-fields">
              <label htmlFor="aia-student-select" className="aia-context-eyebrow">
                ESTUDIANTE EN AULA IA · SELECCIÓN INDEPENDIENTE
              </label>
              <div className="aia-context-row">
                <CustomSelect
                  id="aia-student-select"
                  className="aia-student-custom-select"
                  value=""
                  onChange={(val) => setAulaStudentId(val || null)}
                  options={validPiars.map((p) => ({
                    value: p.id,
                    label: `${p.nombre} — Grado ${p.grado || 'S/A'}`
                  }))}
                  placeholder="Seleccionar estudiante para trabajar en el Aula..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="aia-bento-card" style={{ textAlign: 'center', padding: '44px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)' }}>
            school
          </span>
          <h3 style={{ marginTop: '12px', marginBottom: '6px' }}>
            Elige un estudiante para abrir su Aula IA
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
            La selección del Aula es independiente del expediente que tengas abierto en el Gestor PIAR: cambiar aquí no afectará tu trabajo en los Anexos 1, 2 o 3.
          </p>
        </div>
      </div>
    );
  }

  const activeArea = detectedAreas[selectedAreaIndex] || detectedAreas[0];

  const stepLower = String(generationStep || '').toLowerCase();
  const shortGenerationLabel = stepLower.includes('youtube') || stepLower.includes('video')
    ? 'Verificando video...'
    : stepLower.includes('validando')
      ? 'Validando material...'
      : stepLower.includes('leyendo')
        ? 'Analizando PIAR...'
        : 'Generando con IA...';

  // Análisis bajo demanda del expediente PIAR (independiente de la generación de materiales)
  const handleAnalyzePiar = async () => {
    if (!activeStudent || isAnalyzingPiar) return;
    setIsAnalyzingPiar(true);
    try {
      const result = await analyzeStudentPiar(activeStudent);
      if (showToast && result) {
        if (result.engineMode === 'gemini') {
          showToast(`Análisis del expediente PIAR de ${profile.primerNombre} actualizado con Gemini IA.`);
        } else {
          showToast(
            `Gemini no respondió a tiempo; se generó un resumen local con los datos reales del PIAR de ${profile.primerNombre}.`
          );
        }
      }
    } finally {
      setIsAnalyzingPiar(false);
    }
  };

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
      {/* BARRA SUPERIOR DEL ESTUDIO DOCENTE: Selector de Estudiante y Credencial de Acceso */}
      {activeSubTab === 'ia-studio' && (
        <div className="aia-top-control-bar">
        <div className="aia-student-context-selector">
          <div className="aia-context-avatar">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <div className="aia-context-fields">
            <label htmlFor="aia-student-select" className="aia-context-eyebrow">
              ESTUDIANTE ACTIVO · PIAR (SOLO LECTURA)
            </label>
            <div className="aia-context-row">
              <CustomSelect
                id="aia-student-select"
                className="aia-student-custom-select"
                value={activeStudent.id}
                onChange={(val) => setAulaStudentId(val || null)}
                options={validPiars.map((p) => ({
                  value: p.id,
                  label: `${p.nombre} — Grado ${p.grado || 'S/A'}`
                }))}
                placeholder="Seleccionar estudiante..."
              />

              {isLoadingAccess ? (
                <span
                  className="aia-skel aia-skel-access-pill"
                  role="status"
                  aria-label="Cargando estado de acceso del estudiante"
                />
              ) : (
                <button
                  type="button"
                  className={`aia-credential-btn ${
                    studentAccessMeta?.isActive
                      ? 'is-active'
                      : studentAccessMeta
                        ? 'is-paused'
                        : 'is-unassigned'
                  }`}
                  onClick={() => setShowAccessModal(true)}
                  title="Abrir modal para asignar o gestionar el documento y PIN de acceso del estudiante"
                  aria-haspopup="dialog"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    key
                  </span>
                  <span className="aia-tabular">
                    {studentAccessMeta?.isActive
                      ? `Acceso Activo · Doc: ${studentAccessMeta.studentDoc}`
                      : studentAccessMeta
                        ? `Acceso Pausado · Doc: ${studentAccessMeta.studentDoc}`
                        : 'Asignar Acceso Alumno'}
                  </span>
                  <span className="material-symbols-outlined aia-credential-btn-launch" aria-hidden="true">
                    open_in_new
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* SUB-VISTA 1: ESTUDIO DOCENTE — 100% AUTOMATIZADO Y CONTRAÍBLE POR ÁREA */}
      {activeSubTab === 'ia-studio' && (
        <div className="aia-studio-vertical-flow">
          {/* BLOQUE 1 (ARRIBA): Resumen Controlado del PIAR (Agente IA) y Selector de Área */}
          <StudioPiarCard
            profile={profile}
            detectedAreas={detectedAreas}
            selectedAreaIndex={selectedAreaIndex}
            onSelectAreaIndex={setSelectedAreaIndex}
            hasPackageForArea={hasPackageForArea}
            activeArea={activeArea}
            isGenerating={isGenerating}
            shortGenerationLabel={shortGenerationLabel}
            onGenerate={handleAutoGenerateFromPiar}
            studentAnalysis={studentAnalysis}
            isAnalysisStale={isAnalysisStale}
            isAnalyzingPiar={isAnalyzingPiar}
            onAnalyzePiar={handleAnalyzePiar}
          />

          {/* BLOQUE 2 (DEBAJO DEL BOTÓN): Lista Acordeón de Paquetes por Materia / Área */}
          <PackageAccordionList
            sectionRef={resultsSectionRef}
            packages={visiblePackages}
            expandedPkgId={expandedPkgId}
            profile={profile}
            isLoading={!aulaReady}
            isGenerating={isGenerating}
            generatingSubject={activeArea?.displayArea || activeArea?.area || ''}
            onToggleExpand={(pkgId) => {
              setSelectedPkgId(pkgId);
              setExpandedPkgId((prev) => (prev === pkgId ? null : pkgId));
            }}
            onSupervise={(pkgId) => {
              setSelectedPkgId(pkgId);
              if (setActiveSubTab) {
                runViewTransition(() => setActiveSubTab('ia-mirror'));
              }
            }}
            onTogglePublish={(pkg) => {
              togglePackagePublishStatus(activeStudent.id, pkg.id, activeStudent);
              if (showToast) {
                showToast(`${pkg.subject} fue despublicado y volvió a Supervisión Docente.`);
              }
            }}
            onRequestDelete={setPendingDeletePkg}
          />
        </div>
      )}

      {/* SUB-VISTA 2: MODO ESPEJO ("VER COMO ESTUDIANTE" PARA SUPERVISIÓN MULTI-ÁREA DEL PROFESOR) */}
      {activeSubTab === 'ia-mirror' && (
        !aulaReady && studentPackages.length === 0 ? (
          renderMirrorSkeleton()
        ) : (
        <div className="aia-studio-vertical-flow">
          {studentPackages.length > 0 && currentPkg && (
            <SubjectDock
              eyebrow={`SUPERVISIÓN DOCENTE · ${profile.primerNombre.toUpperCase()}`}
              currentPkg={currentPkg}
              packages={studentPackages}
              onSelectPackage={setSelectedPkgId}
              countPillText={`${studentPackages.filter((p) => p.status === 'published').length}/${studentPackages.length} ${studentPackages.length === 1 ? 'materia publicada' : 'publicadas'}`}
              railAriaLabel="Asignaturas generadas para supervisar"
              actions={
                <>
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
                </>
              }
            />
          )}

          <StudentAdaptivePortal
            pkg={currentPkg}
            activity={null}
            isMirrorPreview={true}
            studentProfile={profile}
          />
        </div>
        )
      )}

      {/* SUB-VISTA 3: ANALÍTICA DE INTENTOS Y VERIFICACIÓN EN TIEMPO REAL POR MATERIA */}
      {activeSubTab === 'ia-analytics' && (
        !aulaReady && studentPackages.length === 0 ? (
          renderAnalyticsSkeleton()
        ) : (
        <div className="aia-studio-vertical-flow">
          {studentPackages.length > 0 && currentPkg ? (
            <>
              <SubjectDock
                eyebrow={`TELEMETRÍA EN VIVO · ${profile.primerNombre.toUpperCase()}`}
                currentPkg={currentPkg}
                packages={studentPackages}
                onSelectPackage={setSelectedPkgId}
                countPillText={`${studentPackages.filter((p) => (activityByPackage[p.id]?.attempts?.length || 0) > 0).length}/${studentPackages.length} ${studentPackages.length === 1 ? 'materia evaluada' : 'evaluadas'}`}
                railAriaLabel="Materias con estadísticas"
                renderTabSuffix={(p) => {
                  const { bestQuizPct } = computePackageMetrics(p, activityByPackage[p.id]);
                  const scoreTone = getScoreTone(bestQuizPct, { allowEmpty: true });
                  return (
                    <span className={`aia-telemetry-rail-badge aia-tabular ${scoreTone}`}>
                      {bestQuizPct !== null ? `${bestQuizPct}%` : 'Sin int.'}
                    </span>
                  );
                }}
              />

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
        )
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
      <ConfirmModal
        isOpen={Boolean(pendingDeletePkg)}
        titleId="aia-delete-pkg-title"
        icon="delete_forever"
        title="¿Eliminar este material?"
        cancelLabel="Cancelar"
        confirmLabel="Eliminar material"
        confirmIcon="delete"
        confirmVariant="danger"
        onCancel={() => setPendingDeletePkg(null)}
        onConfirm={handleConfirmDeletePackage}
      >
        {pendingDeletePkg && (
          <p>
            Se eliminará el paquete de <strong>{pendingDeletePkg.subject}</strong> (
            {pendingDeletePkg.topic}) junto con su progreso y telemetría local. Podrás volver a
            generarlo con el Agente IA cuando quieras.
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}
