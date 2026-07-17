// Pure caret-splice for tap-to-insert helpers (the desktop accent row + the mobile scramble tiles).
// Given the controlled value and the input's current selection [start, end], returns the value with
// `ch` inserted (replacing any selection) and the caret position after the inserted text. The DOM
// caret restore (React resets it to the end on a controlled update) lives in useCaretInsert.
export function insertAtCaret(
  value: string,
  start: number,
  end: number,
  ch: string,
): { value: string; caret: number } {
  const s = Math.max(0, Math.min(start, value.length))
  const e = Math.max(s, Math.min(end, value.length))
  return { value: value.slice(0, s) + ch + value.slice(e), caret: s + ch.length }
}
