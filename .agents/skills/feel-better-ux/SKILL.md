---
name: feel-better-ux
description: >-
  Use this skill to apply Feel Better UX principles: cognitive calm, logical grouping,
  compact information density without clutter, clear visual hierarchy, and supportive
  neuro-inclusive design for both teachers and PIAR students (excluding PreviewTab.jsx).
---

# Feel Better UX — Calm, Compact & Logical Design

Use this skill to audit, compact, and logically organize screens in **Gestor PIAR** (especially Aula IA Docente y Portal del Estudiante), eliminating visual noise and cognitive overload (never touching `PreviewTab.jsx`).

## 1. Compactación Inteligente y Organización Lógica
- **Una sola idea por bloque**: Evitar repetir la misma información en 2 o 3 lugares (ej. datos ya visibles en la cabecera no deben repetirse en tarjetas redundantes).
- **Flujo natural de lectura (arriba -> abajo, izquierda -> derecha)**:
  1. Contexto activo (Estudiante + Acceso) en una barra compacta.
  2. Acción principal clara (Generar / Estudiar) sin párrafos largos ni banners inflados.
  3. Resultados / Materias organizados en lista compacta escaneable.
- **Eliminar wrappers innecesarios**: Reducir padding excesivo, bordes dobles y subtítulos repetitivos para que quepa más contenido útil en un solo pantallazo (above the fold).

## 2. Calma Cognitiva e Inclusión (PIAR / DUA)
- **Para el docente**: Escaneo rápido en 2 segundos — saber qué estudiante está activo, qué materias existen, cuáles están publicadas y qué acción sigue.
- **Para el estudiante**: Espacio sereno, botones grandes y claros, progreso visible sin abrumar, retroalimentación positiva y cero distracciones visuales.

## 3. Control de Calidad UX/UI
- Verificar contraste WCAG AA en modo claro y oscuro (`body.dark-mode`).
- Verificar responsive en móvil, tablet y escritorio sin desbordamiento horizontal.
- Cada elemento interactivo debe parecer interactivo (affordance clara) y cada etiqueta estática debe parecer estática.
