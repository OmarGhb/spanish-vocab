import { describe, it, expect } from 'vitest'
import { insertAtCaret } from './caret'

describe('insertAtCaret', () => {
  it('inserts at a caret in the middle', () => {
    // "caa" with caret after "ca" (index 2), insert "s" → "casa", caret 3
    expect(insertAtCaret('caa', 2, 2, 's')).toEqual({ value: 'casa', caret: 3 })
  })

  it('appends at the end', () => {
    expect(insertAtCaret('cas', 3, 3, 'a')).toEqual({ value: 'casa', caret: 4 })
  })

  it('inserts into an empty value', () => {
    expect(insertAtCaret('', 0, 0, 'c')).toEqual({ value: 'c', caret: 1 })
  })

  it('replaces a selection range', () => {
    // "caXYa" with "XY" selected [2,4], insert "s" → "casa", caret 3
    expect(insertAtCaret('caXYa', 2, 4, 's')).toEqual({ value: 'casa', caret: 3 })
  })

  it('inserts an accented char verbatim', () => {
    expect(insertAtCaret('caf', 3, 3, 'é')).toEqual({ value: 'café', caret: 4 })
  })

  it('clamps out-of-range / stale selection indices', () => {
    // start beyond length → append at end
    expect(insertAtCaret('ab', 9, 9, 'c')).toEqual({ value: 'abc', caret: 3 })
    // negative start → treated as 0
    expect(insertAtCaret('ab', -3, -3, 'c')).toEqual({ value: 'cab', caret: 1 })
    // end < start → collapses to a caret at start (no negative slice)
    expect(insertAtCaret('abcd', 3, 1, 'x')).toEqual({ value: 'abcxd', caret: 4 })
  })
})
