import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import localforage from 'localforage';
import { validatePiarData } from '../utils/schemaValidation';

const PiarContext = createContext(null);

export function PiarProvider({ children }) {
  const { user, profile, isSuperAdmin } = useAuth();
  const [piars, setPiars] = useState([]);
  const [editLogs, setEditLogs] = useState({}); // { [piarId]: [ { id, edited_at } ] }
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const loadPiars = useCallback(async () => {
    if (!user) { setPiars([]); setEditLogs({}); return; }
    setLoading(true);
    // Todos los profesores ven todos los PIARs (RLS en Supabase controla el acceso)
    let { data: piarsData, error } = await supabase
      .from('piars')
      .select('*')
      .order('created_at', { ascending: true });

    // Handle potential race condition immediately after login where JWT isn't fully propagated yet
    if (error || !piarsData) {
      console.warn('[PiarContext] Error fetching piars, retrying...', error);
      await new Promise(resolve => setTimeout(resolve, 800));
      const retryResult = await supabase
        .from('piars')
        .select('*')
        .order('created_at', { ascending: true });
      piarsData = retryResult.data;
      error = retryResult.error;
    }

    if (!error && piarsData) {
      // Fetch teacher profiles to resolve owner name/email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      const profilesMap = profiles ? profiles.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {}) : {};

      const mappedPiars = piarsData.map(p => ({
        ...p,
        owner_name: profilesMap[p.owner_id]?.full_name || 'Profesor',
        owner_email: profilesMap[p.owner_id]?.email || 'Asignado'
      }));

      setPiars(mappedPiars);

      // Load edit logs for all fetched PIARs (including editor_id)
      const piarIds = mappedPiars.map(p => p.id);
      if (piarIds.length > 0) {
        const { data: logs } = await supabase
          .from('piar_edit_logs')
          .select('id, piar_id, editor_id, edited_at')
          .in('piar_id', piarIds)
          .order('edited_at', { ascending: false });
        if (logs) {
          // Group logs by piar_id
          const grouped = logs.reduce((acc, log) => {
            if (!acc[log.piar_id]) acc[log.piar_id] = [];
            acc[log.piar_id].push({
              ...log,
              editor_name: profilesMap[log.editor_id]?.full_name || 'Profesor',
              editor_email: profilesMap[log.editor_id]?.email || 'Docente'
            });
            return acc;
          }, {});
          setEditLogs(grouped);
        }
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPiars();
  }, [loadPiars]);

  // Offline Sync Mechanism
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const pendingSaves = await localforage.getItem('piar_pending_saves');
        if (pendingSaves && pendingSaves.length > 0) {
          console.log('[PiarContext] Sincronizando datos guardados offline...');
          for (const save of pendingSaves) {
            await supabase.rpc('merge_piar_data', save.rpcArgs);
            // Optionally log edit here if needed, but keeping it simple for now
          }
          await localforage.removeItem('piar_pending_saves');
          console.log('[PiarContext] Sincronización offline completada.');
          loadPiars();
        }
      } catch (err) {
        console.error('[PiarContext] Error sincronizando datos offline:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    // Ejecutar al cargar si ya está online
    if (navigator.onLine) handleOnline();

    return () => window.removeEventListener('online', handleOnline);
  }, [loadPiars]);

  // Refs para acceder a los valores más recientes dentro de los callbacks de realtime
  const activeStudentIdRef = useRef(activeStudentId);
  const unsavedChangesRef = useRef(unsavedChanges);

  useEffect(() => {
    activeStudentIdRef.current = activeStudentId;
  }, [activeStudentId]);

  useEffect(() => {
    unsavedChangesRef.current = unsavedChanges;
  }, [unsavedChanges]);

  // Real-time collaborative sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('piars_realtime_collab')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'piars' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setPiars(prev => prev.map(p => {
            if (p.id === payload.new.id) {
              const currentActiveId = activeStudentIdRef.current;
              const currentUnsaved = unsavedChangesRef.current;
              
              if (currentUnsaved && p.id === currentActiveId) {
                 console.warn('[PiarContext] Ignorando actualización realtime porque hay cambios locales sin guardar.');
                 return p; // Retornamos el local intacto si hay cambios sin guardar
              }
              
              // Si este es el estudiante activo y hay cambios, fusionamos para retener lo local
              return { 
                ...p, 
                ...payload.new, 
                data: (p.id === currentActiveId) ? { ...payload.new.data, ...p.data } : payload.new.data 
              };
            }
            return p;
          }));
        } else if (payload.eventType === 'INSERT') {
          setPiars(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setPiars(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getActiveStudent = () => piars.find(p => p.id === activeStudentId) ?? null;

  const updateLocalPiarData = (piarId, updatedData) => {
    setPiars(prev => prev.map(p => p.id === piarId
      ? { ...p, data: updatedData, nombre: updatedData.estudianteNombre || p.nombre, grado: updatedData.grado || p.grado }
      : p
    ));
    setUnsavedChanges(true);
  };

  // Auto-save: Desactivado a petición del usuario para que el guardado sea estrictamente manual.
  /*
  useEffect(() => {
    let timeoutId;
    if (unsavedChanges && activeStudentId) {
      timeoutId = setTimeout(() => {
        console.log('[PiarContext] Ejecutando autoguardado...');
        saveActivePiar();
      }, 60000); // 60 segundos
    }
    return () => clearTimeout(timeoutId);
  }, [unsavedChanges, activeStudentId]);
  */


  const discardActiveStudentChanges = async () => {
    setLoading(true);
    await loadPiars();
    setUnsavedChanges(false);
    setLoading(false);
  };

  const saveActivePiar = async () => {
    const activeStudent = getActiveStudent();
    if (!activeStudent || !unsavedChanges) return { success: true };

    // 1. Zod Validation
    const validation = validatePiarData(activeStudent.data);
    if (!validation.success) {
      console.warn('[PiarContext] Error de validación Zod:', validation.message);
      return { success: false, message: validation.message };
    }

    setLoading(true);
    
    // 1. Fetch the ORIGINAL data from supabase to compare
    const { data: originalDataRes } = await supabase
      .from('piars')
      .select('data')
      .eq('id', activeStudent.id)
      .single();
      
    const originalData = originalDataRes?.data || {};
    const updatedData = { ...activeStudent.data };

    // 2. Diffing Engine: Detect which sections were changed
    let actionSummaryParts = [];
    const sections = ['anexo1', 'anexo2', 'anexo3'];
    
    sections.forEach(sec => {
      const oldSecStr = JSON.stringify(originalData[sec] || {});
      const newSecStr = JSON.stringify(updatedData[sec] || {});
      
      if (oldSecStr !== newSecStr) {
        // If it was completely missing or very short, call it Aporte Nuevo
        if (!originalData[sec] || oldSecStr.length < 50) {
          actionSummaryParts.push(`Aporte Nuevo en Anexo ${sec.replace('anexo', '')}`);
        } else {
          actionSummaryParts.push(`Actualizó Anexo ${sec.replace('anexo', '')}`);
        }
      }
    });

    const summaryString = actionSummaryParts.length > 0 
      ? actionSummaryParts.join(' | ') 
      : 'Actualización general';

    // 3. Prepare partial data to merge
    const partialData = {};
    if (user) {
      partialData.sectionMetadata = { ...(originalData.sectionMetadata || {}) };
    }

    sections.forEach(sec => {
      const oldSecStr = JSON.stringify(originalData[sec] || {});
      const newSecStr = JSON.stringify(updatedData[sec] || {});
      if (oldSecStr !== newSecStr) {
        partialData[sec] = updatedData[sec];
        if (user) {
          partialData.sectionMetadata[sec] = {
            editor_id: user.id,
            editor_name: profile?.full_name || user.email || 'Docente',
            saved_at: new Date().toISOString()
          };
        }
      }
    });

    // 4. Offline Detection & Save
    const rpcArgs = {
      p_piar_id: activeStudent.id,
      p_data: partialData,
      p_nombre: activeStudent.nombre,
      p_grado: activeStudent.grado
    };

    if (!navigator.onLine) {
      console.log('[PiarContext] Sin conexión. Guardando localmente...');
      const pendingSaves = await localforage.getItem('piar_pending_saves') || [];
      pendingSaves.push({ id: activeStudent.id, rpcArgs });
      await localforage.setItem('piar_pending_saves', pendingSaves);
      
      setUnsavedChanges(false);
      setLoading(false);
      return { success: true, offline: true };
    }

    // 5. Save to DB using RPC for partial JSONB merge
    const { error } = await supabase.rpc('merge_piar_data', rpcArgs);

    if (error) {
      console.error('[PiarContext] Error saving PIAR:', error);
      setLoading(false);
      return { success: false, message: `DB Error: ${error.message || 'Error desconocido'}` };
    }

    // 5. Register edit log with action_summary
    if (user) {
      const { data: logEntry } = await supabase
        .from('piar_edit_logs')
        .insert({ 
          piar_id: activeStudent.id, 
          editor_id: user.id,
          action_summary: summaryString
        })
        .select('id, piar_id, editor_id, edited_at, action_summary')
        .single();

      if (logEntry) {
        const mappedEntry = {
          ...logEntry,
          editor_name: profile?.full_name || 'Profesor',
          editor_email: profile?.email || user.email || 'Docente'
        };
        setEditLogs(prev => ({
          ...prev,
          [activeStudent.id]: [mappedEntry, ...(prev[activeStudent.id] || [])]
        }));
      }
    }

    setUnsavedChanges(false);
    setLoading(false);
    return { success: true };
  };

  const savePiar = async (piarId, updatedData, sectionKey = null) => {
    // Stamp section metadata with editor info if a section key is passed
    if (sectionKey && user) {
      if (!updatedData.sectionMetadata) {
        updatedData.sectionMetadata = {};
      }
      updatedData.sectionMetadata[sectionKey] = {
        editor_id: user.id,
        editor_name: profile?.full_name || user.email || 'Docente',
        saved_at: new Date().toISOString()
      };
    }

    // Optimistic update in UI
    setPiars(prev => prev.map(p => p.id === piarId
      ? { ...p, data: updatedData, nombre: updatedData.estudianteNombre || p.nombre, grado: updatedData.grado || p.grado, diligenciado: true }
      : p
    ));

    // Prepare partial data
    const partialData = {};
    if (sectionKey) {
      partialData[sectionKey] = updatedData[sectionKey];
      if (user) {
        partialData.sectionMetadata = {
           [sectionKey]: {
              editor_id: user.id,
              editor_name: profile?.full_name || user.email || 'Docente',
              saved_at: new Date().toISOString()
           }
        };
      }
    } else {
      // Fallback: merge entire updatedData if no sectionKey is provided
      Object.assign(partialData, updatedData);
    }

    // Persist PIAR data using RPC merge
    await supabase.rpc('merge_piar_data', {
      p_piar_id: piarId,
      p_data: partialData,
      p_nombre: updatedData.estudianteNombre || getActiveStudent()?.nombre,
      p_grado: updatedData.grado || getActiveStudent()?.grado
    });
  };

  const releaseSectionLock = async (piarId, sectionKey) => {
    const activePiar = piars.find(p => p.id === piarId);
    if (!activePiar) return;

    if (confirm(`¿Estás seguro de que deseas desbloquear y asumir la edición de esta sección? Se registrará tu nombre como el editor actual.`)) {
      const updatedData = { ...activePiar.data };
      if (!updatedData.sectionMetadata) {
        updatedData.sectionMetadata = {};
      }
      updatedData.sectionMetadata[sectionKey] = {
        editor_id: user.id,
        editor_name: profile?.full_name || user.email || 'Docente',
        saved_at: new Date().toISOString()
      };

      await savePiar(piarId, updatedData);
    }
  };

  const createPiar = async (piarData) => {
    const row = {
      owner_id: user.id,
      nombre: piarData.estudianteNombre,
      grado: piarData.grado,
      data: piarData,
      diligenciado: false
    };
    const { data, error } = await supabase.from('piars').insert(row).select().single();
    if (error) {
      console.error('[createPiar] Supabase error:', error);
      return { error };
    }
    if (data) {
      setPiars(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  const deletePiar = async (piarId) => {
    await supabase.from('piars').delete().eq('id', piarId);
    setPiars(prev => prev.filter(p => p.id !== piarId));
    setEditLogs(prev => { const next = { ...prev }; delete next[piarId]; return next; });
    if (activeStudentId === piarId) setActiveStudentId(null);
  };

  const importPiar = async (piarData) => {
    const row = {
      owner_id: user.id,
      nombre: piarData.estudianteNombre,
      grado: piarData.grado,
      data: { ...piarData, id: 'import-' + Date.now() },
      diligenciado: false
    };
    const { data, error } = await supabase.from('piars').insert(row).select().single();
    if (!error && data) {
      setPiars(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  return (
    <PiarContext.Provider value={{
      piars, loading, activeStudentId, setActiveStudentId, editLogs,
      getActiveStudent, savePiar, createPiar, deletePiar, importPiar, loadPiars, releaseSectionLock,
      unsavedChanges, setUnsavedChanges, updateLocalPiarData, saveActivePiar,
      discardActiveStudentChanges
    }}>
      {children}
    </PiarContext.Provider>
  );
}

export const usePiar = () => useContext(PiarContext);

