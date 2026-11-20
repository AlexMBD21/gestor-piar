import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import localforage from 'localforage';
import { supabase } from '../lib/supabaseClient';
import { generateAdaptivePackageWithGemini, extractYoutubeVideoId } from '../lib/piarAiEngine';

const AulaIaContext = createContext(null);

const STORAGE_PACKAGES_KEY = 'piar_aula_ia_packages_v3';
const STORAGE_ACTIVITY_KEY = 'piar_aula_ia_activity_v3';

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

  // Hidrata automáticamente los paquetes que ya estén guardados en la base de datos para ese estudiante al seleccionarlo
  const hydrateFromPiarRecord = useCallback(
    (piar) => {
      if (!piar?.id) return;
      const dbPackages = piar?.data?.aula_ia_packages;
      if (Array.isArray(dbPackages) && dbPackages.length > 0) {
        const filteredDb = dbPackages.filter((p) => !deletedPackageIdsRef.current.has(p?.id));
        if (filteredDb.length === 0) return;
        setPackagesByStudent((prev) => {
          const localList = prev[piar.id] || [];
          if (localList.length >= filteredDb.length) return prev;
          const next = { ...prev, [piar.id]: filteredDb };
          persistPackages(next);
          return next;
        });
      }
    },
    [persistPackages]
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
    async ({ piar, subject, topic, carenciaObservada, teacherNotes, evidenceImageBase64, maxAttempts, publishImmediately = false }) => {
      const newPkg = await generateAdaptivePackageWithGemini({
        piar,
        subject,
        topic,
        carenciaObservada,
        teacherNotes,
        evidenceImageBase64,
        maxAttempts
      });
      newPkg.status = publishImmediately ? 'published' : 'draft';

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
        return next;
      });
    },
    [persistActivity]
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
        return next;
      });
    },
    [persistActivity]
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
        return next;
      });
    },
    [persistActivity]
  );

  // Telemetría 4: Juegos Didácticos Interactivos
  const recordGameTelemetry = useCallback(
    (packageId, { gameId = null, totalGames = 4, addedSeconds = 5, completed = false } = {}) => {
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

        const updated = {
          ...current,
          gamesCompleted: completedArr,
          gamesPlayCount: (current.gamesPlayCount || 0) + 1,
          gamesMaxPercent: maxPct,
          gamesTimeSec: (current.gamesTimeSec || 0) + addedSeconds,
          lastInteractionAt: new Date().toISOString()
        };
        const next = { ...prev, [packageId]: updated };
        persistActivity(next);
        return next;
      });
    },
    [persistActivity]
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
        return next;
      });

      return newAttempt;
    },
    [activityByPackage, persistActivity]
  );

  const resetAttemptsForPackage = useCallback(
    (packageId) => {
      if (!packageId) return;
      setActivityByPackage((prev) => {
        const curr = prev[packageId] || createInitialActivityState();
        const updated = {
          ...curr,
          attempts: []
        };
        const next = { ...prev, [packageId]: updated };
        persistActivity(next);
        return next;
      });
    },
    [persistActivity]
  );

  return (
    <AulaIaContext.Provider
      value={{
        ready,
        packagesByStudent,
        activityByPackage,
        hydrateFromPiarRecord,
        createAdaptivePackage,
        togglePackagePublishStatus,
        deleteAdaptivePackage,
        updatePackageYoutubeVideo,
        recordSlideTelemetry,
        recordAudioTelemetry,
        recordVideoTelemetry,
        recordGameTelemetry,
        submitQuizAttempt,
        resetAttemptsForPackage
      }}
    >
      {children}
    </AulaIaContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export const useAulaIa = () => useContext(AulaIaContext);

