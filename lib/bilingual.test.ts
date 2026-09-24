import { describe, it, expect } from 'vitest'
import { flatBilingual, glossFor } from './bilingual'

describe('flatBilingual', () => {
  it('returns a plain string unchanged', () => {
    expect(flatBilingual('hola', 'es')).toBe('hola')
    expect(flatBilingual('bonjour', 'fr')).toBe('bonjour')
  })

  it('picks the requested side from a well-formed bilingual object', () => {
    const v = { es: 'gato', fr: 'chat' }
    expect(flatBilingual(v, 'es')).toBe('gato')
    expect(flatBilingual(v, 'fr')).toBe('chat')
  })

  it('falls back to the other side when the requested one is missing', () => {
    expect(flatBilingual({ es: 'gato' }, 'fr')).toBe('gato')
  })

  it('digs one level into the weak nested shape (the crash case)', () => {
    // Historic pre-M2.5 shape: fr is itself a bilingual object.
    expect(flatBilingual({ es: 'x', fr: { es: 'real', fr: 'vrai' } }, 'fr')).toBe('vrai')
    expect(flatBilingual({ fr: { es: 'solo-es' } }, 'fr')).toBe('solo-es')
  })

  it('returns empty string for null/undefined/empty objects (never an object)', () => {
    expect(flatBilingual(null, 'es')).toBe('')
    expect(flatBilingual(undefined, 'fr')).toBe('')
    expect(flatBilingual({}, 'es')).toBe('')
    expect(flatBilingual({ es: 42 }, 'es')).toBe('')
  })
})

// ── M8 Phase 1a ──────────────────────────────────────────────────────────────────────────────────

describe('flatBilingual is unchanged by Phase 1a (read-path pin)', () => {
  // Every current FR read path goes through flatBilingual (mapCard, review-cloze, discovery-server).
  // Phase 1a adds glossFor ALONGSIDE it and touches nothing here; this table is the proof rather
  // than the assumption. The expected values are the pre-change behavior, written out by hand.
  const table: Array<{ name: string; value: unknown; fr: string; es: string }> = [
    { name: 'plain string', value: 'maison', fr: 'maison', es: 'maison' },
    { name: 'well-formed pair', value: { es: 'casa', fr: 'maison' }, fr: 'maison', es: 'casa' },
    { name: 'missing requested side', value: { es: 'casa' }, fr: 'casa', es: 'casa' },
    { name: 'weak nested under fr', value: { fr: { es: 'casa' } }, fr: 'casa', es: 'casa' },
    { name: 'weak whole-object', value: { es: { es: 'casa', fr: 'maison' } }, fr: 'maison', es: 'casa' },
    { name: 'null', value: null, fr: '', es: '' },
    { name: 'undefined', value: undefined, fr: '', es: '' },
    { name: 'empty object', value: {}, fr: '', es: '' },
    { name: 'number', value: 42, fr: '', es: '' },
  ]

  it('resolves every stored shape exactly as it did before', () => {
    for (const { name, value, fr, es } of table) {
      expect(flatBilingual(value, 'fr'), `${name} @ fr`).toBe(fr)
      expect(flatBilingual(value, 'es'), `${name} @ es`).toBe(es)
    }
  })
})

describe('glossFor — never falls back across source locales', () => {
  it('returns the requested locale side when present', () => {
    expect(glossFor({ es: 'casa', fr: 'maison', en: 'house' }, 'fr')).toBe('maison')
    expect(glossFor({ es: 'casa', fr: 'maison', en: 'house' }, 'en')).toBe('house')
  })

  it('returns EMPTY for a missing locale — never the other language', () => {
    // The bug this helper exists to prevent: an English learner served the French gloss. The caller
    // renders the Spanish side alone when this returns ''.
    expect(glossFor({ es: 'casa', fr: 'maison' }, 'en')).toBe('')
    expect(glossFor({ es: 'casa', en: 'house' }, 'fr')).toBe('')
  })

  it('is NOT flatBilingual with a different argument — the contracts differ', () => {
    // Same input, opposite behavior. flatBilingual's whole job is to fall through to the other side,
    // which is right for the FR/ES pair it was built for and wrong for source locales.
    const frOnly = { es: 'casa', fr: 'maison' }
    expect(flatBilingual(frOnly, 'fr')).toBe('maison')
    expect(glossFor(frOnly, 'en')).toBe('')
  })

  it('never falls back to Spanish either — that is the caller’s job', () => {
    expect(glossFor({ es: 'casa' }, 'fr')).toBe('')
    expect(glossFor({ es: 'casa' }, 'en')).toBe('')
  })

  it('unwraps one level of the weak nested shape, locale-scoped', () => {
    expect(glossFor({ fr: { fr: 'maison' } }, 'fr')).toBe('maison')
    expect(glossFor({ en: { en: 'house' } }, 'en')).toBe('house')
  })

  it('does NOT reach a foreign locale nested under the requested key', () => {
    // { fr: { en: 'house' } } asked for 'en' must not find 'house' — that would be a cross-locale
    // fallback wearing a disguise.
    expect(glossFor({ fr: { en: 'house' } }, 'en')).toBe('')
    expect(glossFor({ en: { fr: 'maison' } }, 'fr')).toBe('')
  })

  it('passes a plain string through (same hardening as flatBilingual)', () => {
    expect(glossFor('maison', 'fr')).toBe('maison')
    expect(glossFor('house', 'en')).toBe('house')
  })

  it('returns empty for null/undefined/empty/non-object (never an object)', () => {
    for (const v of [null, undefined, {}, 42, [], true]) {
      expect(glossFor(v, 'fr')).toBe('')
      expect(glossFor(v, 'en')).toBe('')
    }
  })
})
