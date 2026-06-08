import { describe, it, expect } from 'vitest'
import { posAbbrev, posEyebrow } from './discovery'

// posAbbrev is the ONE shared pos→French-abbreviation map both the /words detail and the
// /add card route through (board §3), so they can't drift. Gender must ride in the noun
// abbreviation.
describe('posAbbrev', () => {
  it('keeps the noun gender in the abbreviation', () => {
    expect(posAbbrev('n.m.')).toBe('n.m.')
    expect(posAbbrev('n.f.')).toBe('n.f.')
    expect(posAbbrev('n.m./f.')).toBe('n.m./f.')
  })

  it('francises prep. → prép.', () => {
    expect(posAbbrev('prep.')).toBe('prép.')
  })

  it('collapses the pronominal verb to v.', () => {
    expect(posAbbrev('v.pron.')).toBe('v.')
    expect(posAbbrev('v.')).toBe('v.')
  })

  it('passes identity for adj./adv./pron./interj./conj.', () => {
    for (const p of ['adj.', 'adv.', 'pron.', 'interj.', 'conj.']) {
      expect(posAbbrev(p)).toBe(p)
    }
  })

  it('returns an unknown pos unchanged', () => {
    expect(posAbbrev('xyz.')).toBe('xyz.')
  })
})

// posEyebrow is now discovery-deck-only; it must still use the explicit gender it's given
// (no pos-derivation), since the detail/add cards moved to posAbbrev.
describe('posEyebrow (discovery deck)', () => {
  it('explicit gender drives the NOM suffix', () => {
    expect(posEyebrow('n.m.', 'm')).toBe('NOM · MASCULIN')
    expect(posEyebrow('n.f.', 'f')).toBe('NOM · FÉMININ')
  })

  it('no gender → spelled-out POS label, no suffix', () => {
    expect(posEyebrow('v.', null)).toBe('VERBE')
    expect(posEyebrow('n.m.', null)).toBe('NOM')
  })
})
