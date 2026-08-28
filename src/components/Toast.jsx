export default function Toast({ message, type = 'success', duration = 3500 }) {
  const iconSuccess = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
  
  const iconWarning = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );

  const iconDanger = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  );

  let icon = iconSuccess;
  if (type === 'warning') icon = iconWarning;
  else if (type === 'danger') icon = iconDanger;

  return (
    <div className={`toast ${type}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
        {icon}
        <span>{message}</span>
      </div>
      <div 
        className="toast-progress-bar" 
        style={{ animationDuration: `${duration}ms` }} 
      />
    </div>
  );
}
