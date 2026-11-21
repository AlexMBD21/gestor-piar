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
  const wasHiddenRef = useRef(true);

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
      if (!Array.isArray(sections) || sections.length === 0) return;

      const navEl = navRef.current;
      // Si el componente está en una pestaña oculta (display: none), ignorar eventos de scroll
      if (!navEl || navEl.offsetParent === null) return;

      const viewport = navEl.closest('.main-scroll-viewport');
      const useViewport = Boolean(
        viewport && viewport.scrollHeight > viewport.clientHeight + 2
      );
      const currentScrollY = useViewport
        ? viewport.scrollTop
        : window.pageYOffset || document.documentElement.scrollTop || 0;

      // 1. Si el scroll está cerca del inicio superior, siempre debe ser la primera sección
      if (currentScrollY < 120) {
        if (sections[0]?.id) {
          setActiveSectionId((prev) => (prev !== sections[0].id ? sections[0].id : prev));
        }
        return;
      }

      // 2. Si el scroll ha llegado al final de la página (fondo), activar la última sección
      const isAtBottom = useViewport
        ? viewport.clientHeight + currentScrollY >= viewport.scrollHeight - 60
        : window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 60;
      if (isAtBottom) {
        const lastSec = sections[sections.length - 1];
        if (lastSec?.id) {
          setActiveSectionId((prev) => (prev !== lastSec.id ? lastSec.id : prev));
        }
        return;
      }

      // 3. ScrollSpy preciso mediante getBoundingClientRect en el viewport
      // Trigger a 130px (debajo del header y la barra sticky de secciones)
      const triggerY = 130;
      let matchedSectionId = sections[0].id;

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        if (!sec?.id) continue;
        const el = document.getElementById(sec.id);
        if (!el || el.offsetParent === null) continue;

        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerY) {
          matchedSectionId = sec.id;
        } else {
          // Como las secciones van en orden hacia abajo, si esta sección aún está por debajo del triggerY,
          // la sección activa actual es la anterior
          break;
        }
      }

      if (matchedSectionId) {
        setActiveSectionId((prev) => (prev !== matchedSectionId ? matchedSectionId : prev));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [sections]);

  // Actualizar la posición del indicador deslizante al cambiar de sección activa o redimensionar
  useEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    const timerId = setTimeout(updateIndicator, 60);
    window.addEventListener('resize', updateIndicator);

    let resizeObserver;
    if (navRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          const navEl = navRef.current;
          if (!navEl || navEl.offsetParent === null) {
            wasHiddenRef.current = true;
            return;
          }

          // Si acaba de transicionar de oculto a visible (por ejemplo al cambiar de pestaña)
          if (wasHiddenRef.current) {
            wasHiddenRef.current = false;
            navEl.scrollLeft = 0;
            const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            if (currentScrollY < 120 && Array.isArray(sections) && sections.length > 0) {
              setActiveSectionId(sections[0].id);
            }
          }

          updateIndicator();
        });
      });
      resizeObserver.observe(navRef.current);
    }

    // Observador de mutación para detectar cuando el tab-content contenedor recibe la clase 'active'
    let mutationObserver;
    const tabContentParent = navRef.current?.closest('.tab-content');
    if (tabContentParent && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        if (tabContentParent.classList.contains('active')) {
          wasHiddenRef.current = false;
          const navEl = navRef.current;
          if (navEl) navEl.scrollLeft = 0;
          const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
          if (currentScrollY < 120 && Array.isArray(sections) && sections.length > 0) {
            setActiveSectionId(sections[0].id);
          }
          requestAnimationFrame(updateIndicator);
        } else {
          wasHiddenRef.current = true;
        }
      });
      mutationObserver.observe(tabContentParent, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', updateIndicator);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [updateIndicator, sections]);

  // Asegurar que en pantallas angostas el botón activo sea visible en el contenedor scrolleable horizontalmente
  useEffect(() => {
    const activeBtn = btnRefs.current[activeSectionId];
    const nav = navRef.current;
    if (activeBtn && nav && nav.scrollWidth > nav.clientWidth) {
      const btnLeft = activeBtn.offsetLeft;
      const btnRight = btnLeft + activeBtn.offsetWidth;
      const navScrollLeft = nav.scrollLeft;
      const navVisibleRight = navScrollLeft + nav.clientWidth;

      if (btnLeft < navScrollLeft) {
        nav.scrollTo({ left: Math.max(0, btnLeft - 16), behavior: 'smooth' });
      } else if (btnRight > navVisibleRight) {
        nav.scrollTo({ left: btnRight - nav.clientWidth + 16, behavior: 'smooth' });
      }
    }
  }, [activeSectionId]);

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    setActiveSectionId(sectionId);
    isScrollingRef.current = true;

    // Altura del topbar (46px) + sub-nav de secciones (42px) + margen de respiración (14px)
    const headerOffset = 102;
    const viewport = navRef.current?.closest('.main-scroll-viewport');
    const useViewport = Boolean(
      viewport && window.getComputedStyle(viewport).overflowY === 'auto'
    );
    const elementPosition = el.getBoundingClientRect().top;
    const currentScrollY = useViewport
      ? viewport.scrollTop
      : window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
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
      if (useViewport && viewport) {
        viewport.scrollTo(0, nextY);
      } else {
        window.scrollTo(0, nextY);
      }

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

