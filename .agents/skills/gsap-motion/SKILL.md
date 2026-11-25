---
name: gsap-motion
description: >-
  Use this skill to orchestrate smooth, hardware-accelerated GSAP animations in React
  using gsap.context() for clean unmounting, subtle card staggers, progress fills,
  and reduced-motion compliance across Gestor PIAR (excluding PreviewTab.jsx).
---

# GSAP Motion — Orchestrated React Choreography

Use this skill when adding orchestrated entrances, staggered bento/subject grids, smooth KPI reveals, or panel choreography with **GSAP** in React components of **Gestor PIAR** (excluding `PreviewTab.jsx`).

## 1. Patrón Seguro en React (`gsap.context`)
- Encapsular siempre las animaciones dentro de `useEffect` / `useLayoutEffect` con `gsap.context(() => { ... }, containerRef)` y ejecutar `ctx.revert()` en el cleanup para evitar fugas de memoria o conflictos con React StrictMode.
- Respetar siempre `window.matchMedia('(prefers-reduced-motion: reduce)').matches`: si el usuario prefiere movimiento reducido, omitir animaciones de desplazamiento/stagger y dejar el contenido visible de inmediato.

## 2. Coreografía Sutil y Profesional (Sin Excesos)
- **Staggers breves**: `stagger: 0.04` a `0.06`, `duration: 0.32` a `0.42`, desplazamiento sutil `y: 10` a `14`, `ease: 'power3.out'`.
- **`clearProps: 'transform,opacity'`**: Limpiar propiedades inline al terminar (`clearProps: 'transform'`) para no interferir con `:hover`, `:active` ni `position: fixed` en modales hijos.
- **No animar en cada re-render**: Usar refs o dependencias estables (ej. `activeSubTab`, `activeStudent?.id`, `selectedPkgId`) para que la animación corra únicamente al entrar a una vista o cambiar de contexto.
