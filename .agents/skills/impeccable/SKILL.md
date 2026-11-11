---
name: impeccable
description: >-
  Use this skill to enforce impeccable code quality, zero linter warnings/errors,
  clean architecture, accessibility, and strict state safety across Gestor PIAR,
  while strictly protecting PreviewTab.jsx from unauthorized changes.
---

# Impeccable Code & Quality Standard (Gestor PIAR)

Use this skill whenever writing, refactoring, or reviewing components, hooks, or services in **Gestor PIAR**.

## 1. Regla Inquebrantable: Protección de Vista Previa (`PreviewTab.jsx`)
- **PROHIBIDO modificar `src/components/PreviewTab.jsx`** o las reglas CSS de impresión/exportación (`.piar-official-*`, `.preview-document`, `@media print`) por iniciativa propia.
- El área de Vista Previa tiene un diseño oficial de alta precisión para Word/PDF y **solo puede tocarse bajo instrucción y monitoreo directo del usuario**.

## 2. Cero Errores y Cero Advertencias (`oxlint` & `vitest`)
- Antes de dar por terminada cualquier tarea, verifica siempre:
  1. `npx oxlint <archivos-modificados>` debe reportar **0 warnings y 0 errors**.
  2. No dejar imports sin usar (`no-unused-vars`), parámetros sin usar ni dependencias faltantes o inestables en `useEffect`/`useMemo` (`react-hooks/exhaustive-deps`).
  3. No mezclar exports de funciones utilitarias con componentes React en el mismo archivo si rompe `react(only-export-components)`.
  4. Ejecutar `npm test` para asegurar que la suite de pruebas de Vitest siga en verde.

## 3. Resiliencia de Datos y Offline-First
- Validar siempre valores nulos o indefinidos al leer estructuras anidadas del PIAR (`studentData?.anexo1`, `studentData?.anexo2`, `studentData?.anexo3`).
- Mantener compatibilidad hacia atrás con los PIARs ya almacenados en Supabase y `localforage`.

