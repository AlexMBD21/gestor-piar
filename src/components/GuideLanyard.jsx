import { useState, useRef, useEffect, useCallback } from 'react';
import './GuideLanyard.css';

/**
 * GuideLanyard
 * Guía de Uso Rápido presentada como un carnet colgante de una cuerda (lanyard).
 * - Oculta tras una viñeta; al hacer clic la cuerda baja y el carnet se despliega.
 * - Física de péndulo (resorte amortiguado): reacciona al pasar el mouse y
 *   se puede arrastrar/soltar para hacerlo balancear.
 */

const STEPS = [
  {
    icon: 'person_add',
    title: '1. Crear Estudiante',
    desc: <>Haz clic en <strong>"+ Nuevo"</strong> para iniciar un registro.</>
  },
  {
    icon: 'edit_note',
    title: '2. Diligenciar Anexos',
    desc: <>Completa los <strong>Anexos 1, 2 y 3</strong> según corresponda.</>
  },
  {
    icon: 'cloud_upload',
    title: '3. Guardar Aportación',
    desc: <>Presiona <strong>"Guardar Aportación"</strong> para sincronizar.</>
  },
  {
    icon: 'download',
    title: '4. Descargar PIAR',
    desc: <>Exporta el documento oficial en <strong>Word</strong> o <strong>PDF</strong>.</>
  }
];

