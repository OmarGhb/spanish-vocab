import { describe, it, expect } from 'vitest'
import {
  coerceImmersionMode,
  isImmersionMode,
  resolveChrome,
  glossVisibility,
  DEFAULT_IMMERSION_MODE,
  REVIEW_CHROME,
  RATING_LABELS,
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
})

describe('glossVisibility', () => {
  it('maps each mode to its French-gloss treatment', () => {
    expect(glossVisibility('fr_es')).toBe('visible')
    expect(glossVisibility('immersion')).toBe('tap')
    expect(glossVisibility('totale')).toBe('hidden')
  })
})
