import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import localforage from 'localforage';
import { supabase } from '../lib/supabaseClient';
import { generateAdaptivePackageWithGemini, extractYoutubeVideoId } from '../lib/piarAiEngine';
import { syncStudentActivityToCloud } from '../lib/studentAccessService';
import { ensureVerifiedPackageYoutube } from '../lib/youtubeVerifier';

const AulaIaContext = createContext(null);

const STORAGE_PACKAGES_KEY = 'piar_aula_ia_packages_v3';
const STORAGE_ACTIVITY_KEY = 'piar_aula_ia_activity_v3';
const STUDENT_SESSION_KEY = 'piar_student_session_v1';

function readActiveStudentCredentials() {
  try {
    const raw = window.localStorage.getItem(STUDENT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.role === 'student' && parsed?.studentDoc && parsed?.accessPin) {
      return { studentDoc: parsed.studentDoc, accessPin: parsed.accessPin };
    }
  } catch {
    // Ignorar
  }
  return null;
}

function createInitialActivityState() {
  return {
    slidesViewed: [1],
    slidesTimeSec: 12,
    audioPlayCount: 0,
    audioMaxPercent: 0,
    audioCompleted: false,
    audioListeningSec: 0,
    videoPlayCount: 0,
    videoMaxPercent: 0,
    videoScenesViewed: [],
    videoCompleted: false,
    videoWatchSec: 0,
    gamesCompleted: [],
    gamesPlayCount: 0,
    gamesMaxPercent: 0,
    gamesTimeSec: 0,
    attempts: [],
    lastInteractionAt: new Date().toISOString()
  };
}

