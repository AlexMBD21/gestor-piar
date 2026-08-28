import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TeacherEditModal from './TeacherEditModal';

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

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
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');
      setShowCreateModal(false);
      fetchTeachers();
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    if (confirm(`¿Estás seguro de eliminar al profesor ${teacher.full_name || teacher.email}?\nEsta acción eliminará todos sus PIARs asociados.`)) {
      const { error } = await supabase.rpc('admin_delete_teacher', {
        teacher_id: teacher.id
      });
      if (error) {
        alert(error.message);
      } else {
        fetchTeachers();
      }
    }
  };

  return (
    <div className="card">
      <div className="card-title-container">
        <h3 className="card-title">Listado de Profesores</h3>
        <button className="btn btn-success btn-sm" onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Profesor
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          <div className="login-spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
          Cargando profesores...
        </div>
      ) : (
        <div className="table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTeacher(t)} style={{ marginRight: 8 }}>
                      Editar
                    </button>
                    {t.role !== 'superadmin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTeacher(t)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Crear */}
      {showCreateModal && (
        <div className="modal-overlay active" onClick={(e) => e.target.className.includes('modal-overlay') && setShowCreateModal(false)}>
          <div className="modal-container" style={{ maxWidth: 450 }}>
            <div className="modal-header">
               <h3 className="modal-title">Registrar Nuevo Profesor</h3>
               <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={actionLoading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success" disabled={actionLoading}>
                  {actionLoading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar */}
      {selectedTeacher && (
        <TeacherEditModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
          onSuccess={() => { setSelectedTeacher(null); fetchTeachers(); }}
        />
      )}
    </div>
  );
}
