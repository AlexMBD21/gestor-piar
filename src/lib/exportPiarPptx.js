// Generador de presentaciones PowerPoint (.pptx) reales desde el contenido del Agente IA PIAR

const ACCENT_HEX = {
  concept: '2563EB',
  steps: '059669',
  comparison: 'D97706',
  example: '7C3AED',
  summary: '0284C7'
};

const VISUAL_TYPES_ORDER = ['concept', 'steps', 'comparison', 'example', 'summary'];

function resolveAccentHex(slide, idx) {
  const key = typeof slide?.visualType === 'string' ? slide.visualType.toLowerCase().trim() : '';
  return ACCENT_HEX[key] || ACCENT_HEX[VISUAL_TYPES_ORDER[idx % VISUAL_TYPES_ORDER.length]] || '2B579A';
}

function cleanTitle(title = '', fallback = '') {
  return String(title || '').replace(/^\d+\.\s*/, '').trim() || fallback;
}

function sanitizeFileSegment(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

/**
 * Compila y descarga un archivo PowerPoint (.pptx) real en formato 16:9
 * usando las diapositivas generadas por el Agente IA del Aula Adaptativa.
 */
export async function exportAdaptivePackageToPptx(pkg) {
  if (!pkg || !Array.isArray(pkg.slides) || pkg.slides.length === 0) {
    throw new Error('No hay diapositivas disponibles para exportar.');
  }

  const mod = await import('pptxgenjs');
  const PptxGenJS = mod.default || mod;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in (16:9)
  pptx.author = 'Gestor PIAR · Aula Adaptativa IA';
  pptx.subject = pkg.subject || 'Refuerzo PIAR';
  pptx.title = `${pkg.subject || 'Aula Adaptativa'} - ${pkg.topic || 'Presentación de Estudio'}`;

  const diag = pkg.studentDiagnosis || {};
  const studentLabel = pkg.studentName || pkg.studentFirstName || 'Estudiante';
  const gradeLabel = pkg.studentGrade ? `Grado ${pkg.studentGrade}` : '';

  // 1. Portada limpia y calmada
  const cover = pptx.addSlide();
  cover.background = { color: 'F8FAFC' };
  cover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.22,
    fill: { color: '2B579A' },
    line: { color: '2B579A' }
  });

  cover.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 0.9,
    w: 3.4,
    h: 0.45,
    fill: { color: 'DBEAFE' },
    line: { color: 'BFDBFE' },
    rectRadius: 0.15
  });
  cover.addText((pkg.subject || 'AULA ADAPTATIVA').toUpperCase(), {
    x: 0.8,
    y: 0.9,
    w: 3.4,
    h: 0.45,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    align: 'center',
    valign: 'middle'
  });

  cover.addText(pkg.topic || 'Guía de Estudio Personalizada', {
    x: 0.8,
    y: 1.65,
    w: 11.7,
    h: 1.5,
    fontSize: 32,
    bold: true,
    color: '0F172A',
    fontFace: 'Calibri',
    valign: 'top'
  });

  cover.addText(
    `Preparado para ${studentLabel}${gradeLabel ? ` · ${gradeLabel}` : ''}`,
    {
      x: 0.8,
      y: 3.3,
      w: 11.5,
      h: 0.45,
      fontSize: 16,
      color: '475569',
      fontFace: 'Calibri'
    }
  );

  if (diag.learningGoal) {
    cover.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 4.15,
      w: 11.7,
      h: 1.25,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', pt: 1 },
      rectRadius: 0.12
    });
    cover.addText('TU META DE HOY', {
      x: 1.05,
      y: 4.3,
      w: 11.2,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: '2B579A'
    });
    cover.addText(diag.learningGoal, {
      x: 1.05,
      y: 4.62,
      w: 11.2,
      h: 0.65,
      fontSize: 15,
      color: '1E293B',
      fontFace: 'Calibri'
    });
  }

  if (diag.superpowerTip) {
    cover.addText(`Consejo de estudio: ${diag.superpowerTip}`, {
      x: 0.8,
      y: 5.75,
      w: 11.7,
      h: 0.8,
      fontSize: 13,
      italic: true,
      color: '475569',
      fontFace: 'Calibri'
    });
  }

  cover.addText('Gestor PIAR · Material de estudio adaptado para repasar a tu ritmo', {
    x: 0.8,
    y: 6.85,
    w: 11.7,
    h: 0.35,
    fontSize: 10,
    color: '64748B'
  });

  // 2. Diapositivas de contenido generadas por el Agente IA
  pkg.slides.forEach((s, idx) => {
    const accent = resolveAccentHex(s, idx);
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Franja superior de color
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.14,
      fill: { color: accent },
      line: { color: accent }
    });

    // Badge y contador
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65,
      y: 0.38,
      w: 3.1,
      h: 0.38,
      fill: { color: 'F1F5F9' },
      line: { color: accent, pt: 0.75 },
      rectRadius: 0.1
    });
    slide.addText((s.badge || `Lámina ${idx + 1}`).toUpperCase(), {
      x: 0.65,
      y: 0.38,
      w: 3.1,
      h: 0.38,
      fontSize: 10,
      bold: true,
      color: accent,
      align: 'center',
      valign: 'middle'
    });

    slide.addText(`${pkg.subject || ''} · Lámina ${idx + 1} de ${pkg.slides.length}`, {
      x: 8.5,
      y: 0.4,
      w: 4.2,
      h: 0.35,
      fontSize: 10,
      color: '64748B',
      align: 'right'
    });

    // Título principal
    slide.addText(cleanTitle(s.title, `Lámina ${idx + 1}`), {
      x: 0.65,
      y: 0.95,
      w: 7.45,
      h: 0.85,
      fontSize: 24,
      bold: true,
      color: '0F172A',
      fontFace: 'Calibri',
      valign: 'top'
    });

    // Explicación principal
    if (s.content) {
      slide.addText(s.content, {
        x: 0.65,
        y: 1.88,
        w: 7.45,
        h: 1.35,
        fontSize: 14.5,
        color: '334155',
        fontFace: 'Calibri',
        valign: 'top'
      });
    }

    // Puntos clave completos (columna izquierda)
    const bullets = Array.isArray(s.bullets) ? s.bullets.filter(Boolean).slice(0, 4) : [];
    if (bullets.length > 0) {
      const bulletRuns = bullets.map((b, bIdx) => ({
        text: `${bIdx + 1}.  ${b}`,
        options: {
          breakLine: true,
          paraSpaceAfter: 10,
          fontSize: 14,
          color: '0F172A',
          bold: false
        }
      }));
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65,
        y: 3.35,
        w: 7.45,
        h: 2.95,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', pt: 1 },
        rectRadius: 0.12
      });
      slide.addText('PUNTOS CLAVE', {
        x: 0.88,
        y: 3.48,
        w: 7.0,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: accent
      });
      slide.addText(bulletRuns, {
        x: 0.88,
        y: 3.82,
        w: 7.0,
        h: 2.35,
        fontFace: 'Calibri',
        valign: 'top'
      });
    }

    // Columna derecha: Analogía Visual + Llave para el examen
    if (s.visualAnalogy) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.4,
        y: 1.0,
        w: 4.3,
        h: 2.45,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', pt: 1 },
        rectRadius: 0.12
      });
      slide.addText('IMAGÍNALO ASÍ (ANALOGÍA)', {
        x: 8.62,
        y: 1.15,
        w: 3.85,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: '475569'
      });
      slide.addText(s.visualAnalogy, {
        x: 8.62,
        y: 1.5,
        w: 3.85,
        h: 1.8,
        fontSize: 13.5,
        color: '1E293B',
        fontFace: 'Calibri',
        valign: 'top'
      });
    }

    if (s.keyTakeaway) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.4,
        y: 3.7,
        w: 4.3,
        h: 2.6,
        fill: { color: 'EFF6FF' },
        line: { color: accent, pt: 1.5 },
        rectRadius: 0.12
      });
      slide.addText('RECUERDA PARA TU EXAMEN', {
        x: 8.62,
        y: 3.86,
        w: 3.85,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: accent
      });
      slide.addText(s.keyTakeaway, {
        x: 8.62,
        y: 4.24,
        w: 3.85,
        h: 1.9,
        fontSize: 15,
        bold: true,
        color: '0F172A',
        fontFace: 'Calibri',
        valign: 'top'
      });
    }

    // Pregunta de autoverificación en el pie + notas del presentador
    if (s.checkQuestion) {
      slide.addText(`Autoverificación: ${s.checkQuestion}`, {
        x: 0.65,
        y: 6.55,
        w: 12.05,
        h: 0.55,
        fontSize: 11.5,
        italic: true,
        color: '475569',
        fontFace: 'Calibri',
        valign: 'middle'
      });
      slide.addNotes(`Pregunta de repaso: ${s.checkQuestion}\nIdea guía: ${s.keyTakeaway || ''}`);
    }
  });

  const subjectSlug = sanitizeFileSegment(pkg.subject || 'Estudio');
  const studentSlug = sanitizeFileSegment(pkg.studentFirstName || pkg.studentName || 'Estudiante');
  const fileName = `PIAR_${subjectSlug}_${studentSlug}.pptx`;

  await pptx.writeFile({ fileName });
  return fileName;
}

