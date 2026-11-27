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
      return sessionStorage.getItem('piar_student_logout_reason') || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.remove('dark-mode');
    try {
      localStorage.removeItem('piar_dark_mode');
      sessionStorage.removeItem('piar_student_logout_reason');
    } catch {
      // Ignorar restricciones de almacenamiento
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
      {/* Panel visual educativo izquierdo (sin texto) */}
      <section className="login-visual-pane" aria-hidden="true">
        <div className="login-visual-grid" />
        <div className="login-visual-orb orb-1" />
        <div className="login-visual-orb orb-2" />
        <div className="login-visual-orb orb-3" />

        <svg
          className="login-edu-artwork"
          viewBox="0 0 480 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Órbitas geométricas serenas */}
          <circle cx="240" cy="210" r="176" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" strokeDasharray="5 7" />
          <circle cx="240" cy="210" r="132" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
          <circle cx="240" cy="210" r="88" fill="rgba(255,255,255,0.04)" />

          {/* Tarjeta flotante superior izquierda: progreso académico */}
          <g className="login-art-float-slow">
            <rect
              x="48"
              y="72"
              width="136"
              height="74"
              rx="16"
              fill="rgba(255,255,255,0.10)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.2"
            />
            <circle cx="74" cy="98" r="12" fill="rgba(147,197,253,0.28)" />
            <path d="M69 98.5L72.5 102L79.5 94.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="96" y="92" width="68" height="6" rx="3" fill="rgba(255,255,255,0.72)" />
            <rect x="96" y="104" width="46" height="5" rx="2.5" fill="rgba(255,255,255,0.34)" />
            <rect x="62" y="124" width="108" height="7" rx="3.5" fill="rgba(255,255,255,0.14)" />
            <rect x="62" y="124" width="76" height="7" rx="3.5" fill="#93c5fd" />
          </g>

          {/* Tarjeta flotante superior derecha: birrete académico */}
          <g className="login-art-float-alt">
            <rect
              x="312"
              y="60"
              width="116"
              height="92"
              rx="18"
              fill="rgba(255,255,255,0.10)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.2"
            />
            <path
              d="M370 86L402 101L370 116L338 101L370 86Z"
              fill="rgba(255,255,255,0.24)"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M350 107V122C350 126 359 130 370 130C381 130 390 126 390 122V107"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M402 101V121" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="402" cy="124" r="3" fill="#93c5fd" />
          </g>

          {/* Libro abierto central (núcleo educativo) */}
          <g className="login-art-center">
            <rect
              x="128"
              y="150"
              width="224"
              height="156"
              rx="22"
              fill="rgba(255,255,255,0.12)"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.4"
            />
            {/* Página izquierda */}
            <path
              d="M154 180C178 174 214 176 238 190V276C214 264 178 262 154 268V180Z"
              fill="rgba(255,255,255,0.18)"
              stroke="rgba(255,255,255,0.68)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Página derecha */}
            <path
              d="M326 180C302 174 266 176 242 190V276C266 264 302 262 326 268V180Z"
              fill="rgba(255,255,255,0.13)"
              stroke="rgba(255,255,255,0.68)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Líneas abstractas de lectura en página izquierda */}
            <rect x="168" y="198" width="54" height="5" rx="2.5" fill="rgba(255,255,255,0.75)" />
            <rect x="168" y="211" width="46" height="4.5" rx="2.25" fill="rgba(255,255,255,0.45)" />
            <rect x="168" y="223" width="52" height="4.5" rx="2.25" fill="rgba(255,255,255,0.45)" />
            <rect x="168" y="235" width="38" height="4.5" rx="2.25" fill="rgba(255,255,255,0.35)" />
            {/* Bloques visuales en página derecha */}
            <rect x="256" y="196" width="54" height="24" rx="7" fill="rgba(147,197,253,0.34)" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
            <rect x="256" y="229" width="54" height="5" rx="2.5" fill="rgba(255,255,255,0.62)" />
            <rect x="256" y="241" width="38" height="4.5" rx="2.25" fill="rgba(255,255,255,0.38)" />
            {/* Separador/marcador superior */}
            <path d="M298 176V195L304 190L310 195V176" fill="#93c5fd" />
          </g>

          {/* Tarjeta flotante inferior izquierda: bloques DUA */}
          <g className="login-art-float-alt">
            <rect
              x="54"
              y="286"
              width="124"
              height="68"
              rx="16"
              fill="rgba(255,255,255,0.09)"
              stroke="rgba(255,255,255,0.20)"
              strokeWidth="1.2"
            />
            <rect x="70" y="304" width="24" height="24" rx="7" fill="rgba(147,197,253,0.34)" />
            <rect x="102" y="304" width="24" height="24" rx="7" fill="rgba(255,255,255,0.22)" />
            <rect x="134" y="304" width="28" height="24" rx="7" fill="rgba(255,255,255,0.14)" />
            <rect x="70" y="336" width="64" height="5" rx="2.5" fill="rgba(255,255,255,0.42)" />
          </g>

          {/* Tarjeta flotante inferior derecha: chispa IA / aprendizaje */}
          <g className="login-art-float-slow">
            <rect
              x="316"
              y="282"
              width="112"
              height="74"
              rx="16"
              fill="rgba(255,255,255,0.10)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.2"
            />
            <path
              d="M372 299L375.8 310.2L387 314L375.8 317.8L372 329L368.2 317.8L357 314L368.2 310.2L372 299Z"
              fill="#bfdbfe"
            />
            <circle cx="395" cy="304" r="3.2" fill="rgba(255,255,255,0.65)" />
            <rect x="338" y="338" width="68" height="5" rx="2.5" fill="rgba(255,255,255,0.45)" />
          </g>

          {/* Destellos suaves */}
          <circle cx="240" cy="70" r="4" fill="rgba(191,219,254,0.8)" />
          <circle cx="108" cy="214" r="3.5" fill="rgba(255,255,255,0.55)" />
          <circle cx="384" cy="222" r="4.5" fill="rgba(147,197,253,0.7)" />
          <circle cx="240" cy="354" r="3.5" fill="rgba(255,255,255,0.48)" />
        </svg>
      </section>

      {/* Panel derecho de acceso a pantalla completa */}
      <aside className="login-form-pane">
        <div className="login-card-shell">
          <div className="login-card">
            {/* Header & Institutional Branding */}
            <div className="login-logo">
              <div className="logo-icon-wrapper">
                <div className="logo-icon-halo" aria-hidden="true" />
                <div className="logo-icon">
                  <span className="material-symbols-outlined">school</span>
                </div>
              </div>

              <h1 className="login-title">Gestor PIAR</h1>
              <p className="login-subtitle">Inicia sesión para continuar</p>
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
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>
        </div>
      </div>
      </aside>
    </div>
  );
}
