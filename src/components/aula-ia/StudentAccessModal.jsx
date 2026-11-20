import { useState, useEffect } from 'react';
import {
  generateRandomPin,
  getStudentCredential,
  normalizePin,
  normalizeStudentDoc,
  saveStudentCredential
} from '../../lib/studentAccessService';

export default function StudentAccessModal({
  isOpen,
  onClose,
  studentPiar,
  profile,
  onSaved
}) {
  const defaultDoc = normalizeStudentDoc(profile?.numeroIdentificacion || '');
  const [studentDoc, setStudentDoc] = useState(defaultDoc);
  const [accessPin, setAccessPin] = useState(() => generateRandomPin(4));
  const [isActive, setIsActive] = useState(true);
  const [lastLoginAt, setLastLoginAt] = useState(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentPiar?.id) return undefined;
    let active = true;
    setLoading(true);
    setFeedback(null);
    setCopied(false);

    getStudentCredential(studentPiar.id).then((cred) => {
      if (!active) return;
      if (cred) {
        setHasExisting(true);
        setStudentDoc(cred.studentDoc || defaultDoc);
        setAccessPin(cred.accessPin || generateRandomPin(4));
        setIsActive(Boolean(cred.isActive));
        setLastLoginAt(cred.lastLoginAt || null);
      } else {
        setHasExisting(false);
        setStudentDoc(defaultDoc);
        setAccessPin(generateRandomPin(4));
        setIsActive(true);
        setLastLoginAt(null);
      }
      setLoading(false);
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      active = false;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, studentPiar?.id, defaultDoc, onClose]);

  if (!isOpen || !studentPiar) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const result = await saveStudentCredential({
      piarId: studentPiar.id,
      studentDoc,
      accessPin,
      isActive,
      studentName: profile?.nombreCompleto || studentPiar.nombre || 'Estudiante',
      studentGrade: profile?.grado || studentPiar.grado || ''
    });

    setSaving(false);

    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error || 'No se pudo guardar el acceso.' });
      return;
    }

    setHasExisting(true);
    setFeedback({
      type: result.warning ? 'warning' : 'ok',
      text: result.warning
        ? result.warning
        : `Cuenta ${isActive ? 'activa' : 'pausada'} y sincronizada correctamente.`
    });

    if (onSaved) onSaved(result.credential);
  };

  const handleCopyShareCard = () => {
    const cleanDoc = normalizeStudentDoc(studentDoc);
    const cleanPin = normalizePin(accessPin);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const msg = [
      `Hola ${profile?.primerNombre || 'estudiante'}, aquí tienes tu acceso a Mi Aula Adaptativa (Gestor PIAR):`,
      `• Enlace: ${origin}/login`,
      `• Selecciona: "Soy Estudiante"`,
      `• N° de Documento: ${cleanDoc}`,
      `• PIN de acceso: ${cleanPin}`
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    }
  };

  return (
    <div
      className="aia-confirm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aia-student-access-title"
      onClick={onClose}
    >
      <div
        className="aia-confirm-modal aia-access-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aia-access-modal-head">
          <div className="aia-access-modal-title-wrap">
            <div className="aia-access-modal-icon">
              <span className="material-symbols-outlined">key</span>
            </div>
            <div>
              <h3 id="aia-student-access-title">Acceso al Aula del Estudiante</h3>
              <p className="aia-access-modal-sub">
                {profile?.nombreCompleto || studentPiar.nombre} · Grado{' '}
                {profile?.grado || studentPiar.grado || '—'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="aia-welcome-collapse-btn"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>

        {loading ? (
          <div className="aia-access-loading">Cargando configuración de acceso...</div>
        ) : (
          <form onSubmit={handleSubmit} className="aia-access-form">
            <div className="aia-access-field">
              <label htmlFor="aia-access-doc">N° de Documento del Estudiante (TI / RC)</label>
              <input
                id="aia-access-doc"
                type="text"
                className="aia-input-compact aia-tabular"
                value={studentDoc}
                onChange={(e) => setStudentDoc(normalizeStudentDoc(e.target.value))}
                placeholder="Ej. 1065987234"
                required
              />
              <small>
                El estudiante usará este documento para ver únicamente sus materias publicadas.
              </small>
            </div>

            <div className="aia-access-field">
              <label htmlFor="aia-access-pin">PIN Personal de Acceso (4 a 6 dígitos)</label>
              <div className="aia-access-pin-row">
                <input
                  id="aia-access-pin"
                  type="text"
                  inputMode="numeric"
                  className="aia-input-compact aia-tabular aia-access-pin-input"
                  value={accessPin}
                  onChange={(e) => setAccessPin(normalizePin(e.target.value))}
                  placeholder="4829"
                  minLength={4}
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  className="aia-btn-secondary aia-btn-sm"
                  onClick={() => setAccessPin(generateRandomPin(4))}
                  title="Generar un nuevo PIN aleatorio de 4 dígitos"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    casino
                  </span>
                  <span>Generar PIN</span>
                </button>
              </div>
            </div>

            <label className="aia-access-toggle-row">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>
                <strong>Acceso activo al Portal del Estudiante</strong>
                <small>
                  {isActive
                    ? 'El estudiante puede iniciar sesión y ver las materias publicadas.'
                    : 'El acceso está pausado; el estudiante no podrá ingresar.'}
                </small>
              </span>
            </label>

            {lastLoginAt && (
              <div className="aia-access-meta-note">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  schedule
                </span>
                <span>
                  Último ingreso del estudiante:{' '}
                  <strong>{new Date(lastLoginAt).toLocaleString('es-CO')}</strong>
                </span>
              </div>
            )}

            {feedback && (
              <div className={`aia-access-feedback ${feedback.type}`}>{feedback.text}</div>
            )}

            <div className="aia-access-modal-footer">
              <button
                type="button"
                className="aia-btn-secondary aia-btn-sm"
                onClick={handleCopyShareCard}
                disabled={!studentDoc || accessPin.length < 4}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? '¡Credencial copiada!' : 'Copiar para enviar'}</span>
              </button>

              <div className="aia-access-modal-footer-right">
                <button type="button" className="aia-btn-secondary" onClick={onClose}>
                  Cerrar
                </button>
                <button type="submit" className="aia-btn-primary" disabled={saving}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                    save
                  </span>
                  <span>
                    {saving
                      ? 'Guardando...'
                      : hasExisting
                        ? 'Guardar cambios'
                        : 'Activar acceso'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

