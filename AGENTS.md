# Reglas del Proyecto: Gestor PIAR

## 1. Protección Estricta de la Vista Previa (`PreviewTab.jsx`)
- **NO TOCAR `src/components/PreviewTab.jsx`** ni las clases de impresión/exportación del documento oficial (`.preview-document`, `.piar-official-table`, `.piar-official-header`) en mejoras generales de código o UX/UI.
- Cualquier cambio en `PreviewTab.jsx` se realizará **exclusivamente al final y bajo monitoreo e instrucción explícita del usuario**.

## 2. Skills y Agentes Activos en el Proyecto
1. **Impeccable (`.agents/skills/impeccable/SKILL.md`)**:
   - Código impecable con **0 errores y 0 advertencias** en `oxlint`.
   - Resiliencia ante datos opcionales/vacíos, compatibilidad con Supabase y almacenamiento local (`localforage`).
2. **UI Design Pro UX/UI (`.agents/skills/ui-design-pro/SKILL.md`)**:
   - Experiencia de usuario fluida, moderna, accesible y responsiva (modo claro y oscuro) en todos los formularios, tablas interactivas, paneles y modales de la aplicación (exceptuando `PreviewTab.jsx`).
3. **Emil Kowalski Craft (`.agents/skills/emil-kowalski-craft/SKILL.md`)**:
   - Micro-interacciones táctiles (`scale(0.97)`), curvas `cubic-bezier(0.22, 1, 0.36, 1)`, alineación óptica, `.aia-tabular` y soporte estricto de `prefers-reduced-motion`.
4. **Transitions.dev (`.agents/skills/transitions-dev/SKILL.md`)**:
   - Transiciones fluidas entre vistas/pestañas (`View Transitions API` con fallback seguro), acordeones y modales sin saltos de layout.
5. **GSAP Motion (`.agents/skills/gsap-motion/SKILL.md`)**:
   - Coreografía de entradas sutiles con `gsap.context()` y limpieza automática (`ctx.revert()` + `clearProps`).
6. **Feel Better UX (`.agents/skills/feel-better-ux/SKILL.md`)**:
   - Compactación inteligente, organización lógica, calma cognitiva (DUA/PIAR) y eliminación de redundancias visuales.

