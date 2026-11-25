---
name: emil-kowalski-craft
description: >-
  Use this skill to apply Emil Kowalski's interface craft principles: tactile micro-interactions,
  natural easing curves, spring-like feedback, interruptible transitions, optical alignment,
  and restrained purposeful motion across Gestor PIAR (excluding PreviewTab.jsx).
---

# Emil Kowalski — Interface Craft & Micro-Interactions

Use this skill whenever crafting interactive controls, buttons, tabs, accordions, drawers, modals, and cards in **Gestor PIAR** (never touching `PreviewTab.jsx`).

## 1. Principios de Movimiento con Propósito
- **Animar únicamente propiedades GPU-composited**: `transform` y `opacity` (evitar animar `width`, `height`, `top`, `left` o `margin` cuando exista alternativa sin reflow).
- **Curvas de aceleración naturales**:
  - Salidas / entradas suaves (`ease-out-expo` / `ease-out-quart`): `cubic-bezier(0.22, 1, 0.36, 1)` o `cubic-bezier(0.16, 1, 0.3, 1)`.
  - Duraciones ágiles: `150ms–220ms` para micro-interacciones (botones, toggles, pills), `240ms–320ms` para paneles, modales y tabs. Nunca animaciones lentas (> 400ms) que bloqueen al usuario.
- **Feedback táctil inmediato**:
  - Todo botón o control interactivo responde al clic con `:active { transform: scale(0.97); }`.
  - Hover sutil sin saltos bruscos (`translateY(-1px)` máximo y transición de borde/sombra suave).

## 2. Detalle Óptico y Claridad Visual
- **Alineación óptica y jerarquía**: Íconos y textos centrados ópticamente, números con `font-variant-numeric: tabular-nums` (`.aia-tabular`) para evitar saltos horizontales al cambiar porcentajes o contadores.
- **Bordes nítidos y superficies limpias**: Usar bordes sutiles de 1px con contraste equilibrado, evitando cajas anidadas innecesarias ("card-inside-card-inside-card").
- **Estados accesibles**: `:focus-visible` limpio con `outline: 2px solid var(--primary); outline-offset: 2px;`.

## 3. Respeto Estricto a `prefers-reduced-motion`
- Toda animación o transición debe degradarse elegantemente bajo `@media (prefers-reduced-motion: reduce)` para proteger a estudiantes y docentes sensibles al movimiento.
