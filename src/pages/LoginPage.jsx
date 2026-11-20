import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, signInAsStudent } = useAuth();
  const [loginMode, setLoginMode] = useState('teacher'); // 'teacher' | 'student'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentDoc, setStudentDoc] = useState('');
  const [studentPin, setStudentPin] = useState('1421');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('piar_dark_mode') === 'enabled'
  );

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('piar_dark_mode', darkMode ? 'enabled' : 'disabled');
  }, [darkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (loginMode === 'teacher') {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.');
      }
    } else {
      const { error: studentError } = await signInAsStudent(studentDoc, studentPin);
      if (studentError) {
        setError(studentError.message || 'No se encontró un estudiante con ese documento.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* Decorative ambient background glows */}
      <div className="login-ambient-glow glow-1" aria-hidden="true" />
      <div className="login-ambient-glow glow-2" aria-hidden="true" />

      {/* Theme toggle switch button */}
      <button
        type="button"
        className="login-theme-toggle"
        onClick={() => setDarkMode(!darkMode)}
        title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label="Cambiar tema"
      >
        <span className="material-symbols-outlined">
          {darkMode ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      <div className="login-card">
        {/* Header and Branding */}
        <div className="login-logo">
          <div className="logo-icon-wrapper">
            <div className="logo-icon">P</div>
          </div>
          <h1 className="login-title">Gestor PIAR Suite</h1>
          <div className="login-badge">
            <span className="material-symbols-outlined badge-icon">verified_user</span>
            <span>Decreto 1421 de 2017 • Aula Adaptativa IA</span>
          </div>
        </div>

        {/* Conmutador de Rol: Docente vs Estudiante */}
        <div className="aia-login-role-switcher" role="tablist" aria-label="Tipo de usuario">
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === 'teacher'}
            onClick={() => {
              setError('');
              setLoginMode('teacher');
            }}
            className={`aia-login-role-btn ${loginMode === 'teacher' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              Badge
            </span>
            <span>Soy Docente</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === 'student'}
            onClick={() => {
              setError('');
              setLoginMode('student');
            }}
            className={`aia-login-role-btn ${loginMode === 'student' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              school
            </span>
            <span>Soy Estudiante</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {loginMode === 'teacher' ? (
            <>
              {/* Floating Field: Correo Electrónico */}
              <div className={`form-floating-group ${email ? 'has-value' : ''}`}>
                <span className="material-symbols-outlined floating-field-icon">mail</span>
                <input
                  id="login-email"
                  type="email"
                  className="form-floating-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="email"
                />
                <label htmlFor="login-email" className="form-floating-label">
                  Correo Electrónico Institucional
                </label>
              </div>

              {/* Floating Field: Contraseña */}
              <div className={`form-floating-group ${password ? 'has-value' : ''}`}>
                <span className="material-symbols-outlined floating-field-icon">lock</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-floating-input has-action-btn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="current-password"
                />
                <label htmlFor="login-password" className="form-floating-label">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="floating-action-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Modo Estudiante: Documento de Identidad del Anexo 1 */}
              <div className={`form-floating-group ${studentDoc ? 'has-value' : ''}`}>
                <span className="material-symbols-outlined floating-field-icon">id_card</span>
                <input
                  id="login-student-doc"
                  type="text"
                  className="form-floating-input aia-tabular"
                  value={studentDoc}
                  onChange={(e) => setStudentDoc(e.target.value)}
                  placeholder=" "
                  required
                />
                <label htmlFor="login-student-doc" className="form-floating-label">
                  N° de Identificación del Estudiante (TI / RC)
                </label>
              </div>

              <div className={`form-floating-group ${studentPin ? 'has-value' : ''}`}>
                <span className="material-symbols-outlined floating-field-icon">pin</span>
                <input
                  id="login-student-pin"
                  type="text"
                  className="form-floating-input aia-tabular"
                  value={studentPin}
                  onChange={(e) => setStudentPin(e.target.value)}
                  placeholder=" "
                  required
                />
                <label htmlFor="login-student-pin" className="form-floating-label">
                  Código de Aula (Por defecto: 1421)
                </label>
              </div>

              <button
                type="button"
                className="aia-student-demo-fill"
                onClick={() => {
                  setStudentDoc('1065892341');
                  setStudentPin('1421');
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  bolt
                </span>
                <span>Autocompletar alumno de ejemplo (Doc: 1065892341)</span>
              </button>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="login-error">
              <span className="material-symbols-outlined error-icon">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-login-submit"
            id="btn-login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner-sm" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">
                  {loginMode === 'teacher' ? 'login' : 'rocket_launch'}
                </span>
                <span>
                  {loginMode === 'teacher'
                    ? 'Entrar a la Suite Docente'
                    : 'Entrar a Mi Aula Adaptativa'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Security / System Footer Note */}
        <footer className="login-card-footer">
          <p>
            {loginMode === 'teacher' ? (
              <>
                Suite de Gestión de Planes Individuales de Ajustes Razonables y Estudio IA.
                <br />
                Acceso exclusivo para docentes y directivos.
              </>
            ) : (
              <>
                Portal Educativo exclusivo del Estudiante (Apartado 2).
                <br />
                Ingresa con tu documento para ver tu diagnóstico, diapositivas, audio y evaluación.
              </>
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
