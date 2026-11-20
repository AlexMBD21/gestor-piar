import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createDemoPiar } from '../lib/piarTemplates';

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser((prevUser) =>
        prevUser && currentUser && prevUser.id === currentUser.id ? prevUser : currentUser
      );
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
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

  const signInAsStudent = async (documentNumber, accessPin = '1421') => {
    const cleanDoc = (documentNumber || '').trim();
    if (!cleanDoc) {
      return { error: { message: 'Ingresa tu número de documento de identidad.' } };
    }
    if (accessPin && accessPin.trim() !== '1421' && accessPin.trim().length < 3) {
      return { error: { message: 'Código de acceso estudiantil inválido.' } };
    }

    try {
      const { data: piarsData } = await supabase
        .from('piars')
        .select('*')
        .order('created_at', { ascending: true });

      if (Array.isArray(piarsData) && piarsData.length > 0) {
        const matched = piarsData.find((p) => {
          const docInPiar = String(p?.data?.anexo1?.estudiante?.numeroIdentificacion || '').trim();
          const nameInPiar = String(p?.nombre || '').toLowerCase();
          return docInPiar === cleanDoc || nameInPiar.includes(cleanDoc.toLowerCase());
        });

        if (matched) {
          const sessionObj = {
            role: 'student',
            piarId: matched.id,
            studentName: matched.nombre || 'Estudiante',
            studentGrade: matched.grado || 'Secundaria',
            studentDoc: cleanDoc,
            piarRecord: matched
          };
          localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(sessionObj));
          setStudentSession(sessionObj);
          return { data: sessionObj, error: null };
        }

        // Si escribió el código demo o cualquier documento válido y hay un primer estudiante, vincularlo
        if (cleanDoc === '1065892341' || cleanDoc.toLowerCase() === 'demo') {
          const firstPiar = piarsData[0];
          const sessionObj = {
            role: 'student',
            piarId: firstPiar.id,
            studentName: firstPiar.nombre || 'Santiago Gómez Herrera',
            studentGrade: firstPiar.grado || '9°1',
            studentDoc: cleanDoc,
            piarRecord: firstPiar
          };
          localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(sessionObj));
          setStudentSession(sessionObj);
          return { data: sessionObj, error: null };
        }
      }
    } catch {
      // Continuar con respaldo local si no hay lectura anónima en Supabase
    }

    // Respaldo demostrativo instantáneo (para pruebas con el documento del estudiante de ejemplo)
    const demoData = createDemoPiar();
    const fallbackSession = {
      role: 'student',
      piarId: 'student-demo-piar',
      studentName: demoData.estudianteNombre || 'Santiago Gómez Herrera',
      studentGrade: demoData.grado || '9°1',
      studentDoc: cleanDoc,
      piarData: demoData
    };
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(fallbackSession));
    setStudentSession(fallbackSession);
    return { data: fallbackSession, error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(STUDENT_SESSION_KEY);
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
