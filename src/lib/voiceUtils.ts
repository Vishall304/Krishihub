/**
 * voiceUtils.ts
 * Shared speech-synthesis helpers for KrishiMitra.
 *
 * Responsibilities:
 *  - Strip markdown before TTS
 *  - Configurable per-language speech rate
 *  - Promise-based voice loader (handles voiceschanged async on Chrome)
 *  - Best-voice selector with Marathi/Hindi priority + English fallback
 *  - speakOnce: cancel-and-speak with overlap prevention
 */

export type SpeakLang = 'en' | 'hi' | 'mr'

const VOICE_LANG_MAP: Record<SpeakLang, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
}

// ---------------------------------------------------------------------------
// cleanForVoice
// ---------------------------------------------------------------------------
/**
 * Strip markdown symbols and normalise whitespace so TTS reads naturally.
 */
export function cleanForVoice(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[#_`~>|*•▪■►]/g, ' ')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1') // [label](url) → label
    .replace(/\d+[.)]/g, ' ')             // numbered lists
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, ' ') // fancy bullets
    .replace(/[;:]/g, '. ')
    .replace(/[()]/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// getSpeechRate
// ---------------------------------------------------------------------------
/**
 * Return a comfortable speech rate per language.
 * Marathi/Hindi need ~25% slower pace than English for clarity.
 */
export function getSpeechRate(lang: SpeakLang): number {
  if (lang === 'mr') return 0.72
  if (lang === 'hi') return 0.76
  return 0.86
}

// ---------------------------------------------------------------------------
// loadSpeechVoices
// ---------------------------------------------------------------------------
const VOICES_TIMEOUT_MS = 3000

/**
 * Return available TTS voices.
 * Chrome loads voices asynchronously — this waits for `voiceschanged` if
 * the list is initially empty, with a safety timeout.
 */
export function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) return Promise.resolve(voices)

  return new Promise((resolve) => {
    let resolved = false

    const finish = (v: SpeechSynthesisVoice[]) => {
      if (resolved) return
      resolved = true
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged)
      resolve(v)
    }

    const onChanged = () => {
      const updated = window.speechSynthesis.getVoices()
      if (updated.length > 0) finish(updated)
    }

    window.speechSynthesis.addEventListener('voiceschanged', onChanged)

    // Safety timeout — resolve with whatever is available
    setTimeout(() => finish(window.speechSynthesis.getVoices()), VOICES_TIMEOUT_MS)
  })
}

// ---------------------------------------------------------------------------
// selectVoice
// ---------------------------------------------------------------------------
/**
 * Priority order for voice selection:
 *  1. Exact BCP-47 match            (e.g. "mr-IN")
 *  2. BCP-47 substring match        (e.g. voice.lang contains "mr-IN")
 *  3. Native-language name hint     (e.g. voice.name contains "marathi")
 *  4. Browser-level lang prefix     (e.g. voice.lang starts with "mr")
 *  5. Any English-India voice       (en-IN)
 *  6. First available voice         (last resort)
 */
export function selectVoice(
  voices: SpeechSynthesisVoice[],
  lang: SpeakLang,
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined

  const bcp47 = VOICE_LANG_MAP[lang].toLowerCase() // "mr-in" / "hi-in" / "en-in"
  const nameHint =
    lang === 'mr' ? 'marathi' : lang === 'hi' ? 'hindi' : 'english'

  return (
    voices.find((v) => v.lang.toLowerCase() === bcp47) ??
    voices.find((v) => v.lang.toLowerCase().includes(bcp47)) ??
    voices.find((v) => v.name.toLowerCase().includes(nameHint)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
    voices[0]
  )
}

// ---------------------------------------------------------------------------
// speakOnce
// ---------------------------------------------------------------------------
/**
 * Cancel any active speech, wait a short buffer, then speak `text`.
 *
 * Returns a cleanup function that cancels synthesis — call it in
 * a `useEffect` cleanup or when navigation occurs.
 *
 * @param text     - Raw text (markdown will be stripped automatically)
 * @param lang     - Language code ('en' | 'hi' | 'mr')
 * @param onStart  - Called when utterance starts
 * @param onEnd    - Called when utterance ends or errors
 */
export async function speakOnce(
  text: string,
  lang: SpeakLang,
  onStart?: () => void,
  onEnd?: () => void,
): Promise<() => void> {
  const cancel = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  if (!('speechSynthesis' in window) || !text.trim()) {
    return cancel
  }

  // Cancel any in-progress speech
  window.speechSynthesis.cancel()

  // Small buffer so cancel() doesn't race with the new utterance
  await new Promise<void>((r) => setTimeout(r, 150))

  const utterance = new SpeechSynthesisUtterance(cleanForVoice(text))
  utterance.lang = VOICE_LANG_MAP[lang]
  utterance.rate = getSpeechRate(lang)
  utterance.pitch = 1
  utterance.volume = 1

  // Wire up voice selection
  const voices = await loadSpeechVoices()
  const voice = selectVoice(voices, lang)
  if (voice) utterance.voice = voice

  utterance.onstart = () => onStart?.()
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()

  window.speechSynthesis.speak(utterance)

  return cancel
}
