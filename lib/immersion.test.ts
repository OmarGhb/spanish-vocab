import { describe, it, expect } from 'vitest'
import {
  coerceImmersionMode,
  isImmersionMode,
  resolveChrome,
  glossVisibility,
  DEFAULT_IMMERSION_MODE,
  REVIEW_CHROME,
  RATING_LABELS,
  DISCOVER_CHROME,
  NAV_CHROME,
  HOME_CHROME,
  STATUS_CHROME,
  WORDS_CHROME,
  DETAIL_CHROME,
  DRILL_CHROME,
} from './immersion'

describe('coerceImmersionMode / isImmersionMode', () => {
  it('accepts the three valid modes', () => {
    expect(isImmersionMode('fr_es')).toBe(true)
    expect(isImmersionMode('immersion')).toBe(true)
    expect(isImmersionMode('totale')).toBe(true)
  })
  it('coerces anything invalid to the default (fr_es)', () => {
    expect(DEFAULT_IMMERSION_MODE).toBe('fr_es')
    expect(coerceImmersionMode(undefined)).toBe('fr_es')
    expect(coerceImmersionMode(null)).toBe('fr_es')
    expect(coerceImmersionMode('EN')).toBe('fr_es')
    expect(coerceImmersionMode(42)).toBe('fr_es')
    expect(coerceImmersionMode('immersion')).toBe('immersion')
  })
})

describe('resolveChrome', () => {
  const pair = { fr: 'Valider', es: 'Comprobar' }

  it('returns French in fr_es and Spanish in immersion/totale', () => {
    expect(resolveChrome(pair, 'fr_es')).toBe('Valider')
    expect(resolveChrome(pair, 'immersion')).toBe('Comprobar')
    expect(resolveChrome(pair, 'totale')).toBe('Comprobar')
  })

  it('falls back to French when the Spanish is not authored (in every mode)', () => {
    const gap = { fr: 'Choisissez la bonne réponse' }
    expect(resolveChrome(gap, 'fr_es')).toBe('Choisissez la bonne réponse')
    expect(resolveChrome(gap, 'immersion')).toBe('Choisissez la bonne réponse')
    expect(resolveChrome(gap, 'totale')).toBe('Choisissez la bonne réponse')
  })

  it('keeps the authored Review pairs byte-identical in fr_es', () => {
    expect(resolveChrome(REVIEW_CHROME.blankInstruction, 'fr_es')).toBe('Complétez la phrase')
    expect(resolveChrome(REVIEW_CHROME.submit, 'fr_es')).toBe('Valider')
    expect(resolveChrome(REVIEW_CHROME.revealGloss, 'fr_es')).toBe('Voir en français')
    expect(resolveChrome(REVIEW_CHROME.blankInstruction, 'immersion')).toBe('Completa la frase')
    expect(resolveChrome(REVIEW_CHROME.revealGloss, 'totale')).toBe('Ver traducción')
  })

  it('has authored Spanish for every Review chrome pair (no fallbacks left on this surface)', () => {
    for (const pair of Object.values(REVIEW_CHROME)) {
      expect(pair.es).toBeTruthy()
      expect(resolveChrome(pair, 'immersion')).toBe(pair.es)
    }
  })

  it('resolves the shared rating lexicon (fr_es vs Spanish)', () => {
    expect(resolveChrome(RATING_LABELS[1], 'fr_es')).toBe('À revoir')
    expect(resolveChrome(RATING_LABELS[1], 'immersion')).toBe('Otra vez')
    expect(resolveChrome(RATING_LABELS[4], 'immersion')).toBe('Fácil')
    expect(resolveChrome(RATING_LABELS[3], 'totale')).toBe('Bien')
  })

  it('has authored Spanish for every Discover chrome pair (no French holes)', () => {
    for (const pair of Object.values(DISCOVER_CHROME)) {
      expect(pair.es).toBeTruthy()
      expect(resolveChrome(pair, 'immersion')).toBe(pair.es)
    }
    expect(resolveChrome(DISCOVER_CHROME.title, 'fr_es')).toBe('Découvrir')
    expect(resolveChrome(DISCOVER_CHROME.cardReveal, 'immersion')).toBe('Toca para traducir')
    expect(resolveChrome(DISCOVER_CHROME.knowStamp, 'totale')).toBe('Ya la sé')
  })

  it('has authored Spanish for every M6.1c chrome pair (no French holes)', () => {
    const maps = { NAV_CHROME, HOME_CHROME, STATUS_CHROME, WORDS_CHROME, DETAIL_CHROME }
    for (const [name, map] of Object.entries(maps)) {
      for (const [key, pair] of Object.entries(map)) {
        expect(pair.es, `${name}.${key} missing es`).toBeTruthy()
        expect(resolveChrome(pair, 'immersion')).toBe(pair.es)
        expect(resolveChrome(pair, 'fr_es')).toBe(pair.fr)
      }
    }
    expect(resolveChrome(NAV_CHROME.review, 'immersion')).toBe('Repaso')
    expect(resolveChrome(STATUS_CHROME.memorise, 'totale')).toBe('Memorizado')
    expect(resolveChrome(DETAIL_CHROME.relearn, 'immersion')).toBe('Volver a repasar')
  })

  it('has authored Spanish for every Drill chrome pair (M6.1d-i)', () => {
    for (const pair of Object.values(DRILL_CHROME)) {
      expect(pair.es).toBeTruthy()
      expect(resolveChrome(pair, 'fr_es')).toBe(pair.fr)
    }
    expect(resolveChrome(DRILL_CHROME.start, 'immersion')).toBe('Empezar')
    expect(resolveChrome(DRILL_CHROME.wasAnswer, 'totale')).toBe('Era')
  })
})

describe('glossVisibility', () => {
  it('maps each mode to its French-gloss treatment', () => {
    expect(glossVisibility('fr_es')).toBe('visible')
    expect(glossVisibility('immersion')).toBe('tap')
    expect(glossVisibility('totale')).toBe('hidden')
  })
})
