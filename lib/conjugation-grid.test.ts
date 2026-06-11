import { describe, it, expect } from 'vitest'
import { resolveGridTense, buildConjugationGrid, buildConjugationGridForTense } from './conjugation-grid'

describe('resolveGridTense', () => {
  it('maps the standard pedagogical Spanish tense names', () => {
    expect(resolveGridTense('Estudiar — 1ª pers. singular, presente de indicativo')).toBe('presente')
    expect(resolveGridTense('Estudiar — 1ª pers. singular, pretérito perfecto simple')).toBe('preterito')
    expect(resolveGridTense('Estudiar — pretérito indefinido')).toBe('preterito')
    expect(resolveGridTense('Estudiar — futuro simple')).toBe('futuro')
    expect(resolveGridTense('Estudiar — condicional simple')).toBe('condicional')
    expect(resolveGridTense('Estudiar — presente de subjuntivo')).toBe('subjPresente')
  })

  it('resolves "pretérito imperfecto de indicativo" to imperfecto, not preterito', () => {
    expect(resolveGridTense('Creer — 2ª pers. singular, pretérito imperfecto de indicativo')).toBe('imperfecto')
  })

  it('is accent- and case-tolerant', () => {
    expect(resolveGridTense('PRETERITO PERFECTO SIMPLE')).toBe('preterito')
    expect(resolveGridTense('preterito imperfecto')).toBe('imperfecto')
  })

  it('returns null for non-finite / imperative / compound / non-present subjunctive', () => {
    expect(resolveGridTense('Estudiar — imperativo afirmativo')).toBeNull()
    expect(resolveGridTense('Estudiar — gerundio')).toBeNull()
    expect(resolveGridTense('Estudiar — participio')).toBeNull()
    expect(resolveGridTense('Estudiar — pretérito perfecto compuesto')).toBeNull()
    expect(resolveGridTense('Estudiar — pretérito imperfecto de subjuntivo')).toBeNull()
    expect(resolveGridTense(null)).toBeNull()
    expect(resolveGridTense('')).toBeNull()
    expect(resolveGridTense('quelque chose sans temps')).toBeNull()
  })
})

describe('buildConjugationGrid', () => {
  const PRET = 'Estudiar — 1ª pers. singular, pretérito perfecto simple'

  it('builds the full six-cell paradigm with the typed cell highlighted', () => {
    const grid = buildConjugationGrid('estudiar', 'estudié', PRET)
    expect(grid).not.toBeNull()
    expect(grid!.tense).toBe('preterito')
    expect(grid!.labelEs).toBe('Pretérito indefinido')
    expect(grid!.glossFr).toBe('passé simple')
    expect(grid!.cells.map((c) => c.surface)).toEqual([
      'estudié', 'estudiaste', 'estudió', 'estudiamos', 'estudiasteis', 'estudiaron',
    ])
    expect(grid!.cells.filter((c) => c.highlighted).map((c) => c.person)).toEqual(['yo'])
  })

  it('matches the typed surface accent-tolerantly but DISPLAYS the accented cell (logró/logro)', () => {
    // typed without accent "estudio" under preterito → highlights "estudió" (él), shown accented.
    const grid = buildConjugationGrid('estudiar', 'estudio', PRET)
    expect(grid).not.toBeNull()
    const hot = grid!.cells.filter((c) => c.highlighted)
    expect(hot.map((c) => c.person)).toEqual(['él'])
    expect(hot[0].surface).toBe('estudió')
  })

  it('highlights BOTH yo and él/ella for a syncretic form (imperfecto estudiaba)', () => {
    const grid = buildConjugationGrid(
      'estudiar',
      'estudiaba',
      'Estudiar — pretérito imperfecto de indicativo',
    )
    expect(grid).not.toBeNull()
    expect(grid!.tense).toBe('imperfecto')
    expect(grid!.cells.filter((c) => c.highlighted).map((c) => c.person)).toEqual(['yo', 'él'])
  })

  it('strips a leading reflexive clitic to highlight the bare cell (me acuesto → acuesto)', () => {
    const grid = buildConjugationGrid(
      'acostarse',
      'me acuesto',
      'Acostarse — 1ª pers. singular, presente de indicativo',
    )
    expect(grid).not.toBeNull()
    const hot = grid!.cells.filter((c) => c.highlighted)
    expect(hot.map((c) => c.person)).toEqual(['yo'])
    expect(hot[0].surface).toBe('acuesto')
  })

  it('returns null when the surface matches no cell of the resolved tense (incoherent grid)', () => {
    // "estudiando" (gerundio) is not a presente cell → no grid rather than an unhighlighted one.
    const grid = buildConjugationGrid('estudiar', 'estudiando', 'Estudiar — presente de indicativo')
    expect(grid).toBeNull()
  })

  it('returns null for an untabled/uncertain verb (never shows a guessed paradigm)', () => {
    expect(buildConjugationGrid('conocer', 'conocí', 'Conocer — pretérito perfecto simple')).toBeNull()
    expect(buildConjugationGrid('andar', 'anduve', 'Andar — pretérito perfecto simple')).toBeNull()
  })

  it('returns null when the tense is unresolvable or non-finite', () => {
    expect(buildConjugationGrid('estudiar', 'estudiar', null)).toBeNull()
    expect(buildConjugationGrid('estudiar', 'estudiando', 'Estudiar — gerundio')).toBeNull()
    expect(buildConjugationGrid('estudiar', 'estudia', 'Estudiar — imperativo afirmativo')).toBeNull()
  })
})

describe('buildConjugationGridForTense (drill — tense + person known)', () => {
  it('builds the 2×3 grid and highlights only the asked person', () => {
    const grid = buildConjugationGridForTense('ir', 'preterito', 'nosotros')
    expect(grid).not.toBeNull()
    expect(grid!.labelEs).toBe('Pretérito indefinido')
    const hot = grid!.cells.filter((c) => c.highlighted)
    expect(hot).toHaveLength(1)
    expect(hot[0].person).toBe('nosotros')
    expect(hot[0].surface).toBe('fuimos')
  })

  it('returns null for an untabled verb (never a guessed paradigm) or a non-grid tense', () => {
    expect(buildConjugationGridForTense('conocer', 'presente', 'yo')).toBeNull()
    expect(buildConjugationGridForTense('hablar', 'imperativoAfirmativo', 'tú')).toBeNull()
  })
})
