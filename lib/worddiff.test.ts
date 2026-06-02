import { describe, expect, it } from 'vitest'
import { wordDiff } from './worddiff'

describe('wordDiff', () => {
  it('all match for identical words (case-insensitive)', () => {
    expect(wordDiff('Estudiar', 'estudiar').every((o) => o.type === 'match')).toBe(true)
  })

  it('marks a substitution', () => {
    // estudiomos → estudiamos: the 7th letter o↔a is a sub, rest match
    const ops = wordDiff('estudiomos', 'estudiamos')
    expect(ops.filter((o) => o.type === 'sub')).toEqual([{ type: 'sub', typed: 'o', correct: 'a' }])
    expect(ops.filter((o) => o.type === 'match')).toHaveLength(9)
  })

  it('marks an extra typed letter as a deletion', () => {
    // bibliotheca → biblioteca: the extra "h" is del
    const ops = wordDiff('bibliotheca', 'biblioteca')
    expect(ops.filter((o) => o.type === 'del')).toEqual([{ type: 'del', typed: 'h' }])
    expect(ops.some((o) => o.type === 'ins' || o.type === 'sub')).toBe(false)
  })

  it('marks a missing letter as an insertion', () => {
    // biblioteca → bibliotheca: a "h" is missing from the typed answer → ins
    const ops = wordDiff('biblioteca', 'bibliotheca')
    expect(ops.filter((o) => o.type === 'ins')).toEqual([{ type: 'ins', correct: 'h' }])
  })
})
