import { useState, useEffect, useRef, useCallback } from 'react';

// Formateador de etiqueta para extraer el texto sin el prefijo numérico
function getLabelText(label) {
  if (!label || typeof label !== 'string') return '';
  return label.replace(/^\d+\.\s*/, '');
}

export default function AnexoQuickNav({ sections, ariaLabel }) {
  const [activeSectionId, setActiveSectionId] = useState(() => (Array.isArray(sections) && sections[0]?.id) || '');
  const navRef = useRef(null);
  const btnRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const scrollAnimRef = useRef(null);

  // Sincronizar activeSectionId si sections cambia o el id actual no existe en la lista
  useEffect(() => {
    if (Array.isArray(sections) && sections.length > 0) {
      if (!sections.some((s) => s.id === activeSectionId)) {
        setActiveSectionId(sections[0].id);
      }
    }
  }, [sections, activeSectionId]);

  const updateIndicator = useCallback(() => {
    const activeBtn = btnRefs.current[activeSectionId];
    const nav = navRef.current;
    if (activeBtn && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      
      // Si el contenedor está oculto (display: none), no calcular
      if (navRect.width === 0 || btnRect.width === 0) return;

      const left = btnRect.left - navRect.left + nav.scrollLeft;
      const width = btnRect.width;
      setIndicatorStyle({
        left,
        width,
        opacity: 1
      });
    }
  }, [activeSectionId]);

  useEffect(() => {
    const handleScroll = () => {
      // Si el usuario acaba de hacer clic en un botón, no sobreescribir durante la animación de scroll
      if (isScrollingRef.current) return;
      if (!Array.isArray(sections)) return;

      // ScrollSpy: identificar qué sección está visible actualmente
      const scrollPosition = window.scrollY + 160;
      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        if (!sec?.id) continue;
        const el = document.getElementById(sec.id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSectionId(sec.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [sections]);

  // Actualizar la posición del indicador deslizante al cambiar de sección activa o redimensionar
  useEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);

    let resizeObserver;
    if (navRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        // Envolver en requestAnimationFrame para evitar errores de 'ResizeObserver loop limit exceeded'
        requestAnimationFrame(() => {
          updateIndicator();
        });
      });
      resizeObserver.observe(navRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateIndicator]);

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    setActiveSectionId(sectionId);
    isScrollingRef.current = true;

    // Altura del topbar (46px) + sub-nav de secciones (42px) + margen de respiración (14px)
    const headerOffset = 102;
    const elementPosition = el.getBoundingClientRect().top;
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const targetY = Math.max(0, elementPosition + currentScrollY - headerOffset);

    // Cancelar animación anterior si aún estaba en curso
    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
    }

    const startY = currentScrollY;
    const distance = targetY - startY;
    
    // Si la distancia es insignificante, solo resaltar
    if (Math.abs(distance) < 4) {
      isScrollingRef.current = false;
      el.classList.remove('section-target-highlight');
      void el.offsetWidth;
      el.classList.add('section-target-highlight');
      setTimeout(() => el.classList.remove('section-target-highlight'), 1300);
      return;
    }

    // Duración proporcional y cinemática (entre 500ms y 850ms para un traslado agradable y visible)
    const duration = Math.min(850, Math.max(500, Math.abs(distance) * 0.45));
    const startTime = performance.now();

    // Curva cinemática ultra-suave (easeInOutCubic: aceleración gradual y desaceleración orgánica)
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      const nextY = startY + distance * ease;
      window.scrollTo(0, nextY);

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
        isScrollingRef.current = false;

        // Efecto visual de llegada suave en el contenedor de la sección
        el.classList.remove('section-target-highlight');
        void el.offsetWidth;
        el.classList.add('section-target-highlight');
        setTimeout(() => el.classList.remove('section-target-highlight'), 1300);
      }
    }

    scrollAnimRef.current = requestAnimationFrame(step);

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, duration + 100);
  };

  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      className="anexo-quick-nav form-quick-nav no-print"
      aria-label={ariaLabel}
    >
      {/* Indicador deslizante suave que se desplaza hacia la sección activa */}
      <span
        className="anexo-quick-nav-indicator"
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
          display: indicatorStyle.width > 0 ? 'block' : 'none'
        }}
        aria-hidden="true"
      />

      {sections.map((sec, idx) => {
        const isActive = activeSectionId === sec.id;
        const labelText = getLabelText(sec?.label);
        return (
          <button
            key={sec.id}
            ref={(el) => {
              if (el) btnRefs.current[sec.id] = el;
            }}
            type="button"
            className={`anexo-quick-nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => scrollToSection(sec.id)}
          >
            <span className="anexo-quick-nav-step">{idx + 1}</span>
            <span className="material-symbols-outlined anexo-quick-nav-icon">{sec.icon}</span>
            <span className="anexo-quick-nav-label">{labelText}</span>
          </button>
        );
      })}
    </nav>
  );
}

