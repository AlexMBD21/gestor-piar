import { useAuth } from '../context/AuthContext';
import { usePiar } from '../context/PiarContext';

export default function CollaborativeSection({ sectionKey, children, className = '' }) {
  const { user, isSuperAdmin } = useAuth();
  const { getActiveStudent, releaseSectionLock } = usePiar();
  const activeStudent = getActiveStudent();

  if (!activeStudent) return <div className={`card ${className}`}>{children}</div>;

  const metadata = activeStudent.data?.sectionMetadata?.[sectionKey];
  const isLocked = metadata && metadata.editor_id !== user?.id && !isSuperAdmin;

  return (
    <div 
      className={`card collaborative-section ${isLocked ? 'section-locked' : ''} ${className}`} 
      style={{ 
        position: 'relative', 
        border: isLocked ? '2px solid var(--danger)' : '1px solid var(--border-color)',
        padding: 0,
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      {isLocked && (
        <div 
          className="section-lock-banner no-print" 
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--danger)',
            padding: '12px 24px',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Sección bloqueada - Llenada por: <strong>{metadata.editor_name}</strong>
          </span>
          <button 
            type="button" 
            className="btn btn-danger btn-sm" 
            onClick={() => releaseSectionLock(activeStudent.id, sectionKey)}
            style={{ 
              padding: '4px 10px', 
              fontSize: '0.75rem', 
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-sm)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🔓 Desbloquear Sección
          </button>
        </div>
      )}
      <fieldset disabled={isLocked} style={{ border: 'none', padding: '32px', margin: 0, width: '100%' }}>
        {children}
      </fieldset>
    </div>
  );
}
