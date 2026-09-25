import { paradigm, isConjugable, normalize, type Tense, type Person } from './conjugator'

export const BLANK = '_____'

export type VerbTarget = { surface: string; tense: Tense; person: Person | null }

// Function words a paradigm form accent-folds onto (dé→de, sé→se, está→esta, estás→estas, él→el,
// té→te, mí→mi, tú→tu, sí→si, más→mas, aún→aun, sólo→solo). When a sentence token matches the
// paradigm ONLY via accent-folding and the bare token is one of these, it's the function word,
// not the verb — so the masker must skip it (require an accent-EXACT hit for these) and keep
// scanning for the genuine verb form. Without this, e.g. dar masks the preposition "de" in
// "…película de terror me dio…" instead of "dio". Affects écriture too (no cue-gate there).
const HOMOGRAPH_DENYLIST = new Set([
  'de', 'se', 'el', 'te', 'mi', 'tu', 'si', 'mas', 'esta', 'estas', 'aun', 'solo',
])

/**
 * Verb-aware masking (M5.3a). Blanks the first sentence token that is a member of `lemma`'s
 * conjugation paradigm — so it masks the *contextually-correct conjugated form* actually in the
 * sentence (estudiamos, creció, even dio/fue whose stem differs from the infinitive — which the
 * 4-char stem heuristic missed and dropped to MC). The captured {tense, person} feeds the
 * in-question hint with no stored data (derive-on-the-fly).
 *
 * Returns the masked sentence + the blanked token's grammatical coordinates, or null when no
 * paradigm token is found (caller falls back to maskSentence, then MC). Tokenizes on whitespace
 * and strips surrounding punctuation for the membership test (the rendered blank still drops the
 * whole token, matching maskSentence's single-blank behaviour).
 */
export function maskVerbSentence(sentence: string, lemma: string): { masked: string; target: VerbTarget } | null {
  if (!isConjugable(lemma)) return null

  // Two lookups: an accent-preserving one (case-insensitive) for ACCURATE coordinate recovery
  // — "logró" (pret. él) and "logro" (pres. yo) are distinct keys here — and an accent-folded
  // one as a tolerant fallback. The authored sentence token always carries its accent, so the
  // exact map resolves the right {tense, person}; folding alone would conflate the two.
  const exact = new Map<string, VerbTarget>()
  const folded = new Map<string, VerbTarget>()
  for (const entry of paradigm(lemma)) {
    const ek = entry.surface.toLowerCase()
    const fk = normalize(entry.surface)
    if (!exact.has(ek)) exact.set(ek, entry)
    if (!folded.has(fk)) folded.set(fk, entry)
  }

  const tokens = sentence.split(/\s+/)
  for (let i = 0; i < tokens.length; i++) {
    // Strip leading/trailing punctuation (¿¡"«» . , ; : ! ? …) for the membership test.
    const bare = tokens[i].replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    if (!bare) continue
    const lower = bare.toLowerCase()
    // Never select a function-word homograph as the verb form. The denylist holds the UNACCENTED
    // function words (de/se/esta…); the accented verb forms (dé/está/estás…) are not in it, so a
    // genuine accented form in the sentence still masks. This also guards the conjugator's
    // unaccented usted-imperative table entries ("de"/"esta") — which sit in the exact map and
    // would otherwise blank the preposition/demonstrative (e.g. dar masking "de" in "…de terror…").
    if (HOMOGRAPH_DENYLIST.has(lower)) continue
    const hit = exact.get(lower) ?? folded.get(normalize(bare))
    if (hit) {
      const masked = tokens.map((t, j) => (j === i ? t.replace(bare, BLANK) : t)).join(' ')
      return { masked, target: { surface: bare, tense: hit.tense, person: hit.person } }
    }
  }
  return null
}

