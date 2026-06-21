import { describe, it, expect } from 'vitest'
import {
  clampCardsPerSession,
  stepCardsPerSession,
  atMinCards,
  atMaxCards,
  MIN_CARDS_PER_SESSION,
  MAX_CARDS_PER_SESSION,
  DEFAULT_CARDS_PER_SESSION,
} from './session-cap'

describe('clampCardsPerSession', () => {
  it('passes through in-range values, rounding to int', () => {
    expect(clampCardsPerSession(20)).toBe(20)
    expect(clampCardsPerSession(33)).toBe(33)
    expect(clampCardsPerSession(20.6)).toBe(21)
  })

  it('clamps to [10, 50]', () => {
    expect(clampCardsPerSession(5)).toBe(MIN_CARDS_PER_SESSION)
    expect(clampCardsPerSession(0)).toBe(MIN_CARDS_PER_SESSION)
    expect(clampCardsPerSession(999)).toBe(MAX_CARDS_PER_SESSION)
  })

  it('falls back to the default for non-finite / missing input', () => {
    expect(clampCardsPerSession(null)).toBe(DEFAULT_CARDS_PER_SESSION)
    expect(clampCardsPerSession(undefined)).toBe(DEFAULT_CARDS_PER_SESSION)
    expect(clampCardsPerSession(NaN)).toBe(DEFAULT_CARDS_PER_SESSION)
    expect(clampCardsPerSession(Infinity)).toBe(DEFAULT_CARDS_PER_SESSION)
  })
})

describe('stepCardsPerSession + edge predicates', () => {
  it('steps by 1 within bounds', () => {
    expect(stepCardsPerSession(20, 1)).toBe(21)
    expect(stepCardsPerSession(20, -1)).toBe(19)
  })

  it('never steps past the edges', () => {
    expect(stepCardsPerSession(MIN_CARDS_PER_SESSION, -1)).toBe(MIN_CARDS_PER_SESSION)
    expect(stepCardsPerSession(MAX_CARDS_PER_SESSION, 1)).toBe(MAX_CARDS_PER_SESSION)
  })

  it('flags the bounds for disabling the buttons', () => {
    expect(atMinCards(MIN_CARDS_PER_SESSION)).toBe(true)
    expect(atMinCards(11)).toBe(false)
    expect(atMaxCards(MAX_CARDS_PER_SESSION)).toBe(true)
    expect(atMaxCards(49)).toBe(false)
  })
})
