import { describe, it, expect } from 'vitest'
import { blankTargetInDefinition } from './blank-definition'

describe('blankTargetInDefinition', () => {
  it('blanks a plain exact match', () => {
    expect(blankTargetInDefinition('Una palabra es una unidad de lengua.', 'palabra')).toBe(
      'Una _____ es una unidad de lengua.',
    )
  })

  it('blanks the stem and keeps a +s plural suffix', () => {
    expect(blankTargetInDefinition('Conjunto de palabras.', 'palabra')).toBe('Conjunto de _____s.')
  })

  it('blanks the stem and keeps a +es plural suffix', () => {
    expect(blankTargetInDefinition('Muchas flores de colores.', 'flor')).toBe('Muchas _____es de colores.')
  })

  it('passes through when the target does not appear', () => {
    const def = 'Definición que no menciona el objetivo.'
    expect(blankTargetInDefinition(def, 'gato')).toBe(def)
  })

  it('matches an accented headword accent-insensitively (and keeps the plural)', () => {
    expect(blankTargetInDefinition('El pájaro vuela.', 'pájaro')).toBe('El _____ vuela.')
    expect(blankTargetInDefinition('Los pájaros cantan.', 'pájaro')).toBe('Los _____s cantan.')
  })

  it('is case-insensitive', () => {
    expect(blankTargetInDefinition('Palabra al inicio.', 'palabra')).toBe('_____ al inicio.')
  })

  it('does NOT blank a full inflection (corres for correr, comería for comer)', () => {
    expect(blankTargetInDefinition('Tú corres muy rápido.', 'correr')).toBe('Tú corres muy rápido.')
    expect(blankTargetInDefinition('Yo comería algo ahora.', 'comer')).toBe('Yo comería algo ahora.')
  })

  it('does NOT over-blank a longer word sharing the stem (palabrota for palabra)', () => {
    expect(blankTargetInDefinition('Dijo una palabrota fea.', 'palabra')).toBe('Dijo una palabrota fea.')
  })

  it('blanks an exact multi-word headword occurrence', () => {
    expect(blankTargetInDefinition('Algo que ocurre a menudo por aquí.', 'a menudo')).toBe(
      'Algo que ocurre _____ por aquí.',
    )
  })

  it('returns the definition unchanged for an empty word', () => {
    expect(blankTargetInDefinition('Texto cualquiera.', '')).toBe('Texto cualquiera.')
  })

  // FR-gloss leak (v0.12.10): the Spanish headword can appear inside the FRENCH gloss/translation and
  // must be blanked there too — but the FR TRANSLATION of the word is a different stem and must stay.
  it('blanks the Spanish headword when it appears inside a French gloss', () => {
    expect(blankTargetInDefinition('Un recurso est un moyen pour atteindre un but.', 'recurso')).toBe(
      'Un _____ est un moyen pour atteindre un but.',
    )
  })

  it('does NOT blank the French translation of the headword', () => {
    // "ressource" is the legitimate FR gloss of "recurso" — different stem, must stay visible.
    expect(blankTargetInDefinition('Une ressource utile.', 'recurso')).toBe('Une ressource utile.')
  })
})
