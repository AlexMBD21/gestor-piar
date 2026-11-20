// Juegos Didácticos Adaptativos (Fase 1)
// La IA solo genera DATOS (JSON) que rellenan plantillas controladas por la app.
// Nunca se ejecuta HTML/JS generado por la IA.

export const GAME_TYPES = {
  memory: { label: 'Memoria de Parejas', icon: 'style', skill: 'Atención y memoria de trabajo' },
  classify: { label: 'Arrastrar y Clasificar', icon: 'category', skill: 'Organización y pensamiento lógico' },
  order: { label: 'Ordenar los Pasos', icon: 'format_list_numbered', skill: 'Funciones ejecutivas y secuenciación' },
  fill: { label: 'Completar la Frase', icon: 'edit_note', skill: 'Comprensión lectora y vocabulario' }
};

const clean = (value, max = 160) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeMemory(g) {
  const pairs = (Array.isArray(g.pairs) ? g.pairs : [])
    .map((p) => ({ term: clean(p?.term, 70), match: clean(p?.match, 110) }))
    .filter((p) => p.term && p.match)
    .slice(0, 6);
  return pairs.length >= 3 ? { pairs } : null;
}

function normalizeClassify(g) {
  const categories = (Array.isArray(g.categories) ? g.categories : [])
    .map((c) => clean(c, 50))
    .filter(Boolean)
    .slice(0, 3);
  if (categories.length < 2) return null;
  const items = (Array.isArray(g.items) ? g.items : [])
    .map((it) => ({ text: clean(it?.text, 110), category: clean(it?.category, 50) }))
    .filter((it) => it.text && categories.includes(it.category))
    .slice(0, 8);
  return items.length >= 4 ? { categories, items } : null;
}

function normalizeOrder(g) {
  const steps = (Array.isArray(g.steps) ? g.steps : [])
    .map((s) => clean(s, 130))
    .filter(Boolean)
    .slice(0, 6);
  return steps.length >= 3 ? { steps } : null;
}

function normalizeFill(g) {
  const sentences = (Array.isArray(g.sentences) ? g.sentences : [])
    .map((s) => {
      const text = clean(s?.text, 220);
      const answer = clean(s?.answer, 50);
      const options = (Array.isArray(s?.options) ? s.options : [])
        .map((o) => clean(o, 50))
        .filter(Boolean)
        .slice(0, 4);
      if (!text.includes('___') || !answer) return null;
      const finalOptions = options.includes(answer) ? options : [answer, ...options].slice(0, 4);
      return finalOptions.length >= 2 ? { text, answer, options: finalOptions } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
  return sentences.length >= 2 ? { sentences } : null;
}

const NORMALIZERS = {
  memory: normalizeMemory,
  classify: normalizeClassify,
  order: normalizeOrder,
  fill: normalizeFill
};

/** Valida y sanea los juegos generados por Gemini. Descarta los que no cumplan la plantilla. */
export function normalizeGames(rawGames) {
  if (!Array.isArray(rawGames)) return [];
  return rawGames
    .map((g, idx) => {
      const type = g?.type;
      if (!NORMALIZERS[type]) return null;
      const data = NORMALIZERS[type](g);
      if (!data) return null;
      return {
        id: `game-${idx + 1}-${type}`,
        type,
        title: clean(g.title, 80) || GAME_TYPES[type].label,
        instructions: clean(g.instructions, 200) || 'Lee con calma y resuelve a tu ritmo.',
        ...data
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

const firstClause = (text, max = 90) => {
  const t = clean(text, 400).replace(/^\d+\.\s*/, '');
  const cut = t.split(/[.:;!?]/)[0] || t;
  return cut.slice(0, max).trim();
};

/**
 * Deriva juegos coherentes a partir del contenido ya generado del paquete
 * (diapositivas, video-guía y examen). Sirve como respaldo local y para paquetes antiguos.
 */
export function deriveGamesFromPackage(pkg) {
  const slides = Array.isArray(pkg?.slides) ? pkg.slides : [];
  const scenes = Array.isArray(pkg?.videoGuide?.scenes) ? pkg.videoGuide.scenes : [];
  const questions = Array.isArray(pkg?.quizQuestions) ? pkg.quizQuestions : [];
  const games = [];

  const pairs = slides
    .filter((s) => s?.badge && s?.keyTakeaway)
    .map((s) => ({ term: clean(s.badge, 60), match: firstClause(s.keyTakeaway, 100) }))
    .filter((p, i, arr) => p.term && p.match && arr.findIndex((x) => x.term === p.term) === i)
    .slice(0, 5);
  if (pairs.length >= 3) {
    games.push({
      type: 'memory',
      title: 'Memoria de las Llaves del Tema',
      instructions: 'Voltea dos tarjetas y une cada idea con su llave para recordar. ¡Sin prisa!',
      pairs
    });
  }

  const steps = scenes.map((sc) => clean(sc?.scaffoldingStep, 120)).filter(Boolean);
  if (steps.length >= 3) {
    games.push({
      type: 'order',
      title: 'Ordena el Procedimiento',
      instructions: 'Organiza los pasos en el orden correcto usando las flechas. Luego pulsa Comprobar.',
      steps
    });
  }

  const goodItems = questions
    .map((q) => clean(q?.options?.[q?.correctIndex], 100))
    .filter(Boolean)
    .slice(0, 4);
  const badItems = questions
    .map((q) => clean((q?.options || []).find((_, i) => i !== q?.correctIndex), 100))
    .filter(Boolean)
    .slice(0, 4);
  if (goodItems.length >= 2 && badItems.length >= 2) {
    games.push({
      type: 'classify',
      title: 'Estrategia Correcta o Error Común',
      instructions: 'Clasifica cada tarjeta: ¿es una buena estrategia o un error que debes evitar?',
      categories: ['Buena estrategia', 'Error común'],
      items: [
        ...goodItems.map((text) => ({ text, category: 'Buena estrategia' })),
        ...badItems.map((text) => ({ text, category: 'Error común' }))
      ]
    });
  }

  const fillCandidates = slides
    .map((s) => clean(s?.keyTakeaway, 200))
    .map((text) => {
      const words = text.split(' ').filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 6);
      if (!words.length) return null;
      const target = words[Math.floor(words.length / 2)];
      const answer = target.replace(/[^\p{L}\p{N}]/gu, '');
      return answer ? { text: text.replace(target, target.replace(answer, '___')), answer } : null;
    })
    .filter(Boolean)
    .slice(0, 4);
  if (fillCandidates.length >= 2) {
    const answerPool = fillCandidates.map((c) => c.answer);
    games.push({
      type: 'fill',
      title: 'Completa las Llaves del Examen',
      instructions: 'Elige la palabra que completa cada frase clave del tema.',
      sentences: fillCandidates.map((c) => ({
        text: c.text,
        answer: c.answer,
        options: shuffleArray([c.answer, ...answerPool.filter((a) => a !== c.answer).slice(0, 2)])
      }))
    });
  }

  return normalizeGames(games);
}

/** Devuelve los juegos del paquete (generados por IA) o derivados de su contenido. */
export function getPackageGames(pkg) {
  const fromAi = normalizeGames(pkg?.games);
  return fromAi.length > 0 ? fromAi : deriveGamesFromPackage(pkg);
}

