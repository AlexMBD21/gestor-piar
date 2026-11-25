import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

/**
 * Barra superior reutilizable con selector desplegable compacto de asignaturas
 * (compartida entre Supervisión Docente / Modo Espejo y Analítica / Telemetría).
 */
export default function SubjectDock({
  eyebrow,
  currentPkg,
  packages = [],
  onSelectPackage,
  countPillText,
  actions,
  railAriaLabel = 'Seleccionar asignatura',
  renderTabSuffix
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, minWidth: 280, openUpward: false });

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const hasMultiple = packages.length > 1;
  const showSearch = packages.length >= 6;

  const filteredPackages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        String(p.subject || '').toLowerCase().includes(q) ||
        String(p.topic || '').toLowerCase().includes(q)
    );
  }, [packages, searchTerm]);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = Math.min(Math.max(rect.width, 300), window.innerWidth - 24);
      const maxMenuHeight = showSearch ? 340 : 290;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < maxMenuHeight && rect.top > maxMenuHeight;
      const clampedLeft = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));

      setCoords({
        top: openUpward ? rect.top - 6 : rect.bottom + 6,
        left: clampedLeft,
        minWidth: menuWidth,
        openUpward
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, showSearch]);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (showSearch) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }

    const handleClickOutside = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, showSearch]);

  // Sincronizar índice resaltado al abrir o filtrar
  useEffect(() => {
    if (!isOpen) return;
    if (filteredPackages.length === 0) {
      setHighlightedIdx(-1);
      return;
    }
    const activeIdx = filteredPackages.findIndex((p) => p.id === currentPkg?.id);
    setHighlightedIdx(activeIdx >= 0 ? activeIdx : 0);
  }, [filteredPackages, currentPkg?.id, isOpen]);

  if (!currentPkg) return null;

  const isPublished = currentPkg.status === 'published';

  const handleSelect = (pkgId) => {
    onSelectPackage(pkgId);
    setIsOpen(false);
    setSearchTerm('');
    triggerRef.current?.focus();
  };

  const handleListKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredPackages.length > 0) {
        setHighlightedIdx((prev) => (prev + 1) % filteredPackages.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredPackages.length > 0) {
        setHighlightedIdx((prev) => (prev - 1 + filteredPackages.length) % filteredPackages.length);
      }
    } else if (e.key === 'Enter' && highlightedIdx >= 0 && filteredPackages[highlightedIdx]) {
      e.preventDefault();
      handleSelect(filteredPackages[highlightedIdx].id);
    }
  };

  return (
    <div className="aia-mirror-dock">
      <div className="aia-mirror-dock-top">
        <div className="aia-mirror-dock-identity">
          <span className="aia-mirror-dock-eyebrow">{eyebrow}</span>
          <div className="aia-mirror-dock-title-row">
            {hasMultiple ? (
              <button
                ref={triggerRef}
                type="button"
                className={`aia-subject-switcher-trigger ${isOpen ? 'is-open' : ''}`}
                onClick={() => {
                  setIsOpen((prev) => {
                    if (prev) setSearchTerm('');
                    return !prev;
                  });
                }}
                onKeyDown={handleListKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={`${railAriaLabel}: ${currentPkg.subject}`}
                title="Cambiar de asignatura"
              >
                <span
                  className={`aia-mirror-tab-dot ${isPublished ? 'pub' : 'draft'}`}
                  aria-hidden="true"
                />
                <span className="aia-subject-switcher-label">{currentPkg.subject}</span>
                {renderTabSuffix ? renderTabSuffix(currentPkg) : null}
                <span
                  className="material-symbols-outlined aia-subject-switcher-chevron"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </button>
            ) : (
              <h4 className="aia-mirror-dock-subject">{currentPkg.subject}</h4>
            )}

            <span className={`aia-mirror-state-pill ${isPublished ? 'is-published' : 'is-draft'}`}>
              <span className="aia-mirror-state-dot" />
              {isPublished ? 'Publicado al alumno' : 'En supervisión'}
            </span>

            {countPillText && (
              <span className="aia-mirror-count-pill aia-tabular">{countPillText}</span>
            )}
          </div>
        </div>

        {actions && <div className="aia-mirror-dock-actions">{actions}</div>}
      </div>

      {isOpen &&
        hasMultiple &&
        createPortal(
          <div
            ref={menuRef}
            className={`aia-subject-switcher-menu ${coords.openUpward ? 'is-upward' : ''}`}
            style={{
              position: 'fixed',
              top: coords.openUpward ? 'auto' : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              minWidth: `${coords.minWidth}px`,
              maxWidth: 'min(420px, calc(100vw - 24px))',
              zIndex: 99999
            }}
            onKeyDown={handleListKeyDown}
          >
            <div className="aia-subject-switcher-header">
              <span>Asignaturas ({packages.length})</span>
              <span className="aia-subject-switcher-legend">
                <span className="aia-mirror-tab-dot pub" /> Publicada
                <span className="aia-mirror-tab-dot draft" style={{ marginLeft: '8px' }} /> En
                supervisión
              </span>
            </div>

            {showSearch && (
              <div className="aia-subject-switcher-search-wrap">
                <span
                  className="material-symbols-outlined aia-subject-switcher-search-icon"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="aia-subject-switcher-search"
                  placeholder="Filtrar asignatura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Filtrar asignaturas"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="aia-subject-switcher-clear"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      close
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className="aia-subject-switcher-list" role="listbox" aria-label={railAriaLabel}>
              {filteredPackages.length === 0 ? (
                <div className="aia-subject-switcher-empty">
                  No se encontraron asignaturas con &ldquo;{searchTerm}&rdquo;
                </div>
              ) : (
                filteredPackages.map((p, idx) => {
                  const isActive = currentPkg.id === p.id;
                  const isHighlighted = idx === highlightedIdx;
                  const pkgPublished = p.status === 'published';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                      onClick={() => handleSelect(p.id)}
                      className={`aia-subject-switcher-option ${isActive ? 'is-active' : ''} ${
                        isHighlighted ? 'is-highlighted' : ''
                      }`}
                    >
                      <span
                        className={`aia-mirror-tab-dot ${pkgPublished ? 'pub' : 'draft'}`}
                        aria-hidden="true"
                      />
                      <span className="aia-subject-switcher-option-text">
                        <span className="aia-subject-switcher-option-name">{p.subject}</span>
                        {p.topic && (
                          <span className="aia-subject-switcher-option-topic">{p.topic}</span>
                        )}
                      </span>
                      <span className="aia-subject-switcher-option-meta">
                        {renderTabSuffix ? renderTabSuffix(p) : null}
                        {isActive && (
                          <span
                            className="material-symbols-outlined aia-subject-switcher-check"
                            aria-hidden="true"
                          >
                            check
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
