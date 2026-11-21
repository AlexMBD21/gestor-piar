import { useState, useEffect, useRef, useCallback } from 'react';

// Formateador de etiqueta para extraer el texto sin el prefijo numérico
function getLabelText(label) {
  if (!label || typeof label !== 'string') return '';
  return label.replace(/^\d+\.\s*/, '');
}

export default function AnexoQuickNav({ sections, ariaLabel }) {
  const [activeSectionId, setActiveSectionId] = useState(
    () => (Array.isArray(sections) && sections[0]?.id) || ''
  );
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

  const computeActiveSectionFromScroll = useCallback(() => {
    if (isScrollingRef.current) return;
    if (!Array.isArray(sections) || sections.length === 0) return;

    const navEl = navRef.current;
    if (!navEl) return;

    // Si pertenece a una pestaña inactiva (display: none), ignorar
    const tabParent = navEl.closest('.tab-content');
    if (tabParent && !tabParent.classList.contains('active')) return;
    if (navEl.getClientRects().length === 0) return;

    const viewport = navEl.closest('.main-scroll-viewport');
    const useViewport = Boolean(
      viewport && viewport.scrollHeight > viewport.clientHeight + 2
    );
    const currentScrollY = useViewport
      ? viewport.scrollTop
      : window.pageYOffset || document.documentElement.scrollTop || 0;

    // 1. Si está en el tope inicial del formulario, activar la primera sección
    if (currentScrollY <= 36) {
      if (sections[0]?.id) {
        setActiveSectionId((prev) => (prev !== sections[0].id ? sections[0].id : prev));
      }
      return;
    }

    // 2. Si llegó al final inferior del scroll, activar la última sección
    const isAtBottom = useViewport
      ? viewport.clientHeight + currentScrollY >= viewport.scrollHeight - 40
      : window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 40;
    if (isAtBottom) {
      const lastSec = sections[sections.length - 1];
      if (lastSec?.id) {
        setActiveSectionId((prev) => (prev !== lastSec.id ? lastSec.id : prev));
      }
      return;
    }

    // 3. ScrollSpy reactivo: línea de lectura activa debajo de la barra sticky (QuickNav)
    const navRect = navEl.getBoundingClientRect();
    const navBottom = navRect.bottom > 0 ? navRect.bottom : 88;
    const triggerY = navBottom + 155;
    let matchedSectionId = sections[0].id;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec?.id) continue;
      const el = document.getElementById(sec.id);
      if (!el || el.getClientRects().length === 0) continue;

      const rect = el.getBoundingClientRect();
      if (rect.top <= triggerY) {
        matchedSectionId = sec.id;
      } else {
        break;
      }
    }

    if (matchedSectionId) {
      setActiveSectionId((prev) => (prev !== matchedSectionId ? matchedSectionId : prev));
    }
  }, [sections]);

  useEffect(() => {
    const navEl = navRef.current;
    const viewport = navEl?.closest('.main-scroll-viewport') || document.querySelector('.main-scroll-viewport');

    const cancelProgrammaticScrollOnUserInput = () => {
      if (isScrollingRef.current) {
        if (scrollAnimRef.current) {
          cancelAnimationFrame(scrollAnimRef.current);
          scrollAnimRef.current = null;
        }
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        isScrollingRef.current = false;
      }
    };

    if (viewport) {
      viewport.addEventListener('scroll', computeActiveSectionFromScroll, { passive: true });
      viewport.addEventListener('wheel', cancelProgrammaticScrollOnUserInput, { passive: true });
      viewport.addEventListener('touchmove', cancelProgrammaticScrollOnUserInput, { passive: true });
    }
    window.addEventListener('scroll', computeActiveSectionFromScroll, { passive: true, capture: true });
    window.addEventListener('wheel', cancelProgrammaticScrollOnUserInput, { passive: true });
    window.addEventListener('touchmove', cancelProgrammaticScrollOnUserInput, { passive: true });

    computeActiveSectionFromScroll();

    return () => {
      if (viewport) {
        viewport.removeEventListener('scroll', computeActiveSectionFromScroll);
        viewport.removeEventListener('wheel', cancelProgrammaticScrollOnUserInput);
        viewport.removeEventListener('touchmove', cancelProgrammaticScrollOnUserInput);
      }
      window.removeEventListener('scroll', computeActiveSectionFromScroll, { capture: true });
      window.removeEventListener('wheel', cancelProgrammaticScrollOnUserInput);
      window.removeEventListener('touchmove', cancelProgrammaticScrollOnUserInput);
    };
  }, [computeActiveSectionFromScroll]);

  // Actualizar la posición de la pastilla deslizante cuando cambia activeSectionId
  useEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    const timerId = setTimeout(updateIndicator, 60);
    window.addEventListener('resize', updateIndicator);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [updateIndicator]);

  // Observar cambios de tamaño y activación de pestaña sin reiniciar activeSectionId durante el scroll
  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return undefined;

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          updateIndicator();
        });
      });
      resizeObserver.observe(navEl);
    }

    let mutationObserver;
    const tabContentParent = navEl.closest('.tab-content');
    if (tabContentParent && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        if (tabContentParent.classList.contains('active')) {
          navEl.scrollLeft = 0;
          computeActiveSectionFromScroll();
          requestAnimationFrame(updateIndicator);
        }
      });
      mutationObserver.observe(tabContentParent, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [updateIndicator, computeActiveSectionFromScroll]);

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

    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
    }

    const startY = currentScrollY;
    const distance = targetY - startY;

    if (Math.abs(distance) < 4) {
      isScrollingRef.current = false;
      el.classList.remove('section-target-highlight');
      void el.offsetWidth;
      el.classList.add('section-target-highlight');
      setTimeout(() => el.classList.remove('section-target-highlight'), 1300);
      return;
    }

    const duration = Math.min(750, Math.max(420, Math.abs(distance) * 0.42));
    const startTime = performance.now();

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
    }, duration + 80);
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
