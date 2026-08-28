import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

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
    const { data: piarsData, error } = await supabase
      .from('piars')
      .select('*')
      .order('created_at', { ascending: true });

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

  // Real-time collaborative sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('piars_realtime_collab')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'piars' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setPiars(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
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

  const saveActivePiar = async () => {
    const activeStudent = getActiveStudent();
    if (!activeStudent || !unsavedChanges) return true;

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

    // 3. Stamp section metadata with editor info
    if (user) {
      if (!updatedData.sectionMetadata) {
        updatedData.sectionMetadata = {};
      }
      sections.forEach(sec => {
        if (updatedData[sec]) {
          updatedData.sectionMetadata[sec] = {
            editor_id: user.id,
            editor_name: profile?.full_name || user.email || 'Docente',
            saved_at: new Date().toISOString()
          };
        }
      });
    }

    // 4. Save to DB
    const { error } = await supabase.from('piars').update({
      data: updatedData,
      nombre: activeStudent.nombre,
      grado: activeStudent.grado,
      diligenciado: true,
      updated_at: new Date().toISOString()
    }).eq('id', activeStudent.id);

    if (error) {
      setLoading(false);
      return false;
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
    return true;
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

    // Persist PIAR data + mark as diligenciado
    await supabase.from('piars').update({
      data: updatedData,
      nombre: updatedData.estudianteNombre || getActiveStudent()?.nombre,
      grado: updatedData.grado || getActiveStudent()?.grado,
      diligenciado: true,
      updated_at: new Date().toISOString()
    }).eq('id', piarId);
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
      unsavedChanges, setUnsavedChanges, updateLocalPiarData, saveActivePiar
    }}>
      {children}
    </PiarContext.Provider>
  );
}

export const usePiar = () => useContext(PiarContext);

