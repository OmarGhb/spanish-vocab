import { describe, it, expect } from 'vitest'
import { pickSpanishVoice } from './tts-voice'

describe('pickSpanishVoice — Web-Speech fallback gate (Commit B)', () => {
  it('prefers an exact es-ES voice', () => {
    const voices = [{ lang: 'en-US' }, { lang: 'es-MX' }, { lang: 'es-ES' }]
    expect(pickSpanishVoice(voices)?.lang).toBe('es-ES')
  })

  it('falls back to any Spanish variant when es-ES is absent', () => {
    const voices = [{ lang: 'en-GB' }, { lang: 'es-419' }]
    expect(pickSpanishVoice(voices)?.lang).toBe('es-419')
  })

  it('returns undefined when only non-Spanish voices exist → caller must not speak', () => {
    const voices = [{ lang: 'en-US' }, { lang: 'fr-FR' }]
    expect(pickSpanishVoice(voices)).toBeUndefined()
  })

  it('returns undefined for an empty voice list', () => {
    expect(pickSpanishVoice([])).toBeUndefined()
  })
})
