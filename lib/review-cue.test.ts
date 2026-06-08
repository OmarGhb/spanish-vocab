import { describe, it, expect } from 'vitest'
import { verbCue } from './review-cue'
import { canDisplayParadigm } from './conjugator'

describe('verbCue', () => {
  it('always returns the infinitive (the cue, never the answer)', () => {
    expect(verbCue('hablábamos', 'hablar').infinitive).toBe('hablar')
    expect(verbCue('zzz', 'noexiste').infinitive).toBe('noexiste')
  })

  it('derives a single finite tense + person for a trusted regular verb (Spanish labels)', () => {
    // Guard: this fixture relies on hablar being a trusted paradigm.
    expect(canDisplayParadigm('hablar')).toBe(true)
    const cue = verbCue('hablábamos', 'hablar')
    expect(cue.tense).toBe('Imperfecto')
    expect(cue.person).toBe('nosotros')
  })

  it('uses Spanish person labels, not French', () => {
    const cue = verbCue('hablas', 'hablar')
    expect(cue.person).toBe('tú')
    expect(cue.tense).toBe('Presente')
  })

  it('degrades to infinitive-only for an untrusted lemma (never a guessed tense)', () => {
    // An untabled/untrusted lemma must not get a derived tense/person.
    const cue = verbCue('anduvo', 'andar')
    if (!canDisplayParadigm('andar')) {
      expect(cue.tense).toBeNull()
      expect(cue.person).toBeNull()
    }
  })

  it('drops the person when the form is person-ambiguous, keeping the tense', () => {
    // imperfecto yo == él/ella ("hablaba") → person ambiguous, tense still single.
    const cue = verbCue('hablaba', 'hablar')
    expect(cue.tense).toBe('Imperfecto')
    expect(cue.person).toBeNull()
  })
})
