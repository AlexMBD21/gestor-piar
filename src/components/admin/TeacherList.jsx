import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import TeacherEditModal from './TeacherEditModal';

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isClosingCreateModal, setIsClosingCreateModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [deleteModalTeacher, setDeleteModalTeacher] = useState(null);
  const [isClosingDeleteTeacherModal, setIsClosingDeleteTeacherModal] = useState(false);

  const handleCloseCreateModal = () => {
    setIsClosingCreateModal(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setIsClosingCreateModal(false);
      setErrorMsg('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');
    }, 350);
  };

  // Form para crear profesor
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTeachers(data);
    }
    setLoading(false);
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!createEmail || !createPassword || !createName) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }

    setActionLoading(true);

    // Llamar a la Edge Function (usa Admin API con hash compatible)
    const { data, error } = await supabase.functions.invoke('create-teacher', {
      body: {
        teacher_email: createEmail.trim(),
        teacher_password: createPassword,
        teacher_name: createName.trim(),
      },
    });

    setActionLoading(false);
    if (error || data?.error) {
      setErrorMsg(data?.error || error?.message || 'Error al crear el profesor.');
    } else {
      handleCloseCreateModal();
      fetchTeachers();
    }
  };

  const handleCloseDeleteTeacherModal = () => {
    setIsClosingDeleteTeacherModal(true);
    setTimeout(() => {
      setDeleteModalTeacher(null);
      setIsClosingDeleteTeacherModal(false);
    }, 350);
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!deleteModalTeacher) return;
    const target = deleteModalTeacher;
    handleCloseDeleteTeacherModal();
    const { error } = await supabase.rpc('admin_delete_teacher', {
      teacher_id: target.id
    });
    if (error) {
      alert(error.message);
    } else {
      fetchTeachers();
    }
  };

  return (
    <div className="md3-card">
      <div className="md3-card-header">
        <div className="md3-card-title-group">
          <span className="material-symbols-outlined icon-display" style={{ color: 'var(--text-main)', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>admin_panel_settings</span>
          <h3 className="font-headline-sm">Listado de Profesores</h3>
        </div>
        <div className="md3-card-actions">
          <button id="btn-new-teacher" className="btn-md3-filled" onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nuevo Profesor</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <div className="login-spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
          Cargando profesores...
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-wrapper hide-mobile-only" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Correo Electrónico</th>
                  <th>Rol</th>
                  <th>Creado en</th>
                  <th className="action-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.full_name || '—'}</td>
                    <td>{t.email || '—'}</td>
                    <td>
                      <span className={`preview-badge ${t.role === 'superadmin' ? 'badge-si' : 'badge-no'}`} style={{ textTransform: 'capitalize' }}>
                        {t.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="action-cell">
                      <div className="action-cell-buttons">
                        <button className="btn-edit-teacher" onClick={() => setSelectedTeacher(t)}>
                          Editar
                        </button>
                        {t.role !== 'superadmin' && (
                          <button className="btn-delete-teacher" onClick={() => setDeleteModalTeacher(t)}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="admin-mobile-cards show-mobile-only">
            {teachers.map(t => (
              <div key={t.id} className="admin-teacher-card">
                <div className="teacher-card-row">
                  <span className="teacher-card-label">Nombre</span>
                  <span className="teacher-card-value" style={{ fontWeight: 600 }}>{t.full_name || '—'}</span>
                </div>
                <div className="teacher-card-row">
                  <span className="teacher-card-label">Correo</span>
                  <span className="teacher-card-value">{t.email || '—'}</span>
                </div>
                <div className="teacher-card-row">
                  <span className="teacher-card-label">Rol</span>
                  <span className={`preview-badge ${t.role === 'superadmin' ? 'badge-si' : 'badge-no'}`} style={{ textTransform: 'capitalize' }}>
                    {t.role}
                  </span>
                </div>
                <div className="teacher-card-row">
                  <span className="teacher-card-label">Creado</span>
                  <span className="teacher-card-value">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <div className="teacher-card-actions">
                  <button className="btn-edit-teacher" onClick={() => setSelectedTeacher(t)}>
                    Editar
                  </button>
                  {t.role !== 'superadmin' && (
                    <button className="btn-delete-teacher" onClick={() => setDeleteModalTeacher(t)}>
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal para Crear */}
      {showCreateModal && createPortal(
        <div id="modal-create-teacher" className={`modal-overlay active ${isClosingCreateModal ? 'closing' : ''}`} onClick={(e) => e.target.id === 'modal-create-teacher' && handleCloseCreateModal()}>
          <div className="modal-container" style={{ maxWidth: '450px', width: '100%' }}>
            <div className="modal-header">
               <h3 className="modal-title">Registrar Nuevo Profesor</h3>
               <button type="button" className="modal-close" onClick={handleCloseCreateModal} aria-label="Cerrar modal">
                 <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
               </button>
            </div>
            <form onSubmit={handleCreateTeacher}>
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
                    placeholder="Ej. Juan Pérez"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="juan@institucion.edu.co"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña Inicial</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Mínimo 6 caracteres"
                      value={createPassword}
                      onChange={e => setCreatePassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCreatePassword(v => !v)}
                      aria-label={showCreatePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showCreatePassword ? (
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
                <button type="submit" className="btn-md3-success" disabled={actionLoading}>
                  {actionLoading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para Editar */}
      {selectedTeacher && (
        <TeacherEditModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
          onSuccess={() => { setSelectedTeacher(null); fetchTeachers(); }}
        />
      )}

      {/* Modal de Confirmación para Eliminar Profesor */}
      {deleteModalTeacher && createPortal(
        <div id="modal-delete-teacher" className={`modal-overlay active ${isClosingDeleteTeacherModal ? 'closing' : ''}`} onClick={(e) => e.target.id === 'modal-delete-teacher' && handleCloseDeleteTeacherModal()}>
          <div className="modal-container" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: '24px' }}>person_remove</span>
                ¿Eliminar cuenta de profesor?
              </h3>
              <button type="button" className="modal-close" onClick={handleCloseDeleteTeacherModal} aria-label="Cerrar modal">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0 24px 20px 24px', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas eliminar al profesor <strong>{deleteModalTeacher.full_name || deleteModalTeacher.email}</strong>? Esta acción eliminará permanentemente la cuenta y todos sus PIARs asociados.
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleConfirmDeleteTeacher}
                style={{ width: '100%', padding: '12px 16px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                Eliminar Profesor
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