export function AulaIaProvider({ children }) {
  const [packagesByStudent, setPackagesByStudent] = useState({});
  const [activityByPackage, setActivityByPackage] = useState({});
  const [ready, setReady] = useState(false);
  const deletedPackageIdsRef = useRef(new Set());

  // Cargar datos persistidos en localforage / localStorage al iniciar
  useEffect(() => {
    let mounted = true;
    async function loadStoredData() {
      try {
        const storedPackages = await localforage.getItem(STORAGE_PACKAGES_KEY);
        const storedActivity = await localforage.getItem(STORAGE_ACTIVITY_KEY);
        if (mounted) {
          if (storedPackages && typeof storedPackages === 'object') {
            setPackagesByStudent(storedPackages);
          } else {
            setPackagesByStudent({});
          }
          if (storedActivity && typeof storedActivity === 'object') {
            setActivityByPackage(storedActivity);
          } else {
            setActivityByPackage({});
          }
          setReady(true);
        }
      } catch (err) {
        console.warn('[AulaIaContext] Error cargando almacenamiento local:', err);
        if (mounted) setReady(true);
      }
    }
    loadStoredData();
    return () => {
      mounted = false;
    };
  }, []);

  const persistPackages = useCallback(async (nextPackages) => {
    try {
      await localforage.setItem(STORAGE_PACKAGES_KEY, nextPackages);
    } catch (err) {
      console.warn('[AulaIaContext] Error guardando paquetes:', err);
    }
  }, []);

  const persistActivity = useCallback(async (nextActivity) => {
    try {
      await localforage.setItem(STORAGE_ACTIVITY_KEY, nextActivity);
    } catch (err) {
      console.warn('[AulaIaContext] Error guardando telemetría:', err);
    }
  }, []);

  const syncActivityIfStudent = useCallback((packageId, updatedActivity) => {
    const creds = readActiveStudentCredentials();
    if (!creds || !packageId || !updatedActivity) return;
    syncStudentActivityToCloud({
      studentDoc: creds.studentDoc,
      accessPin: creds.accessPin,
      packageId,
      activity: updatedActivity
    });
  }, []);

  // Sincroniza los paquetes del estudiante en la base de datos Supabase dentro del registro del PIAR (sin tocar anexo1, anexo2 ni anexo3)
  const syncStudentPackagesToDatabase = useCallback(async (piar, studentPackagesList) => {
    if (!piar?.id || piar.id === 'blanco-temp' || String(piar.id).startsWith('demo-') || String(piar.id).startsWith('student-')) {
      return;
    }
    try {
      await supabase.rpc('merge_piar_data', {
        p_piar_id: piar.id,
        p_data: {
          aula_ia_packages: studentPackagesList
        },
        p_nombre: piar.nombre || piar.data?.estudianteNombre || 'Estudiante',
        p_grado: piar.grado || piar.data?.grado || ''
      });
    } catch (err) {
      console.warn('[AulaIaContext] Sincronización con Supabase en espera:', err);
    }
  }, []);

  // Hidrata automáticamente los paquetes y la telemetría que estén guardados en la base de datos para ese estudiante
  const hydrateFromPiarRecord = useCallback(
    (piar) => {
      if (!piar?.id) return;
      const dbPackages = piar?.data?.aula_ia_packages;
      if (Array.isArray(dbPackages) && dbPackages.length > 0) {
        const filteredDb = dbPackages.filter((p) => !deletedPackageIdsRef.current.has(p?.id));
        if (filteredDb.length > 0) {
          setPackagesByStudent((prev) => {
            const localList = prev[piar.id] || [];
            if (localList.length >= filteredDb.length) return prev;
            const next = { ...prev, [piar.id]: filteredDb };
            persistPackages(next);
            return next;
          });
        }
      }

      const dbActivity = piar?.data?.aula_ia_activity;
      if (dbActivity && typeof dbActivity === 'object') {
        setActivityByPackage((prev) => {
          let changed = false;
          const next = { ...prev };
          Object.entries(dbActivity).forEach(([pkgId, remoteAct]) => {
            if (!remoteAct || typeof remoteAct !== 'object') return;
            const localAct = prev[pkgId];
            const remoteAttempts = remoteAct.attempts?.length || 0;
            const localAttempts = localAct?.attempts?.length || 0;
            const remoteTs = Date.parse(remoteAct.lastInteractionAt || '') || 0;
            const localTs = Date.parse(localAct?.lastInteractionAt || '') || 0;
            if (!localAct || remoteAttempts > localAttempts || remoteTs > localTs) {
              next[pkgId] = remoteAct;
              changed = true;
            }
          });
          if (changed) persistActivity(next);
          return changed ? next : prev;
        });
      }
    },
    [persistPackages, persistActivity]
  );

  // Consulta fresca directa desde Supabase para ver actividad e intentos en tiempo real sin recargar la página
  const refreshActivityFromCloud = useCallback(
    async (piarId) => {
      if (
        !piarId ||
        piarId === 'blanco-temp' ||
        String(piarId).startsWith('demo-') ||
        String(piarId).startsWith('student-')
      ) {
        return false;
      }
      try {
        const { data, error } = await supabase
          .from('piars')
          .select('data')
          .eq('id', piarId)
          .single();

        if (error || !data?.data) return false;

        const dbActivity = data.data.aula_ia_activity;
        if (dbActivity && typeof dbActivity === 'object') {
          setActivityByPackage((prev) => {
            const next = { ...prev };
            let changed = false;
            Object.entries(dbActivity).forEach(([pkgId, remoteAct]) => {
              if (!remoteAct || typeof remoteAct !== 'object') return;
              const prevJson = JSON.stringify(prev[pkgId] || null);
              const nextJson = JSON.stringify(remoteAct);
              if (prevJson !== nextJson) {
                next[pkgId] = remoteAct;
                changed = true;
              }
            });
            if (changed) persistActivity(next);
            return changed ? next : prev;
          });
        }
        return true;
      } catch {
        return false;
      }
    },
    [persistActivity]
  );

  // Hidrata paquetes publicados y actividad directamente desde el inicio de sesión del estudiante
  const hydrateFromStudentLogin = useCallback(
    ({ piarId, publishedPackages = [], activityMap = {} }) => {
      if (!piarId) return;
      if (Array.isArray(publishedPackages)) {
        setPackagesByStudent((prev) => {
          const next = { ...prev, [piarId]: publishedPackages };
          persistPackages(next);
          return next;
        });
      }
      if (activityMap && typeof activityMap === 'object') {
        setActivityByPackage((prev) => {
          const next = { ...prev };
          let changed = false;
          Object.entries(activityMap).forEach(([pkgId, remoteAct]) => {
            if (!remoteAct || typeof remoteAct !== 'object') return;
            const localAct = prev[pkgId];
            const remoteAttempts = remoteAct.attempts?.length || 0;
            const localAttempts = localAct?.attempts?.length || 0;
            const remoteTs = Date.parse(remoteAct.lastInteractionAt || '') || 0;
            const localTs = Date.parse(localAct?.lastInteractionAt || '') || 0;
            if (!localAct || remoteAttempts >= localAttempts || remoteTs >= localTs) {
              next[pkgId] = remoteAct;
              changed = true;
            }
          });
          if (changed) persistActivity(next);
          return changed ? next : prev;
        });
      }
    },
    [persistPackages, persistActivity]
  );

  // Purgar cualquier paquete semilla antiguo que haya quedado en memoria antes de este flujo
  useEffect(() => {
    setPackagesByStudent((prev) => {
      let changed = false;
      const next = {};
      Object.entries(prev).forEach(([studentId, list]) => {
        const filtered = (Array.isArray(list) ? list : []).filter(
          (p) => p.topic !== 'Tablas de Frecuencia e Interpretación de Datos'
        );
        if (filtered.length !== (Array.isArray(list) ? list.length : 0)) {
          changed = true;
        }
        if (filtered.length > 0) {
          next[studentId] = filtered;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  // Crear un nuevo paquete adaptativo con Gemini API para un estudiante (en borrador hasta que el docente lo supervise y publique)
  const createAdaptivePackage = useCallback(
    async ({
      piar,
      subject,
      topic,
      carenciaObservada,
      teacherNotes,
      evidenceImageBase64,
      maxAttempts,
      publishImmediately = false,
      onProgress = null
    }) => {
      const newPkg = await generateAdaptivePackageWithGemini({
        piar,
        subject,
        topic,
        carenciaObservada,
        teacherNotes,
        evidenceImageBase64,
        maxAttempts,
        onProgress
      });
      newPkg.status = publishImmediately ? 'published' : 'draft';
      // Verificar en YouTube que el video asignado realmente funcione antes de entregarlo
      onProgress?.('Verificando video reproducible en YouTube para el estudiante...');
      newPkg.youtubeVideo = await ensureVerifiedPackageYoutube(
        newPkg.youtubeVideo,
        newPkg.subject || subject,
        newPkg.topic || topic,
        onProgress
      );

      const initialAct = createInitialActivityState();

      setPackagesByStudent((prev) => {
        const list = (prev[piar.id] || []).filter((p) => p.subject !== newPkg.subject);
        const updatedList = [newPkg, ...list];
        const next = { ...prev, [piar.id]: updatedList };
        persistPackages(next);
        syncStudentPackagesToDatabase(piar, updatedList);
        return next;
      });

      setActivityByPackage((prev) => {
        const next = { ...prev, [newPkg.id]: initialAct };
        persistActivity(next);
        return next;
      });

      return newPkg;
    },
    [persistPackages, persistActivity, syncStudentPackagesToDatabase]
  );

  const togglePackagePublishStatus = useCallback(
    (piarId, packageId, piarObj = null) => {
      setPackagesByStudent((prev) => {
        const list = prev[piarId] || [];
        const updated = list.map((pkg) => {
          if (pkg.id !== packageId) return pkg;
          const nextStatus = pkg.status === 'published' ? 'draft' : 'published';
          return {
            ...pkg,
            status: nextStatus,
            publishedAt: nextStatus === 'published' ? new Date().toISOString() : pkg.publishedAt
          };
        });
        const next = { ...prev, [piarId]: updated };
        persistPackages(next);
        if (piarObj) {
          syncStudentPackagesToDatabase(piarObj, updated);
        }
        return next;
      });
    },
    [persistPackages, syncStudentPackagesToDatabase]
  );

  const deleteAdaptivePackage = useCallback(
    (piarId, packageId, piarObj = null) => {
      if (!piarId || !packageId) return;
      deletedPackageIdsRef.current.add(packageId);

      setPackagesByStudent((prev) => {
        const list = prev[piarId] || [];
        const updated = list.filter((pkg) => pkg.id !== packageId);
        const next = { ...prev, [piarId]: updated };
        persistPackages(next);
        if (piarObj) {
          syncStudentPackagesToDatabase(piarObj, updated);
        }
        return next;
      });

      setActivityByPackage((prev) => {
        if (!prev[packageId]) return prev;
        const next = { ...prev };
        delete next[packageId];
        persistActivity(next);
        return next;
      });

      try {
        window.localStorage.removeItem(`piar_slide_mastery_${packageId}`);
        window.localStorage.removeItem(`piar_slide_embed_${packageId}`);
      } catch {
        // Ignorar restricciones de almacenamiento
      }
    },
    [persistPackages, persistActivity, syncStudentPackagesToDatabase]
  );

  // Actualizar enlace de video YouTube en un paquete existente (sin alojar video en el servidor)
  const updatePackageYoutubeVideo = useCallback(
    (piarId, packageId, youtubeUrl, customTitle = '', piarObj = null) => {
      const videoId = extractYoutubeVideoId(youtubeUrl);
      if (!piarId || !packageId || !videoId) return false;

      let targetPkgMeta = null;
      setPackagesByStudent((prev) => {
        const list = prev[piarId] || [];
        const updated = list.map((pkg) => {
          if (pkg.id !== packageId) return pkg;
          targetPkgMeta = pkg;
          const prevYt = pkg.youtubeVideo || {};
          return {
            ...pkg,
            youtubeVideo: {
              ...prevYt,
              videoId,
              title: customTitle?.trim() || prevYt.title || `Video de Apoyo · ${pkg.subject}`,
              channelTitle: customTitle?.trim() ? 'Enlace verificado por el docente' : (prevYt.channelTitle || 'YouTube Educativo'),
              customUrl: youtubeUrl?.trim() || `https://www.youtube.com/watch?v=${videoId}`,
              updatedAt: new Date().toISOString()
            }
          };
        });
        const next = { ...prev, [piarId]: updated };
        persistPackages(next);
        const syncRecord =
          piarObj ||
          (targetPkgMeta
            ? {
                id: piarId,
                nombre: targetPkgMeta.studentName || 'Estudiante',
                grado: targetPkgMeta.studentGrade || ''
              }
            : null);
        if (syncRecord) {
          syncStudentPackagesToDatabase(syncRecord, updated);
        }
        return next;
      });

      return true;
    },
    [persistPackages, syncStudentPackagesToDatabase]
  );

  // Telemetría 1: Diapositivas
  const recordSlideTelemetry = useCallback(
    (packageId, slideStep, addedSeconds = 4) => {
      if (!packageId) return;
      setActivityByPackage((prev) => {
        const current = prev[packageId] || createInitialActivityState();
        const viewedSet = new Set(current.slidesViewed || []);
        viewedSet.add(slideStep);
        const updated = {
          ...current,
          slidesViewed: Array.from(viewedSet).sort((a, b) => a - b),
          slidesTimeSec: (current.slidesTimeSec || 0) + addedSeconds,
          lastInteractionAt: new Date().toISOString()
        };
        const next = { ...prev, [packageId]: updated };
        persistActivity(next);
        syncActivityIfStudent(packageId, updated);
        return next;
      });
    },
    [persistActivity, syncActivityIfStudent]
  );

  // Telemetría 2: Cápsula de Audio
  const recordAudioTelemetry = useCallback(
    (packageId, { incrementPlay = false, progressPercent = 0, addedSeconds = 0, completed = false }) => {
      if (!packageId) return;
      setActivityByPackage((prev) => {
        const current = prev[packageId] || createInitialActivityState();
        const maxPct = Math.min(100, Math.max(current.audioMaxPercent || 0, Math.round(progressPercent)));
        const updated = {
          ...current,
          audioPlayCount: (current.audioPlayCount || 0) + (incrementPlay ? 1 : 0),
          audioMaxPercent: completed ? 100 : maxPct,
          audioCompleted: Boolean(current.audioCompleted || completed || maxPct >= 95),
          audioListeningSec: (current.audioListeningSec || 0) + addedSeconds,
          lastInteractionAt: new Date().toISOString()
        };
        const next = { ...prev, [packageId]: updated };
        persistActivity(next);
        syncActivityIfStudent(packageId, updated);
        return next;
      });
    },
    [persistActivity, syncActivityIfStudent]
  );

  // Telemetría 3: Video / Guía Paso a Paso
  const recordVideoTelemetry = useCallback(
    (packageId, { incrementPlay = false, sceneNumber = null, totalScenes = 4, addedSeconds = 0, completed = false }) => {
      if (!packageId) return;
      setActivityByPackage((prev) => {
        const current = prev[packageId] || createInitialActivityState();
        const scenesSet = new Set(current.videoScenesViewed || []);
        if (sceneNumber) scenesSet.add(sceneNumber);
        const scenesArr = Array.from(scenesSet).sort((a, b) => a - b);
        const calculatedPct = Math.min(100, Math.round((scenesArr.length / Math.max(1, totalScenes)) * 100));
        const maxPct = Math.max(current.videoMaxPercent || 0, calculatedPct);

        const updated = {
          ...current,
          videoPlayCount: (current.videoPlayCount || 0) + (incrementPlay ? 1 : 0),
          videoScenesViewed: scenesArr,
          videoMaxPercent: completed ? 100 : maxPct,
          videoCompleted: Boolean(current.videoCompleted || completed || maxPct >= 100),
          videoWatchSec: (current.videoWatchSec || 0) + addedSeconds,
          lastInteractionAt: new Date().toISOString()
        };
        const next = { ...prev, [packageId]: updated };
        persistActivity(next);
        syncActivityIfStudent(packageId, updated);
        return next;
      });
    },
    [persistActivity, syncActivityIfStudent]
  );

  // Telemetría 4: Juegos Didácticos Interactivos (realización + calificación por juego para el docente)
  const recordGameTelemetry = useCallback(
    (
      packageId,
      {
        gameId = null,
        gameLabel = '',
        totalGames = 4,
        addedSeconds = 5,
        completed = false,
        score = null,
        total = null
      } = {}
    ) => {
      if (!packageId) return;
      setActivityByPackage((prev) => {
        const current = prev[packageId] || createInitialActivityState();
        const completedSet = new Set(current.gamesCompleted || []);
        if (completed && gameId) completedSet.add(gameId);
        const completedArr = Array.from(completedSet);
        const calculatedPct = Math.min(
          100,
          Math.round((completedArr.length / Math.max(1, totalGames)) * 100)
        );
        const maxPct = Math.max(current.gamesMaxPercent || 0, calculatedPct);

        const nextScores = { ...(current.gamesScores || {}) };
        if (gameId && typeof score === 'number' && typeof total === 'number' && total > 0) {
          nextScores[gameId] = {
            label: gameLabel || nextScores[gameId]?.label || gameId,
            score,
            total,
            percentage: Math.min(100, Math.max(0, Math.round((score / total) * 100))),
            updatedAt: new Date().toISOString()
          };
        }

        const updated = {
          ...current,
          gamesCompleted: completedArr,
          gamesScores: nextScores,
          gamesPlayCount: (current.gamesPlayCount || 0) + 1,
          gamesMaxPercent: maxPct,
          gamesTimeSec: (current.gamesTimeSec || 0) + addedSeconds,
          lastInteractionAt: new Date().toISOString()
        };
        const next = { ...prev, [packageId]: updated };
        persistActivity(next);
        syncActivityIfStudent(packageId, updated);
        return next;
      });
    },
    [persistActivity, syncActivityIfStudent]
  );

  // Evaluación Multi-Intento: Registrar un nuevo intento del estudiante
  const submitQuizAttempt = useCallback(
    (pkg, selectedAnswers, durationSec = 45) => {
      if (!pkg?.id) return null;
      const questions = pkg.quizQuestions || [];
      const totalQuestions = questions.length || 1;
      let score = 0;
      const failedQuestionIds = [];
      const failedSkills = [];

      questions.forEach((q, idx) => {
        const chosen = selectedAnswers[idx];
        if (chosen === q.correctIndex) {
          score += 1;
        } else {
          failedQuestionIds.push(q.id || `q${idx + 1}`);
          failedSkills.push(q.skillTag || `Pregunta ${idx + 1}`);
        }
      });

      const percentage = Math.round((score / totalQuestions) * 100);
      const currentAct = activityByPackage[pkg.id] || createInitialActivityState();
      const totalSlides = pkg.slides?.length || 5;
      const slidesPercent = Math.min(
        100,
        Math.round(((currentAct.slidesViewed?.length || 0) / totalSlides) * 100)
      );

      const newAttempt = {
        attemptNumber: (currentAct.attempts?.length || 0) + 1,
        timestamp: new Date().toISOString(),
        durationSec,
        score,
        totalQuestions,
        percentage,
        answers: { ...selectedAnswers },
        failedQuestionIds,
        failedSkills,
        mediaSnapshot: {
          slidesPercent,
          audioPercent: currentAct.audioMaxPercent || 0,
          audioPlayCount: currentAct.audioPlayCount || 0,
          videoPercent: currentAct.videoMaxPercent || 0,
          videoPlayCount: currentAct.videoPlayCount || 0,
          gamesPercent: currentAct.gamesMaxPercent || 0
        }
      };

      setActivityByPackage((prev) => {
        const curr = prev[pkg.id] || createInitialActivityState();
        const updated = {
          ...curr,
          attempts: [...(curr.attempts || []), newAttempt],
          lastInteractionAt: new Date().toISOString()
        };
        const next = { ...prev, [pkg.id]: updated };
        persistActivity(next);
        syncActivityIfStudent(pkg.id, updated);
        return next;
      });

      return newAttempt;
    },
    [activityByPackage, persistActivity, syncActivityIfStudent]
  );

  const grantExtraAttemptForPackage = useCallback(
    async (piarId, packageId, piarObj = null) => {
      if (!piarId || !packageId) return;
      let updatedList = null;

      setPackagesByStudent((prev) => {
        const list = prev[piarId] || [];
        updatedList = list.map((pkg) => {
          if (pkg.id !== packageId) return pkg;
          return {
            ...pkg,
            maxAttempts: (Number(pkg.maxAttempts) || 3) + 1
          };
        });
        const next = { ...prev, [piarId]: updatedList };
        persistPackages(next);
        return next;
      });

      if (piarObj && Array.isArray(updatedList)) {
        await syncStudentPackagesToDatabase(piarObj, updatedList);
      }
    },
    [persistPackages, syncStudentPackagesToDatabase]
  );

  const resetAttemptsForPackage = useCallback(
    async (packageId, piarObj = null) => {
      if (!packageId) return;
      const existing = activityByPackage[packageId] || createInitialActivityState();
      const updated = {
        ...existing,
        attempts: [],
        lastInteractionAt: new Date().toISOString()
      };

      setActivityByPackage((prev) => {
        const next = { ...prev, [packageId]: updated };
        persistActivity(next);
        return next;
      });

      if (
        piarObj?.id &&
        piarObj.id !== 'blanco-temp' &&
        !String(piarObj.id).startsWith('demo-')
      ) {
        try {
          await supabase.rpc('merge_piar_data', {
            p_piar_id: piarObj.id,
            p_data: {
              aula_ia_activity: {
                [packageId]: updated
              }
            },
            p_nombre: piarObj.nombre || piarObj.data?.estudianteNombre || 'Estudiante',
            p_grado: piarObj.grado || piarObj.data?.grado || ''
          });
        } catch (err) {
          console.warn('[AulaIaContext] Error sincronizando reinicio de intentos:', err);
        }
      }
    },
    [activityByPackage, persistActivity]
  );

  return (
    <AulaIaContext.Provider
      value={{
        ready,
        packagesByStudent,
        activityByPackage,
        hydrateFromPiarRecord,
        hydrateFromStudentLogin,
        refreshActivityFromCloud,
        createAdaptivePackage,
        togglePackagePublishStatus,
        deleteAdaptivePackage,
        updatePackageYoutubeVideo,
        recordSlideTelemetry,
        recordAudioTelemetry,
        recordVideoTelemetry,
        recordGameTelemetry,
        submitQuizAttempt,
        grantExtraAttemptForPackage,
        resetAttemptsForPackage
      }}
    >
      {children}
    </AulaIaContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export const useAulaIa = () => useContext(AulaIaContext);

