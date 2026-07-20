import { describe, it, expect } from 'vitest'
import { resolveHomeState } from './home-state'

describe('resolveHomeState', () => {
  it('routes the hero by due then has-reviewed-before', () => {
    // Anything due → active hero, regardless of history.
    expect(resolveHomeState({ wordCount: 50, dueCount: 7, hasReviewedBefore: true }).hero).toBe('due')
    expect(resolveHomeState({ wordCount: 3, dueCount: 1, hasReviewedBefore: false }).hero).toBe('due')
    // 0 due, has reviewed → caught up (Durmiendo).
    expect(resolveHomeState({ wordCount: 50, dueCount: 0, hasReviewedBefore: true }).hero).toBe('caughtUp')
    // 0 due, never reviewed → before-first-review (Animando).
    expect(resolveHomeState({ wordCount: 4, dueCount: 0, hasReviewedBefore: false }).hero).toBe('firstReview')
    expect(resolveHomeState({ wordCount: 0, dueCount: 0, hasReviewedBefore: false }).hero).toBe('firstReview')
  })

  it('routes the collection by word count then has-reviewed-before', () => {
    expect(resolveHomeState({ wordCount: 0, dueCount: 0, hasReviewedBefore: false }).collection).toBe('empty')
    // Empty wins even on the (impossible-in-practice) reviewed-but-no-words case.
    expect(resolveHomeState({ wordCount: 0, dueCount: 0, hasReviewedBefore: true }).collection).toBe('empty')
    expect(resolveHomeState({ wordCount: 4, dueCount: 0, hasReviewedBefore: false }).collection).toBe('young')
    expect(resolveHomeState({ wordCount: 170, dueCount: 3, hasReviewedBefore: true }).collection).toBe('established')
  })

  it('routes both axes to "preparing" when words are kept-but-not-yet-promoted (fresh onboarding)', () => {
    // 0 promoted words, 0 due (no review cards yet), never reviewed, but 14 kept + enriching.
    expect(resolveHomeState({ wordCount: 0, dueCount: 0, hasReviewedBefore: false, preparingCount: 14 })).toEqual({
      hero: 'preparing',
      collection: 'preparing',
    })
  })

  it('firstReview / empty only when genuinely zero words AND nothing preparing', () => {
    expect(resolveHomeState({ wordCount: 0, dueCount: 0, hasReviewedBefore: false, preparingCount: 0 }).hero).toBe('firstReview')
    expect(resolveHomeState({ wordCount: 0, dueCount: 0, hasReviewedBefore: false, preparingCount: 0 }).collection).toBe('empty')
    // preparingCount defaults to 0 when omitted (back-compat).
    expect(resolveHomeState({ wordCount: 0, dueCount: 0, hasReviewedBefore: false }).collection).toBe('empty')
  })

  it('real words win over preparing (partial: some promoted + stragglers still kept)', () => {
    // A ready collection stays ready; the poller pulls the stragglers in — no preparing copy here.
    expect(resolveHomeState({ wordCount: 6, dueCount: 6, hasReviewedBefore: false, preparingCount: 3 })).toEqual({
      hero: 'due',
      collection: 'young',
    })
  })

  it('resolves hero and collection independently (new account with due words)', () => {
    // Just-added first words are due immediately but the account has never reviewed:
    // active hero + young collection — both honest, not collapsed onto one axis.
    expect(resolveHomeState({ wordCount: 3, dueCount: 3, hasReviewedBefore: false })).toEqual({
      hero: 'due',
      collection: 'young',
    })
  })
})
