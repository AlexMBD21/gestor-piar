---
name: ui-design-pro
description: >-
  Use this skill when designing, styling, or improving the UX/UI of forms, modals,
  dashboards, navigation, and interactive components in Gestor PIAR (excluding PreviewTab.jsx).
---

# UI Design Pro — UX/UI System for Gestor PIAR

Use this skill to apply professional UX/UI standards across the Gestor PIAR application while respecting its design tokens and protecting the official document preview.

## 1. Exclusión Estricta: No tocar `PreviewTab.jsx`
- **NUNCA modifiques `src/components/PreviewTab.jsx`** ni los estilos del documento oficial imprimible cuando apliques mejoras UX/UI. Toda mejora visual se aplica únicamente a la interfaz de la aplicación (`Dashboard`, `Sidebar`, `LoginPage`, `AdminPage`, `Anexo1Form`, `Anexo2Form`, `Anexo3Form`, `AjustesTable`, modales y controles interactivos).

## 2. Sistema de Diseño y Tokens CSS
- Utilizar siempre las variables del tema definidas en `src/index.css`:
  - Colores: `var(--primary)`, `var(--bg-app)`, `var(--bg-card)`, `var(--bg-input)`, `var(--text-main)`, `var(--text-muted)`, `var(--border-color)`, `var(--danger)`, `var(--warning)`, `var(--tertiary)`.
  - Radios y sombras consistentes (`var(--radius-md)`, bordes sutiles, contraste legible tanto en modo claro como en modo oscuro `darkMode`).

## 3. Principios UX/UI para Formularios Educativos (PIAR)
- **Reducción de carga cognitiva**: Preferir selectores inteligentes (`CustomSelect`), pestañas por trimestre, chips/etiquetas asociativas y ayudas contextuales breves en lugar de bloques largos de texto.
- **Feedback visual inmediato**: Estados claros de `:hover`, `:focus-visible`, carga (`disabled`, spinners), modales con animación suave de entrada/salida y confirmación antes de acciones destructivas.
- **Diseño Responsivo (Desktop & Mobile)**: Asegurar que las tablas interactivas (`mobile-card-table-wrapper`), cabeceras de tarjetas (`card-title-container`) y grillas (`form-grid-2`, `form-grid-3`, `form-grid-4`) se adapten limpiamente sin desbordamientos horizontales.
- **Accesibilidad**: Asociar siempre `<label>` claros, `title` descriptivos en botones de ícono y soporte de teclado (`Enter` / `Escape` en modales e inputs).