// Mask the bare INFINITIVE token specifically (L1, écriture form-coherence). For an infinitive-STORED
// verb, so the écriture answer equals the stored headword instead of some conjugation that happens to
// appear earlier in the sentence — "Los aficionados gritaron para gritar más" masks "gritar", NOT the
// earlier "gritaron". Whole-token match (accent/case-tolerant) so it never blanks a substring of a
// future form (the token "gritaré" ≠ "gritar"). Returns null when the sentence has no bare-infinitive
// occurrence (caller falls through to the existing conjugation masking). `lemma` is the infinitive,
// passed with its -se for reflexives (matches the bare reflexive infinitive "levantarse").
export function maskInfinitive(sentence: string, lemma: string): { masked: string; target: VerbTarget } | null {
  const infLower = lemma.toLowerCase()
  const infFolded = normalize(lemma)
  // Only fire for an ACTUAL infinitive (ends in -ar/-er/-ir, + enclitic reflexive) — guards against a
  // gerund/participle stored as the headword ("saltando"), which must NOT be mislabeled 'infinitivo'.
  if (!/(ar|er|ir)(se)?$/.test(infFolded)) return null
  const tokens = sentence.split(/\s+/)
  for (let i = 0; i < tokens.length; i++) {
    const bare = tokens[i].replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    if (!bare) continue
    if (bare.toLowerCase() === infLower || normalize(bare) === infFolded) {
      const masked = tokens.map((t, j) => (j === i ? t.replace(bare, BLANK) : t)).join(' ')
      return { masked, target: { surface: bare, tense: 'infinitivo', person: null } }
    }
  }
  return null
}

const REFLEX_CLITICS = new Set(['me', 'te', 'se', 'nos', 'os'])

/**
 * Clitic-aware masking for a proclitic-reflexive STORED word ("te levantas"). The conjugator's
 * paradigm yields the BARE verb form ("levantas"), so plain maskVerbSentence masks only the verb,
 * leaving target.surface ("levantas") ≠ the stored word ("te levantas") → chooseQcmCue routes the
 * card to definition-MCQ (lemma-def + tú-form options — the reflexive complaint). Here we mask the
 * full "clitic + verb" UNIT and set target.surface to the stored form, so the cloze blank equals
 * the word and the (full-reflexive) distractor options → coherent cloze-MCQ; écriture blanks the
 * full unit too. Reuses the homograph-hardened maskVerbSentence to locate the verb + its
 * {tense, person}; `lemma` is passed RAW (paradigm/isConjugable strip -se internally — no manual
 * strip, conjugator untouched). Returns null when `word` is not a proclitic reflexive, or the verb
 * can't be located (legacy lemma-null cards before backfill → graceful: caller falls back and the
 * card simply stays definition-MCQ, so there's no broken window before the lemma backfill).
 */
export function maskProcliticReflexive(
  sentence: string,
  word: string,
  lemma: string,
): { masked: string; target: VerbTarget } | null {
  const m = word.trim().match(/^(me|te|se|nos|os)\s+(\S+)$/iu)
  if (!m) return null
  const verbN = normalize(m[2])

  // Locate the finite verb + coordinates via the (#2-hardened) verb masker. The clitic "te"/"se"
  // is denylisted there, so it is never chosen AS the verb — only the verb token is, which is
  // exactly what we extend leftward below. That is the #1 × #2 composition.
  const vr = maskVerbSentence(sentence, lemma)
  if (!vr || normalize(vr.target.surface) !== verbN) return null

  const tokens = sentence.split(/\s+/)
  for (let i = 1; i < tokens.length; i++) {
    const bare = tokens[i].replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    if (normalize(bare) !== normalize(vr.target.surface)) continue
    if (!REFLEX_CLITICS.has(tokens[i - 1].toLowerCase())) return null
    // Drop the clitic token (i-1) and blank the verb token (i) → one unit.
    const out: string[] = []
    for (let j = 0; j < tokens.length; j++) {
      if (j === i - 1) continue
      out.push(j === i ? tokens[j].replace(bare, BLANK) : tokens[j])
    }
    return {
      masked: out.join(' '),
      target: { surface: `${tokens[i - 1]} ${bare}`, tense: vr.target.tense, person: vr.target.person },
    }
  }
  return null
}

