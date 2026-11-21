import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, signInAsStudent } = useAuth();
  const [loginMode, setLoginMode] = useState(() => {
    try {
      return sessionStorage.getItem('piar_student_logout_reason') ? 'student' : 'teacher';
    } catch {
      return 'teacher';
    }
  }); // 'teacher' | 'student'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentDoc, setStudentDoc] = useState('');
  const [studentPin, setStudentPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => {
    try {
      const reason = sessionStorage.getItem('piar_student_logout_reason') || '';
      if (reason) sessionStorage.removeItem('piar_student_logout_reason');
      return reason;
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('piar_dark_mode') === 'enabled';
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

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
    <div className={`login-page ${loginMode === 'student' ? 'is-student-mode' : 'is-teacher-mode'}`}>
      {/* Ambient architectural background */}
      <div className="login-bg-grid" aria-hidden="true" />
      <div className="login-ambient-glow glow-1" aria-hidden="true" />
      <div className="login-ambient-glow glow-2" aria-hidden="true" />

      <div className="login-card-shell">
        <div className="login-card">
          <div className="login-card-top-accent" aria-hidden="true" />

          {/* Header & Institutional Branding */}
          <div className="login-logo">
            <div className="logo-icon-wrapper">
              <div className="logo-icon-halo" aria-hidden="true" />
              <div className="logo-icon">
                <span className="material-symbols-outlined">
                  {loginMode === 'teacher' ? 'school' : 'auto_awesome'}
                </span>
              </div>
            </div>

            <div className="login-badge">
              <span className="material-symbols-outlined badge-icon">verified_user</span>
              <span>Decreto 1421 de 2017 · Aula Adaptativa IA</span>
            </div>

            <h1 className="login-title">Gestor PIAR Suite</h1>
            <p className="login-subtitle">
              {loginMode === 'teacher'
                ? 'Plataforma institucional de ajustes razonables y apoyo pedagógico'
                : 'Ingresa con tu documento y PIN para continuar tu ruta de estudio'}
            </p>
          </div>

          {/* Segmented Control con pastilla deslizante: Docente vs Estudiante */}
          <div
            className="login-role-segmented"
            role="tablist"
            aria-label="Tipo de usuario"
            data-mode={loginMode}
          >
            <div
              className="login-role-slider"
              style={{
                transform: loginMode === 'student' ? 'translateX(100%)' : 'translateX(0%)'
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={loginMode === 'teacher'}
              onClick={() => {
                setError('');
                setLoginMode('teacher');
              }}
              className={`login-role-tab ${loginMode === 'teacher' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">badge</span>
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
              className={`login-role-tab ${loginMode === 'student' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">school</span>
              <span>Soy Estudiante</span>
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {loginMode === 'teacher' ? (
              <>
                <div className="login-field">
                  <label htmlFor="login-email" className="login-field-label">
                    Correo Electrónico Institucional
                  </label>
                  <div className="login-input-wrap">
                    <span className="material-symbols-outlined login-input-icon">mail</span>
                    <input
                      id="login-email"
                      type="email"
                      className="login-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nombre@institucion.edu.co"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="login-password" className="login-field-label">
                    Contraseña
                  </label>
                  <div className="login-input-wrap">
                    <span className="material-symbols-outlined login-input-icon">lock</span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="login-input has-trailing-btn"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="login-input-action"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="login-field">
                  <label htmlFor="login-student-doc" className="login-field-label">
                    N° de Identificación del Estudiante (TI / RC)
                  </label>
                  <div className="login-input-wrap">
                    <span className="material-symbols-outlined login-input-icon">id_card</span>
                    <input
                      id="login-student-doc"
                      type="text"
                      className="login-input aia-tabular"
                      value={studentDoc}
                      onChange={(e) => setStudentDoc(e.target.value)}
                      placeholder="Ej. 1065987234"
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <div className="login-field-label-row">
                    <label htmlFor="login-student-pin" className="login-field-label">
                      PIN de Acceso
                    </label>
                    <span className="login-field-hint">4 a 6 dígitos</span>
                  </div>
                  <div className="login-input-wrap">
                    <span className="material-symbols-outlined login-input-icon">pin</span>
                    <input
                      id="login-student-pin"
                      type={showPassword ? 'text' : 'password'}
                      inputMode="numeric"
                      className="login-input has-trailing-btn aia-tabular"
                      value={studentPin}
                      onChange={(e) =>
                        setStudentPin(e.target.value.replace(/\D+/g, '').slice(0, 6))
                      }
                      placeholder="Asignado por tu profesor"
                      minLength={4}
                      maxLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="login-input-action"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? 'Ocultar PIN' : 'Mostrar PIN'}
                      aria-label={showPassword ? 'Ocultar PIN' : 'Mostrar PIN'}
                      tabIndex={-1}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="login-error" role="alert">
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
                  <span className="material-symbols-outlined btn-login-icon">
                    {loginMode === 'teacher' ? 'login' : 'rocket_launch'}
                  </span>
                  <span>
                    {loginMode === 'teacher'
                      ? 'Entrar a la Suite Docente'
                      : 'Entrar a Mi Aula Adaptativa'}
                  </span>
                  <span className="material-symbols-outlined btn-login-arrow">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
