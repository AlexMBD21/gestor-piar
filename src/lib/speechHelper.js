// Utilidad robusta de lectura en voz alta (Web Speech API)
// Ejecuta speak() de forma síncrona dentro del clic del usuario y prioriza voces locales del sistema.

const liveUtterances = new Set();
let isCancelled = false;

function pickSpanishVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const esVoices = voices.filter((v) => String(v.lang || '').toLowerCase().startsWith('es'));
  const pool = esVoices.length > 0 ? esVoices : voices;

  // Priorizar voces locales del sistema (Microsoft Sabina/Helena/Raul en Windows, etc.)
  // porque las voces remotas de Google suelen fallar con synthesis-failed en Chrome.
  const localPool = pool.filter((v) => v.localService);
  const candidates = localPool.length > 0 ? localPool : pool;

  const preferredLangs = ['es-co', 'es-mx', 'es-419', 'es-us', 'es-es'];
  for (const lang of preferredLangs) {
    const match = candidates.find((v) => String(v.lang || '').toLowerCase() === lang);
    if (match) return match;
  }

  return candidates[0] || null;
}

function splitIntoChunks(text = '') {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const rawSentences = cleaned.split(/(?<=[.!?])\s+/);
  const chunks = [];

  for (const sentence of rawSentences) {
    if (sentence.length <= 180) {
      chunks.push(sentence);
    } else {
      const words = sentence.split(' ');
      let current = '';
      for (const word of words) {
        if ((current ? `${current} ${word}` : word).length > 175 && current) {
          chunks.push(current);
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks;
}

export function stopSpeaking() {
  isCancelled = true;
  liveUtterances.clear();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignorar
    }
  }
}

export function speakTextSequence(parts, { rate = 0.96, onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onError) onError('Tu navegador no soporta lectura en voz alta.');
    return;
  }

  const fullText = (Array.isArray(parts) ? parts : [parts]).filter(Boolean).join('. ');
  const chunks = splitIntoChunks(fullText);
  if (chunks.length === 0) {
    if (onEnd) onEnd();
    return;
  }

  const synth = window.speechSynthesis;
  isCancelled = false;
  liveUtterances.clear();

  // Solo cancelar si realmente hay algo hablando o en cola (evita el bug de Chromium)
  if (synth.speaking || synth.pending) {
    try {
      synth.cancel();
    } catch {
      // Ignorar
    }
  }

  let selectedVoice = pickSpanishVoice();
  let triedDefaultFallback = false;
  let idx = 0;

  const speakNext = () => {
    if (isCancelled) return;
    if (idx >= chunks.length) {
      liveUtterances.clear();
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[idx]);
    utterance.lang = selectedVoice?.lang || 'es-ES';
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    liveUtterances.add(utterance);

    utterance.onend = () => {
      liveUtterances.delete(utterance);
      if (isCancelled) return;
      idx += 1;
      speakNext();
    };

    utterance.onerror = (event) => {
      liveUtterances.delete(utterance);
      if (isCancelled) return;
      const errCode = event?.error || 'unknown';
      if (errCode === 'canceled' || errCode === 'interrupted') return;

      // Si falló con la voz seleccionada, reintentar una vez con la voz por defecto del sistema
      if (!triedDefaultFallback && selectedVoice) {
        triedDefaultFallback = true;
        selectedVoice = null;
        speakNext();
        return;
      }

      if (onError) {
        onError(
          `No se pudo reproducir la voz (${errCode}). Verifica que Windows tenga una voz en español instalada o prueba en Microsoft Edge.`
        );
      }
    };

    try {
      if (synth.paused) synth.resume();
      // Llamada síncrona dentro del gesto de clic del usuario
      synth.speak(utterance);
    } catch {
      liveUtterances.delete(utterance);
      if (onError) onError('No se pudo iniciar la lectura en voz alta en este navegador.');
    }
  };

  if (onStart) onStart();
  speakNext();
}
