import { describe, it, expect } from 'vitest'
import { flatBilingual } from './bilingual'

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
