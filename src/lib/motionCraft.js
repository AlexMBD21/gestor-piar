// Utilidades compartidas de movimiento (Emil Kowalski Craft + Transitions.dev + GSAP)
// Siempre respeta prefers-reduced-motion y limpia propiedades inline al terminar.
import gsap from 'gsap';

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Ejecuta una transición de vista fluida (transitions.dev / View Transitions API)
 * con fallback instantáneo seguro cuando el navegador no la soporta o el usuario
 * prefiere movimiento reducido.
 */
export function runViewTransition(updateFn) {
  if (typeof updateFn !== 'function') return;
  if (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !prefersReducedMotion()
  ) {
    try {
      document.startViewTransition(() => {
        updateFn();
      });
      return;
    } catch {
      // Fallback directo si la transición es interrumpida
    }
  }
  updateFn();
}

/**
 * Coreografía sutil de entrada con GSAP (gsap.context + revert limpio).
 * @returns {() => void} Función de limpieza para useEffect.
 */
export function animateStaggerIn(containerEl, selector, options = {}) {
  if (!containerEl || prefersReducedMotion()) return () => {};
  const targets = containerEl.querySelectorAll(selector);
  if (!targets || targets.length === 0) return () => {};

  const { y = 10, duration = 0.34, stagger = 0.045, delay = 0 } = options;

  const ctx = gsap.context(() => {
    gsap.fromTo(
      targets,
      { opacity: 0, y },
      {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        delay,
        ease: 'power3.out',
        clearProps: 'transform,opacity'
      }
    );
  }, containerEl);

  return () => ctx.revert();
}

/**
 * Encuentra el contenedor scrolleable más cercano a un elemento (o el documento).
 */
function findScrollContainer(el) {
  let node = el?.parentElement || null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 4) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

/**
 * Desplazamiento suave con curva GSAP (power3.out) hacia un elemento,
 * respetando prefers-reduced-motion y limpiando animaciones previas.
 * @returns {() => void} Función de limpieza.
 */
export function smoothScrollToElement(targetEl, options = {}) {
  if (!targetEl || typeof window === 'undefined') return () => {};
  const { offset = 16, duration = 0.62 } = options;

  if (prefersReducedMotion()) {
    targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
    return () => {};
  }

  const scroller = findScrollContainer(targetEl);
  const isDocScroller =
    scroller === document.scrollingElement ||
    scroller === document.documentElement ||
    scroller === document.body;

  const targetRect = targetEl.getBoundingClientRect();
  const scrollerTop = isDocScroller ? 0 : scroller.getBoundingClientRect().top;
  const currentScroll = isDocScroller ? window.scrollY : scroller.scrollTop;
  const rawGoal = currentScroll + (targetRect.top - scrollerTop) - offset;
  const maxScroll = scroller.scrollHeight - (isDocScroller ? window.innerHeight : scroller.clientHeight);
  const goalScroll = Math.max(0, Math.min(rawGoal, Math.max(0, maxScroll)));

  if (Math.abs(goalScroll - currentScroll) < 4) return () => {};

  const proxy = { y: currentScroll };
  const tween = gsap.to(proxy, {
    y: goalScroll,
    duration,
    ease: 'power3.out',
    onUpdate: () => {
      if (isDocScroller) window.scrollTo(0, proxy.y);
      else scroller.scrollTop = proxy.y;
    }
  });

  return () => tween.kill();
}

/**
 * Entrada táctil y serena para modales.
 * @returns {() => void} Función de limpieza para useEffect.
 */
export function animateModalIn(modalEl) {
  if (!modalEl || prefersReducedMotion()) return () => {};

  const ctx = gsap.context(() => {
    gsap.fromTo(
      modalEl,
      { opacity: 0, scale: 0.96, y: 8 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.22,
        ease: 'power3.out',
        clearProps: 'transform,opacity'
      }
    );
  }, modalEl);

  return () => ctx.revert();
}
