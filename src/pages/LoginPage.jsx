import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('piar_dark_mode') === 'enabled');

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
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.');
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
          <h1 className="login-title">Gestor PIAR</h1>
          <div className="login-badge">
            <span className="material-symbols-outlined badge-icon">verified_user</span>
            <span>Decreto 1421 de 2017 • Educación Inclusiva</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Floating Field: Correo Electrónico */}
          <div className={`form-floating-group ${email ? 'has-value' : ''}`}>
            <span className="material-symbols-outlined floating-field-icon">mail</span>
            <input
              id="login-email"
              type="email"
              className="form-floating-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder=" "
              required
              autoComplete="email"
            />
            <label htmlFor="login-email" className="form-floating-label">
              Correo Electrónico
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
              onChange={e => setPassword(e.target.value)}
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
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

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
                <span className="material-symbols-outlined">login</span>
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Security / System Footer Note */}
        <footer className="login-card-footer">
          <p>
            Sistema de gestión de Planes Individuales de Ajustes Razonables.
            <br />
            Acceso exclusivo para personal autorizado.
          </p>
        </footer>
      </div>
    </div>
  );
}
