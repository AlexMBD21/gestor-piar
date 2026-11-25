import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authenticateStudent } from '../lib/studentAccessService';

const AuthContext = createContext(null);
const STUDENT_SESSION_KEY = 'piar_student_session_v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [studentSession, setStudentSession] = useState(() => {
    try {
      const saved = localStorage.getItem(STUDENT_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) setProfile(data);
    else setProfile(null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser((prevUser) =>
        prevUser && currentUser && prevUser.id === currentUser.id ? prevUser : currentUser
      );
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser((prevUser) =>
        prevUser && currentUser && prevUser.id === currentUser.id ? prevUser : currentUser
      );
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email, password) => {
    localStorage.removeItem(STUDENT_SESSION_KEY);
    setStudentSession(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signInAsStudent = async (documentNumber, accessPin) => {
    const { data, error } = await authenticateStudent({ documentNumber, accessPin });
    if (error || !data) {
      return { data: null, error: error || { message: 'No fue posible iniciar sesión.' } };
    }
    try {
      localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(data));
    } catch {
      // Ignorar cuota
    }
    setStudentSession(data);
    return { data, error: null };
  };

  const revokeStudentSession = useCallback((reason) => {
    try {
      localStorage.removeItem(STUDENT_SESSION_KEY);
      sessionStorage.removeItem('piar_student_selected_pkg');
      if (reason) {
        sessionStorage.setItem('piar_student_logout_reason', reason);
      }
    } catch {
      // Ignorar
    }
    setStudentSession(null);
  }, []);

  const refreshStudentSession = useCallback(async () => {
    if (!studentSession?.studentDoc || !studentSession?.accessPin) return null;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

    const { data, error } = await authenticateStudent({
      documentNumber: studentSession.studentDoc,
      accessPin: studentSession.accessPin
    });
    if (!error && data) {
      try {
        localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(data));
      } catch {
        // Ignorar cuota
      }
      setStudentSession(data);
      return data;
    }

    // Si el docente cambió el PIN, pausó la cuenta o modificó el documento, interrumpir sesión inmediatamente
    if (
      error &&
      ['INVALID_PIN', 'INACTIVE', 'DISABLED', 'NOT_FOUND', 'PIAR_NOT_FOUND'].includes(error.code)
    ) {
      const isDisabled = error.code === 'INACTIVE' || error.code === 'DISABLED';
      const reason = isDisabled
        ? 'Tu profesor pausó temporalmente el acceso a tu Aula. Consulta con él para reactivarlo.'
        : error.code === 'INVALID_PIN'
          ? 'Tu PIN de acceso fue actualizado por tu profesor. Ingresa con tu nuevo PIN para continuar.'
          : 'Tu acceso estudiantil fue modificado o revocado por tu profesor. Consulta con él para ingresar.';
      revokeStudentSession(reason);
    }
    return null;
  }, [studentSession?.studentDoc, studentSession?.accessPin, revokeStudentSession]);

  const signOut = async () => {
    try {
      localStorage.removeItem(STUDENT_SESSION_KEY);
      sessionStorage.removeItem('piar_student_selected_pkg');
    } catch {
      // Ignorar
    }
    setStudentSession(null);
    await supabase.auth.signOut();
  };

  const isSuperAdmin = profile?.role === 'superadmin';
  const isStudent = Boolean(studentSession && !user);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        studentSession,
        isStudent,
        loading,
        signIn,
        signInAsStudent,
        refreshStudentSession,
        revokeStudentSession,
        signOut,
        isSuperAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext);
