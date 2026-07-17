import { describe, it, expect } from 'vitest'
import { blankTargetInDefinition } from './blank-definition'

describe('blankTargetInDefinition', () => {
  it('blanks a plain exact match', () => {
    expect(blankTargetInDefinition('Una palabra es una unidad de lengua.', 'palabra')).toBe(
      'Una ____ es una unidad de lengua.',
    )
  })

  it('blanks the stem and keeps a +s plural suffix', () => {
    expect(blankTargetInDefinition('Conjunto de palabras.', 'palabra')).toBe('Conjunto de ____s.')
  })

  it('blanks the stem and keeps a +es plural suffix', () => {
    expect(blankTargetInDefinition('Muchas flores de colores.', 'flor')).toBe('Muchas ____es de colores.')
  })

  it('passes through when the target does not appear', () => {
    const def = 'Definición que no menciona el objetivo.'
    expect(blankTargetInDefinition(def, 'gato')).toBe(def)
  })

  it('matches an accented headword accent-insensitively (and keeps the plural)', () => {
    expect(blankTargetInDefinition('El pájaro vuela.', 'pájaro')).toBe('El ____ vuela.')
    expect(blankTargetInDefinition('Los pájaros cantan.', 'pájaro')).toBe('Los ____s cantan.')
  })

  it('is case-insensitive', () => {
    expect(blankTargetInDefinition('Palabra al inicio.', 'palabra')).toBe('____ al inicio.')
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
      'Algo que ocurre ____ por aquí.',
    )
  })

  it('returns the definition unchanged for an empty word', () => {
    expect(blankTargetInDefinition('Texto cualquiera.', '')).toBe('Texto cualquiera.')
  })
})