/**
 * Attempts to mask the target word in a Spanish example sentence (non-verb path + verb fallback).
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
// The form actually blanked, alongside the masked sentence. `surface` is what a learner must type
// — which is NOT always the headword: gender agreement ("sano" → "sana") and enclitic imperatives
// ("ponerse" → "Ponte") both blank a different form. Callers that grade an answer must use it, or
// they mark correct Spanish wrong (roadmap 8d review).
// `strategy` records WHICH rule matched, so callers can adopt the new S3/S4 behaviour without
// silently changing S1/S2. Roadmap 8d deliberately ships S3/S4 grading first; extending it to S2
// (whose stem match blanks a whole token, e.g. a plural) is a listed behaviour change awaiting
// review, not a refactor.
export type MaskStrategy = 'exact' | 'stem4' | 'folded' | 'stem-inflect'
export type MaskedWord = { masked: string; surface: string; strategy: MaskStrategy }

// Back-compat entry point: the masked sentence alone. Kept because most callers and every existing
// test only care about the sentence; grading callers use maskSentenceWithToken.
export function maskSentence(sentence: string, word: string, pos?: string): string | null {
  return maskSentenceWithToken(sentence, word, pos)?.masked ?? null
}

export function maskSentenceWithToken(sentence: string, word: string, pos?: string): MaskedWord | null {
  const trimmed = word.trim()

  // Strategy 1: exact case-insensitive
  const exactEscaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const exactRegex = new RegExp(exactEscaped, 'i')
  const exactHit = sentence.match(exactRegex)
  if (exactHit) {
    return { masked: sentence.replace(exactRegex, BLANK), surface: exactHit[0], strategy: 'exact' }
  }

  // Strategy 2: stem match on first 4 chars with word boundary
  // \b ensures we don't partially match inside an unrelated word
  const stem = trimmed.toLowerCase().slice(0, 4)
  if (stem.length >= 4) {
    const stemEscaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const stemRegex = new RegExp(`\\b${stemEscaped}\\S*`, 'i')
    const stemHit = sentence.match(stemRegex)
    if (stemHit) {
      return { masked: sentence.replace(stemRegex, BLANK), surface: stemHit[0], strategy: 'stem4' }
    }
  }

  // ── Strategies 3 and 4 (roadmap 8d) — APPEND-ONLY ────────────────────────────────────────────
  // These run ONLY after S1 and S2 have both declined, so no sentence that masks today can change
  // its result. That property is asserted over the whole corpus by the before/after columns in
  // lib/__fixtures__/pool-mask-expectations.tsv.
  //
  // Why they are needed: S2's 4-char slice is the weak point, not irregularity. It fails on the
  // perfectly regular `vivir`→"vivo" (character 4 is the ending vowel), on any accented headword
  // (JS `\b` is ASCII-only, so `\búlti\S*` can never match "última"), and on gender agreement
  // (`sano`→"sana"). Both strategies work on TOKENS rather than a regex over the raw sentence, which
  // sidesteps the `\b` problem entirely and avoids index drift between folded and unfolded text.

  const tokens = [...sentence.matchAll(/\S+/g)]
  const foldedWord = normalize(trimmed)

  // Strategy 3: accent-folded whole-token match.
  for (const m of tokens) {
    if (normalize(stripEdgePunctuation(m[0])) === foldedWord) return blankToken(sentence, m, 'folded')
  }

  // Strategy 4: accent-folded stem + a plausible inflectional suffix for the pos.
  const inflStem = inflectionStem(trimmed)
  if (inflStem) {
    let best: { m: RegExpMatchArray; delta: number } | null = null
    for (const m of tokens) {
      const folded = normalize(stripEdgePunctuation(m[0]))
      if (!folded.startsWith(inflStem)) continue
      if (!isPlausibleSuffix(folded.slice(inflStem.length), pos)) continue
      // Prefer the candidate closest in length to the headword, earliest on a tie. Without this a
      // decoy that PRECEDES the true form wins: for `nacer` in "La nación nació ayer", first-match
      // takes "nación". (The suffix gate already rejects "nación" — `ion` is not a verb ending —
      // but the tie-break is the second line of defence when several candidates are plausible.)
      const delta = Math.abs(folded.length - foldedWord.length)
      if (!best || delta < best.delta) best = { m, delta }
    }
    if (best) return blankToken(sentence, best.m, 'stem-inflect')
  }

  // No match — caller should force MC for this card
  return null
}

// Punctuation that can sit around a token without being part of the word, Spanish included.
function stripEdgePunctuation(token: string): string {
  return token.replace(/^[¿¡("'«»]+/, '').replace(/[.,;:!?)"'«»]+$/, '')
}

// Blank the word inside a matched token, keeping any surrounding punctuation ("¿Puedes" → "¿_____").
function blankToken(sentence: string, m: RegExpMatchArray, strategy: MaskStrategy): MaskedWord {
  const start = m.index ?? 0
  const token = m[0]
  const core = stripEdgePunctuation(token)
  const replaced = core ? token.replace(core, BLANK) : token
  return {
    masked: sentence.slice(0, start) + replaced + sentence.slice(start + token.length),
    surface: core || token,
    strategy,
  }
}

// The stem an inflected form should share with the headword. For an infinitive, the real stem
// (strip -ar/-er/-ir and any enclitic -se); otherwise drop the final gender/number vowel. Minimum 3
// characters — `reír` yields "re", which would match "recto"/"reunión", so it declines rather than
// guess. Multi-word headwords ("darse cuenta") decline: their inflection lands on the head verb and
// blanking one token of a phrase is a different exercise.
function inflectionStem(word: string): string | null {
  const folded = normalize(word)
  if (!folded || /\s/.test(folded)) return null
  const base = /(?:ar|er|ir)(?:se)?$/.test(folded)
    ? folded.replace(/(?:ar|er|ir)(?:se)?$/, '')
    : folded.length >= 4
      ? folded.slice(0, -1)
      : folded
  return base.length >= 3 ? base : null
}

// Regular Spanish inflectional endings, accent-folded, as an anchored alternation. A stem match only
// counts when what follows it is one of these — otherwise a short stem blanks the wrong word
// entirely ("sano" → "santo", "poner" → "ponche", "criar" → "crimen"). Those must return null: the
// definition fallback is a worse exercise than a sentence, but a blank over the wrong word is worse
// than both.
// NOTE the absence of an empty alternative, unlike VERB_SUFFIX below. An empty remainder means the
// token IS the stem — the headword minus its last character. For a noun or adjective that is either
// an apocope ("malo" → "mal") or an unrelated word ("sano" → "San" in "San Juan"). The apocope case
// is the more dangerous of the two: it masks successfully and produces an UNGRADEABLE exercise,
// because the stored headword is "malo" while the only form that fits the slot is "mal". Requiring
// at least one inflectional character keeps gender and number ("sana", "sanos") and rejects both.
const NOMINAL_SUFFIX = /^(?:o|a|os|as|e|es|s)$/
// Verb endings across present, preterite, imperfect, future, conditional, both imperfect
// subjunctives, gerund, participle and imperative — followed by zero or more enclitics. The ending
// IS optional here (unlike the nominal case): a bare imperative is a real form, with a clitic
// ("pon" + "te" → "Ponte") or without ("¡Pon la mesa!").
const VERB_SUFFIX =
  /^(?:o|as|a|amos|ais|an|es|e|emos|eis|en|imos|is|aste|asteis|aron|i|iste|io|isteis|ieron|aba|abas|abamos|abais|aban|ia|ias|iamos|iais|ian|ar|er|ir|are|aras|ara|aremos|areis|aran|ere|eras|era|eremos|ereis|eran|ire|iras|ira|iremos|ireis|iran|aria|arias|ariamos|ariais|arian|eria|erias|eriamos|eriais|erian|iria|irias|iriamos|iriais|irian|ando|iendo|ado|ido|ad|ed|id|ase|ases|asemos|aseis|asen|aramos|arais|iese|ieses|iesemos|ieseis|iesen|iera|ieras|ieramos|ierais|ieran)?(?:me|te|se|nos|os|lo|la|le|los|las|les)*$/

function isPlausibleSuffix(remainder: string, pos?: string): boolean {
  if (pos) {
    return pos.startsWith('v.') ? VERB_SUFFIX.test(remainder) : NOMINAL_SUFFIX.test(remainder)
  }
  // No pos (a legacy caller): accept either set, but NEVER an empty remainder. Only a verb has a
  // bare-stem form — the imperative — and without a pos we can't know it is one. Allowing empty
  // here is what let "malo" mask the apocope "mal", producing a blank whose only correct filler is
  // a form the card doesn't store. Callers inside the review path always pass pos.
  if (remainder === '') return false
  return VERB_SUFFIX.test(remainder) || NOMINAL_SUFFIX.test(remainder)
}
