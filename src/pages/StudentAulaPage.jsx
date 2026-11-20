import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAulaIa } from '../context/AulaIaContext';
import { createDemoPiar } from '../lib/piarTemplates';
import { extractStudentPedagogicalProfile } from '../lib/piarAiEngine';
import StudentAdaptivePortal from '../components/aula-ia/StudentAdaptivePortal';

export default function StudentAulaPage() {
  const { studentSession, signOut } = useAuth();
  const {
    packagesByStudent,
    activityByPackage,
    hydrateFromPiarRecord
  } = useAulaIa();

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('piar_dark_mode') === 'enabled'
  );

  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('piar_dark_mode', darkMode ? 'enabled' : 'disabled');
  }, [darkMode]);

  // Construir el objeto PIAR del estudiante autenticado de forma memoizada
  const studentPiar = useMemo(
    () =>
      studentSession?.piarRecord || {
        id: studentSession?.piarId || 'student-demo-piar',
        nombre: studentSession?.studentName || 'Santiago Gómez Herrera',
        grado: studentSession?.studentGrade || '9°1',
        data: studentSession?.piarData || createDemoPiar()
      },
    [studentSession]
  );

  useEffect(() => {
    if (studentPiar) {
      hydrateFromPiarRecord(studentPiar);
    }
  }, [studentPiar, hydrateFromPiarRecord]);

  const profile = extractStudentPedagogicalProfile(studentPiar);
  const allPackages = packagesByStudent[studentPiar.id] || [];
  const publishedPackages = allPackages.filter((p) => p.status === 'published');
  const [selectedPkgId, setSelectedPkgId] = useState(null);
  const activePkg =
    publishedPackages.find((p) => p.id === selectedPkgId) || publishedPackages[0] || null;
  const activeActivity = activePkg?.id ? activityByPackage[activePkg.id] : null;

  return (
    <div className="aia-student-page-shell">
      <div className="aia-student-theme-floating">
        <button
          type="button"
          className="aia-theme-icon-btn"
          onClick={() => setDarkMode((d) => !d)}
          title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <span className="material-symbols-outlined">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      <div className="aia-student-page-inner">
        {publishedPackages.length > 1 && (
          <div className="aia-package-bar" style={{ marginBottom: '14px' }}>
            <div className="aia-package-bar-left">
              <span className="aia-package-bar-label">Mis Materias y Materiales Publicados:</span>
              <div className="aia-package-pills">
                {publishedPackages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPkgId(p.id)}
                    className={`aia-pkg-pill ${activePkg?.id === p.id ? 'active' : ''}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      menu_book
                    </span>
                    <span>{p.subject}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <StudentAdaptivePortal
          pkg={activePkg}
          activity={activeActivity}
          isMirrorPreview={false}
          studentProfile={profile}
          onSignOutStudent={signOut}
        />
      </div>
    </div>
  );
}
