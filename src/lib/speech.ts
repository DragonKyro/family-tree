/**
 * Cantonese pronunciation via the browser's SpeechSynthesis API.
 * Quality varies by OS — macOS Safari has "Sin-ji" (high quality), Chrome on
 * mainstream OSs falls back to a lower-quality yue-HK voice. No backend, no audio files.
 *
 * The picked voice is cached after the first lookup since voices populate async.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined  // undefined = not yet looked up

function pickCantoneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice
  if (!('speechSynthesis' in window)) {
    cachedVoice = null
    return null
  }
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) {
    // Voices not loaded yet — return null this call but DON'T cache so we retry next time.
    return null
  }
  // Prefer explicit Cantonese (yue-*), then HK Chinese (often Cantonese), then Mandarin fallback.
  const score = (v: SpeechSynthesisVoice): number => {
    const lang = v.lang.toLowerCase()
    const name = v.name.toLowerCase()
    if (lang.startsWith('yue')) return 100
    if (/sin-ji|cantonese/.test(name)) return 95
    if (lang === 'zh-hk' || lang === 'zh-hant-hk') return 90
    if (lang.startsWith('zh-hk')) return 85
    if (lang === 'zh-hant') return 50
    if (lang.startsWith('zh')) return 30
    return 0
  }
  const best = voices.reduce<SpeechSynthesisVoice | null>((acc, v) => {
    const s = score(v)
    if (s === 0) return acc
    if (!acc || score(v) > score(acc)) return v
    return acc
  }, null)
  cachedVoice = best
  return best
}

export function speakCantonese(text: string): void {
  if (!('speechSynthesis' in window)) return
  // The string sometimes carries " / " between alternatives — speak the first only,
  // otherwise the TTS renders "slash" or pauses oddly.
  const primary = text.split('/')[0].trim()
  if (!primary) return

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(primary)
  u.lang = 'yue-HK'
  u.rate = 0.85
  const v = pickCantoneseVoice()
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

export function isSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
