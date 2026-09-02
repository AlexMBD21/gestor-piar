import { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';

export default function TeacherEditModal({ teacher, onClose, onSuccess }) {
  const [email, setEmail] = useState(teacher.email || '');
  const [name, setName] = useState(teacher.full_name || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setLoading(true);

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
        setErrorMsg(pwData?.error || pwError?.message || 'Error al actualizar la contraseña.');
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
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
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
