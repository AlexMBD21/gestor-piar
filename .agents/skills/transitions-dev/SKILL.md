---
name: transitions-dev
description: >-
  Use this skill to implement fluid state and view transitions (transitions.dev patterns):
  smooth tab switches, accordion reveals, modal entrance/exit, layout continuity,
  and zero-jank View Transitions API fallbacks in Gestor PIAR (excluding PreviewTab.jsx).
---

# Transitions.dev — Fluid UI & View Transitions

Use this skill for view switches, sub-tab navigation, subject selection, accordion expand/collapse, and modal/overlay choreography in **Gestor PIAR** (never touching `PreviewTab.jsx`).

## 1. Continuidad Espacial entre Vistas
- **Transiciones de vista (View Transitions API con fallback seguro)**:
  - Cuando el usuario cambia entre sub-vistas (ej. Estudio Docente <-> Supervisión <-> Analítica, o Portada Mi Aula <-> Espacio de Estudio), usar `document.startViewTransition` cuando esté disponible y `prefers-reduced-motion` no esté activo, con fallback inmediato sin errores en navegadores sin soporte.
- **Indicadores deslizantes y cambios de estado fluidos**:
  - Controles segmentados y tabs deben sentirse continuos, nunca con parpadeos bruscos ni saltos de scroll.

## 2. Entradas y Salidas Orquestadas
- **Modales y diálogos**: Entrada con `opacity: 0 -> 1` y `scale(0.96) translateY(6px) -> scale(1) translateY(0)` en `200ms–240ms`.
- **Acordeones y paneles desplegables**: Transición limpia sin saltos de layout, manteniendo el encabezado fijo y predecible.
- **Cero layout shift (CLS)**: Reservar alturas mínimas y dimensiones de botones/badges para que los cambios de estado (ej. Generando / Publicado / Pausado) no muevan elementos vecinos.
