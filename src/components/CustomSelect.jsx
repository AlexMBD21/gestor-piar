import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  style = {},
  id = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Normalizar opciones: soporta ['opcion1', 'opcion2'] o [{ value: '', label: '' }]
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value, label: opt.label || opt.value };
    }
    return { value: opt, label: opt };
  });

  // Encontrar opción seleccionada
  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

  // Actualizar posición flotante del menú con Portal
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownMaxHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight;

    setCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUpward
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera del componente o del dropdown portal
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideTrigger = containerRef.current && containerRef.current.contains(e.target);
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Controlar navegación por teclado
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectOption = (optValue) => {
    if (onChange && typeof onChange === 'function') {
      onChange(optValue);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      style={{ position: 'relative', width: '100%', boxSizing: 'border-box', ...style }}
      id={id}
    >
      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-symbols-outlined custom-select-arrow">
          expand_more
        </span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={`custom-select-dropdown ${coords.openUpward ? 'open-upward' : ''}`}
          role="listbox"
          style={{
            position: 'fixed',
            top: coords.openUpward ? 'auto' : `${coords.top}px`,
            bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999
          }}
        >
          {normalizedOptions.length === 0 ? (
            <div className="custom-select-empty">No hay opciones disponibles</div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined option-check">
                      check
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