// Parámetros físicos del péndulo
const STIFFNESS = 55;      // rigidez del resorte (mayor = oscila más rápido)
const DAMPING = 3.2;       // amortiguación (mayor = se detiene antes)
const MAX_ANGLE = 4;       // grados: balanceo sutil para no salirse de la columna
const MAX_VELOCITY = 30;   // grados/segundo
const HOVER_FORCE = 0.35;  // impulso por píxel de movimiento del mouse
const SEEN_KEY = 'piar-guide-lanyard-seen';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function GuideLanyard() {
  const [phase, setPhase] = useState('closed'); // closed | open | closing
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  });
  const [dragging, setDragging] = useState(false);

  const swingRef = useRef(null);
  const pivotRef = useRef(null);
  const physics = useRef({ angle: 0, velocity: 0, raf: null, last: 0, dragging: false, lastDragAngle: 0, lastDragTime: 0 });
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const applyTransform = () => {
    if (swingRef.current) {
      swingRef.current.style.transform = `rotate(${physics.current.angle.toFixed(3)}deg)`;
    }
  };

  const step = useCallback((now) => {
    const p = physics.current;
    const dt = Math.min(0.032, (now - (p.last || now)) / 1000);
    p.last = now;

    if (!p.dragging) {
      const accel = -STIFFNESS * p.angle - DAMPING * p.velocity;
      p.velocity += accel * dt;
      p.angle += p.velocity * dt;
      // Rebote suave en el límite para no salirse de la columna
      if (Math.abs(p.angle) > MAX_ANGLE) {
        p.angle = Math.sign(p.angle) * MAX_ANGLE;
        p.velocity *= -0.3;
      }
    }
    applyTransform();

    if (p.dragging || Math.abs(p.angle) > 0.02 || Math.abs(p.velocity) > 0.02) {
      p.raf = requestAnimationFrame(step);
    } else {
      p.angle = 0;
      p.velocity = 0;
      applyTransform();
      p.raf = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    const p = physics.current;
    if (reducedMotion.current) return;
    if (!p.raf) {
      p.last = performance.now();
      p.raf = requestAnimationFrame(step);
    }
  }, [step]);

  const kick = useCallback((impulse) => {
    physics.current.velocity = clamp(physics.current.velocity + impulse, -MAX_VELOCITY, MAX_VELOCITY);
    startLoop();
  }, [startLoop]);

  useEffect(() => () => {
    if (physics.current.raf) cancelAnimationFrame(physics.current.raf);
  }, []);

  // Pequeño balanceo cuando el carnet termina de caer
  useEffect(() => {
    if (phase !== 'open') return;
    const t = setTimeout(() => kick(Math.random() > 0.5 ? 20 : -20), 620);
    return () => clearTimeout(t);
  }, [phase, kick]);

  const toggle = () => {
    if (phase === 'closed') {
      physics.current.angle = 0;
      physics.current.velocity = 0;
      setPhase('open');
      if (!seen) {
        setSeen(true);
        try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* noop */ }
      }
    } else if (phase === 'open') {
      setPhase('closing');
      setTimeout(() => setPhase('closed'), 420);
    }
  };

  // ── Interacción: el mouse empuja el carnet ──
  const handlePointerMove = (e) => {
    const p = physics.current;
    if (p.dragging) {
      const pivot = pivotRef.current?.getBoundingClientRect();
      if (!pivot) return;
      const px = pivot.left + pivot.width / 2;
      const py = pivot.top + pivot.height / 2;
      const dx = e.clientX - px;
      const dy = Math.max(20, e.clientY - py);
      const target = clamp(-Math.atan2(dx, dy) * (180 / Math.PI), -MAX_ANGLE, MAX_ANGLE);
      const now = performance.now();
      const dtDrag = Math.max(0.008, (now - p.lastDragTime) / 1000);
      p.velocity = clamp((target - p.lastDragAngle) / dtDrag, -MAX_VELOCITY, MAX_VELOCITY);
      p.lastDragAngle = target;
      p.lastDragTime = now;
      p.angle = target;
      return;
    }
    if (e.pointerType === 'mouse' && e.movementX) {
      kick(-e.movementX * HOVER_FORCE);
    }
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const p = physics.current;
    p.dragging = true;
    p.lastDragAngle = p.angle;
    p.lastDragTime = performance.now();
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startLoop();
  };

  const endDrag = (e) => {
    const p = physics.current;
    if (!p.dragging) return;
    p.dragging = false;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    startLoop();
  };

  const isVisible = phase !== 'closed';

  return (
    <section
      className={`guide-lanyard phase-${phase}`}
      aria-label="Guía de Uso Rápido"
      id="guide-lanyard"
    >
      {/* Viñeta / gancho superior */}
      <button
        type="button"
        id="btn-guide-lanyard-toggle"
        className="gl-trigger"
        onClick={toggle}
        aria-expanded={phase === 'open'}
        aria-controls="guide-lanyard-card"
      >
        <span className="gl-trigger-icon">
          <span className="material-symbols-outlined">menu_book</span>
          {!seen && <span className="gl-trigger-ping" aria-hidden="true" />}
        </span>
        <span className="gl-trigger-text">
          <span className="gl-trigger-title">Guía de Uso Rápido</span>
          <span className="gl-trigger-hint">
            {phase === 'open' ? 'Toca para recoger' : 'Toca para desplegar'}
          </span>
        </span>
        <span className="material-symbols-outlined gl-trigger-chevron">expand_more</span>
        <span className="gl-eyelet" ref={pivotRef} aria-hidden="true" />
      </button>

      {isVisible && (
        <div className="gl-drop">
          <div className="gl-fall">
          <div
            ref={swingRef}
            className={`gl-swing ${dragging ? 'is-dragging' : ''}`}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* Cuerda */}
            <div className="gl-strap" aria-hidden="true">
              <span className="gl-strap-text">GESTOR PIAR · GESTOR PIAR</span>
            </div>

            {/* Mosquetón metálico */}
            <svg className="gl-clip" viewBox="0 0 32 46" aria-hidden="true">
              <defs>
                <linearGradient id="glMetal" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#8a94a6" />
                  <stop offset="45%" stopColor="#f4f6fa" />
                  <stop offset="100%" stopColor="#6b7486" />
                </linearGradient>
              </defs>
              <rect x="9" y="0" width="14" height="9" rx="2.5" fill="url(#glMetal)" />
              <circle cx="16" cy="15" r="5.5" fill="none" stroke="url(#glMetal)" strokeWidth="3" />
              <path d="M16 20 C 7 22, 7 38, 14 41 L 18 41 C 25 38, 25 26, 19 23"
                fill="none" stroke="url(#glMetal)" strokeWidth="3.2" strokeLinecap="round" />
              <rect x="13.5" y="40" width="5" height="6" rx="1.5" fill="url(#glMetal)" />
            </svg>

            {/* Carnet */}
            <article className="gl-card" id="guide-lanyard-card">
              <span className="gl-card-slot" aria-hidden="true" />
              <header className="gl-card-header">
                <div className="gl-card-avatar">
                  <span className="material-symbols-outlined">school</span>
                </div>
                <div>
                  <h4 className="gl-card-title">Guía de Uso Rápido</h4>
                  <p className="gl-card-subtitle">Plan Individual de Ajustes Razonables</p>
                </div>
              </header>

              <p className="gl-card-intro">
                Selecciona un estudiante de la lista o crea uno nuevo para gestionar su PIAR:
              </p>

              <ol className="gl-steps">
                {STEPS.map((s, i) => (
                  <li key={s.icon} className="gl-step" style={{ '--i': i }}>
                    <span className="gl-step-badge">
                      <span className="material-symbols-outlined">{s.icon}</span>
                    </span>
                    <div className="gl-step-content">
                      <span className="gl-step-title">{s.title}</span>
                      <span className="gl-step-desc">{s.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>

              <footer className="gl-card-footer" aria-hidden="true">
                <span className="gl-barcode" />
                <span className="gl-card-footer-text">PIAR · Decreto 1421/2017</span>
              </footer>
            </article>
          </div>
          </div>
        </div>
      )}
    </section>
  );
}
