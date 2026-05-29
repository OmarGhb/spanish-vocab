import { describe, it, expect } from 'vitest'
import { State } from 'ts-fsrs'
import { getWordStatus, isMemorized, getFamiliarity, isDue, MEMORIZED_STABILITY_DAYS, LEARNING_STABILITY_DAYS } from './word-status'

const PAST = new Date(Date.now() - 86_400_000).toISOString()   // yesterday
const FUTURE = new Date(Date.now() + 86_400_000).toISOString() // tomorrow

function card(state: number, due: string, stability: number) {
  return { state, due, stability }
}

describe('getWordStatus', () => {
  // Branch 1 — Nouveau
  it('null card → Nouveau', () => {
    expect(getWordStatus(null).label).toBe('Nouveau')
  })

  it('State.New with due in past → Nouveau (not À réviser)', () => {
    expect(getWordStatus(card(State.New, PAST, 0)).label).toBe('Nouveau')
  })

  // Branch 2 — À rappeler
  it('State.Relearning → À rappeler', () => {
    expect(getWordStatus(card(State.Relearning, FUTURE, 0)).label).toBe('À rappeler')
  })

  it('State.Relearning with stability >= 30 → À rappeler (not Mémorisé)', () => {
    expect(getWordStatus(card(State.Relearning, FUTURE, MEMORIZED_STABILITY_DAYS)).label).toBe('À rappeler')
  })

  // Branch 3 — À réviser
  it('State.Review with due in past → À réviser', () => {
    expect(getWordStatus(card(State.Review, PAST, 5)).label).toBe('À réviser')
  })

  it('State.Learning with due in past → À réviser', () => {
    expect(getWordStatus(card(State.Learning, PAST, 2)).label).toBe('À réviser')
  })

  // Branch 4 — Mémorisé
  it('stability = 30, due future → Mémorisé', () => {
    expect(getWordStatus(card(State.Review, FUTURE, 30)).label).toBe('Mémorisé')
  })

  it('stability = 30 uses success tone', () => {
    expect(getWordStatus(card(State.Review, FUTURE, 30)).cls).toBe('bg-ok/10 text-ok')
  })

  // Branch 5 — En cours
  it('stability = 7 (lower bound inclusive) → En cours', () => {
    expect(getWordStatus(card(State.Review, FUTURE, LEARNING_STABILITY_DAYS)).label).toBe('En cours')
  })

  it('stability = 29.99 → En cours', () => {
    expect(getWordStatus(card(State.Review, FUTURE, 29.99)).label).toBe('En cours')
  })

  it('En cours uses neutral tone', () => {
    expect(getWordStatus(card(State.Review, FUTURE, 7)).cls).toBe('bg-surface-alt text-muted')
  })

  // Branch 6 — En apprentissage
  it('stability = 6.99 → En apprentissage', () => {
    expect(getWordStatus(card(State.Review, FUTURE, 6.99)).label).toBe('En apprentissage')
  })

  it('State.Learning with due future + low stability → En apprentissage', () => {
    expect(getWordStatus(card(State.Learning, FUTURE, 2)).label).toBe('En apprentissage')
  })

  it('En apprentissage uses neutral tone', () => {
    expect(getWordStatus(card(State.Review, FUTURE, 0)).cls).toBe('bg-surface-alt text-muted')
  })

  // Milestone invariant: overdue memorized card — status and predicate are independent
  it('State.Review + stability >= 30 + due past → À réviser AND isMemorized true', () => {
    const c = card(State.Review, PAST, MEMORIZED_STABILITY_DAYS)
    expect(getWordStatus(c).label).toBe('À réviser')
    expect(isMemorized(c)).toBe(true)
  })
})

describe('isMemorized', () => {
  it('null → false', () => {
    expect(isMemorized(null)).toBe(false)
  })

  it('State.New with stability 0 → false', () => {
    expect(isMemorized(card(State.New, FUTURE, 0))).toBe(false)
  })

  it('State.Relearning with stability >= 30 → false (just-lapsed card excluded)', () => {
    expect(isMemorized(card(State.Relearning, FUTURE, MEMORIZED_STABILITY_DAYS))).toBe(false)
  })

  it('stability < 30 → false', () => {
    expect(isMemorized(card(State.Review, FUTURE, 29.99))).toBe(false)
  })

  it('stability >= 30, State.Review → true', () => {
    expect(isMemorized(card(State.Review, FUTURE, MEMORIZED_STABILITY_DAYS))).toBe(true)
  })

  it('stability >= 30, State.Learning → true', () => {
    expect(isMemorized(card(State.Learning, FUTURE, MEMORIZED_STABILITY_DAYS))).toBe(true)
  })
})

describe('getFamiliarity', () => {
  it('null card → 0', () => {
    expect(getFamiliarity(null)).toBe(0)
  })

  it('State.New → 0 (regardless of stability)', () => {
    expect(getFamiliarity(card(State.New, FUTURE, 100))).toBe(0)
  })

  // Upper band — boundary at 30
  it('stability = 30 (lower bound inclusive) → 3', () => {
    expect(getFamiliarity(card(State.Review, FUTURE, MEMORIZED_STABILITY_DAYS))).toBe(3)
  })

  it('stability = 29.99 → 2', () => {
    expect(getFamiliarity(card(State.Review, FUTURE, 29.99))).toBe(2)
  })

  // Middle band — boundary at 7
  it('stability = 7 (lower bound inclusive) → 2', () => {
    expect(getFamiliarity(card(State.Review, FUTURE, LEARNING_STABILITY_DAYS))).toBe(2)
  })

  it('stability = 6.99 → 1', () => {
    expect(getFamiliarity(card(State.Review, FUTURE, 6.99))).toBe(1)
  })

  it('stability = 0, State.Review → 1 (not 0 — New is the only zero)', () => {
    expect(getFamiliarity(card(State.Review, FUTURE, 0))).toBe(1)
  })

  // Fall-through: Learning/Relearning are NOT special-cased — they use stability bands
  it('State.Learning falls through to stability bands (stability 30 → 3)', () => {
    expect(getFamiliarity(card(State.Learning, PAST, MEMORIZED_STABILITY_DAYS))).toBe(3)
  })

  it('State.Relearning falls through to stability bands (stability 2 → 1)', () => {
    expect(getFamiliarity(card(State.Relearning, FUTURE, 2))).toBe(1)
  })
})

describe('isDue', () => {
  it('null card → false', () => {
    expect(isDue(null)).toBe(false)
  })

  it('due in the past → true', () => {
    expect(isDue(card(State.Review, PAST, 5))).toBe(true)
  })

  it('due in the future → false', () => {
    expect(isDue(card(State.Review, FUTURE, 5))).toBe(false)
  })
})

describe('familiarity / status divergence', () => {
  // The lock: an overdue, well-memorized card is simultaneously "À réviser" by
  // status (due wins) AND familiarity 3 (stability wins). The two are independent.
  it('State.Review + stability >= 30 + due past → "À réviser" AND getFamiliarity 3', () => {
    const c = card(State.Review, PAST, MEMORIZED_STABILITY_DAYS)
    expect(getWordStatus(c).label).toBe('À réviser')
    expect(getFamiliarity(c)).toBe(3)
    expect(isDue(c)).toBe(true)
  })
})
