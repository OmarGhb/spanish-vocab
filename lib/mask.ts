/**
 * Attempts to mask the target word in a Spanish example sentence.
 *
 * Strategy (tried in order):
 * 1. Exact case-insensitive match — handles capitalization differences
 *    e.g. "Trasnocha" masked when target is "trasnochar"; "El amanecer" masked when target is "amanecer".
 * 2. Stem match — first 4 chars with \b word boundary — handles conjugations and derived forms
 *    e.g. "amanece" masked when target is "amanecer" (stem "aman"); "comieron" masked via "comi".
 *
 * Only the first occurrence is masked (no global flag) to keep the sentence readable.
 * Returns the masked sentence, or null if no match was found.
 * Callers should fall back to MC mode when null is returned.
 */
export function maskSentence(sentence: string, word: string): string | null {
  const trimmed = word.trim()

  // Strategy 1: exact case-insensitive
  const exactEscaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const exactRegex = new RegExp(exactEscaped, 'i')
  if (exactRegex.test(sentence)) {
    return sentence.replace(exactRegex, '_____')
  }

  // Strategy 2: stem match on first 4 chars with word boundary
  // \b ensures we don't partially match inside an unrelated word
  const stem = trimmed.toLowerCase().slice(0, 4)
  if (stem.length >= 4) {
    const stemEscaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const stemRegex = new RegExp(`\\b${stemEscaped}\\S*`, 'i')
    if (stemRegex.test(sentence)) {
      return sentence.replace(stemRegex, '_____')
    }
  }

  // No match — caller should force MC for this card
  return null
}
