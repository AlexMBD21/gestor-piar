import { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function TeacherEditModal({ teacher, onClose, onSuccess }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(teacher.email || '');
  const [name, setName] = useState(teacher.full_name || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !name.trim()) {
      setErrorMsg('El nombre y el correo son requeridos.');
      return;
    }

    if (password.trim() && !adminConfirmPassword.trim()) {
      setErrorMsg('Por favor ingresa tu contraseña de administrador para confirmar el cambio.');
      return;
    }

    setLoading(true);

    // Si se especificó nueva contraseña, validar primero la contraseña del administrador actual
    if (password.trim()) {
      const adminEmail = user?.email;
      if (adminEmail) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminConfirmPassword.trim()
        });

        if (authErr) {
          setLoading(false);
          setErrorMsg('Tu contraseña de administrador es incorrecta. Por favor verifícala.');
          return;
        }
      }
    }

    // Actualizar nombre y email via RPC
    const { error: profileError } = await supabase.rpc('admin_update_teacher', {
      teacher_id: teacher.id,
      new_email: email.trim(),
      new_password: null,   // contraseña se maneja por separado
      new_name: name.trim()
    });

    if (profileError) {
      setLoading(false);
      setErrorMsg(profileError.message || 'Error al actualizar el profesor.');
      return;
    }

    // Si se proporcionó nueva contraseña, actualizarla via Edge Function
    if (password.trim()) {
      const { data: pwData, error: pwError } = await supabase.functions.invoke('update-teacher-password', {
        body: { teacher_id: teacher.id, new_password: password.trim() },
      });
      if (pwError || pwData?.error) {
        setLoading(false);
        setErrorMsg(pwData?.error || pwError?.message || 'Error al actualizar la contraseña del profesor.');
        return;
      }
    }

    setLoading(false);
    handleClose();
    setTimeout(() => {
      onSuccess();
    }, 350);
  };

  return createPortal(
    <div id="modal-edit-teacher" className={`modal-overlay active ${isClosing ? 'closing' : ''}`} onClick={(e) => e.target.id === 'modal-edit-teacher' && handleClose()}>
      <div className="modal-container" style={{ maxWidth: '450px', width: '100%' }}>
        <div className="modal-header">
          <h3 className="modal-title">Editar Profesor</h3>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Cerrar modal">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="login-error" style={{ marginBottom: 12 }}>
                {errorMsg}
              </div>
            )}
            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Nueva Contraseña (Opcional)</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Dejar en blanco para conservar actual"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {password.trim().length > 0 && (
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shield</span>
                  Tu Contraseña de Administrador
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showAdminConfirmPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Ingresa tu contraseña para autorizar"
                    value={adminConfirmPassword}
                    onChange={e => setAdminConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowAdminConfirmPassword(v => !v)}
                    aria-label={showAdminConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showAdminConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Por seguridad, confirma tu contraseña para autorizar el cambio.
                </small>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn-md3-success" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

