import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { animateModalIn } from '../../lib/motionCraft';

/**
 * Diálogo de confirmación reutilizable (Portal en document.body, cierre con Escape y clic en fondo).
 */
export default function ConfirmModal({
  isOpen,
  titleId,
  icon = 'warning',
  title,
  children,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  confirmIcon,
  confirmVariant = 'danger',
  confirmDisabled = false,
  onCancel,
  onConfirm
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onCancel) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    const revertAnim = animateModalIn(modalRef.current);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      revertAnim();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmClass = confirmVariant === 'primary' ? 'aia-btn-primary' : 'aia-btn-danger';

  return createPortal(
    <div
      className="aia-confirm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onCancel}
    >
      <div
        ref={modalRef}
        className="aia-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aia-confirm-modal-icon">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h3 id={titleId}>{title}</h3>
        <div className="aia-confirm-modal-body">{children}</div>
        <div className="aia-confirm-modal-actions">
          <button
            type="button"
            className="aia-btn-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmIcon && (
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {confirmIcon}
              </span>
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
