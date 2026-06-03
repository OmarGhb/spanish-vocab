export type Mode = 'blank' | 'mc'

export type RatingResult = {
  rating: 1 | 2 | 3 | 4
  reason: string
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function timeLabel(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${s} seconde${s !== 1 ? 's' : ''}`
}

// 'wrongForm' (M5.3a fix): the right verb but the wrong form — the lemma typed instead of the
// conjugated target, or a different valid inflection. Distinct from 'near' (a near-miss of the
// correct form, still ¡Casi!) and 'wrong' (unrelated). It carries the ¡Uy! chrome and an
// À revoir rating — "you know the verb, but not this form" is a lapse to review, not "close".
export type BlankQuality = 'exact' | 'near' | 'wrongForm' | 'wrong'

// Reasons annotate the result-card copy. 'lemma'/'inflection' pair with quality 'wrongForm';
// 'typo' pairs with 'near' (accent-only miss OR a genuine misspelling of the correct form).
export type BlankReason = 'exact' | 'typo' | 'lemma' | 'inflection' | 'wrong'

// Single source of truth for écriture answer classification, shared by computeRating
// (grading) and the result-card display so the verdict shown always matches the grade.
// near = within 2 edits on a word longer than 3 chars (a typo, not a different word).
export function classifyBlankAnswer(
  correctWord: string,
  userAnswer: string,
): { quality: BlankQuality; distance: number } {
  const normalized = userAnswer.trim().toLowerCase()
  const target = correctWord.toLowerCase()
  const distance = levenshtein(normalized, target)
  const quality: BlankQuality =
    distance === 0 ? 'exact' : distance <= 2 && target.length > 3 ? 'near' : 'wrong'
  return { quality, distance }
}

// Verb-aware classification (M5.3a), POS-gated to verbs by the caller. The "correct word" is
// the contextually-correct conjugated form actually blanked from the sentence (`target`), NOT
// the stored lemma — which is the bug this fixes. Six checks, IN ORDER (the order matters):
//   1. exact match to the target                       → exact     (¡Eso es!)
//   2. accent-only miss of the target                  → near      (¡Casi! — right form, accent)
//   3. the lemma (infinitive) typed                    → wrongForm (right verb, wrong form)
//   4. a different valid inflection of the same verb   → wrongForm (right verb, wrong form)
//   5. a genuine misspelling near-miss of the target   → near      (¡Casi! — N lettres près)
//   6. anything else                                   → wrong     (¡Uy!)
// Step 2 must precede 3/4 so a pure accent-drop of the RIGHT form (e.g. "estudio" for "estudió",
// where "estudio" also exists in the paradigm) is credited as a near miss, not mislabeled
// "wrong form". Step 4 must precede 5 so a real distinct inflection within 2 edits of the target
// (crees→creías, distance 2) reads as "wrong form", not "2 lettres près". `inParadigm` is injected
// by the caller (the pure conjugator) to keep this module I/O-free.
export function classifyVerbBlank(params: {
  target: string
  lemma: string
  userAnswer: string
  inParadigm: (answer: string) => boolean
}): { quality: BlankQuality; reason: BlankReason; distance: number } {
  const { target, lemma, userAnswer, inParadigm } = params
  const answer = userAnswer.trim().toLowerCase()
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

  const distance = levenshtein(answer, target.toLowerCase())
  if (distance === 0) return { quality: 'exact', reason: 'exact', distance }

  // 2. Accent-only miss of the target (right form, dropped/added accent).
  if (fold(answer) === fold(target.toLowerCase())) {
    return { quality: 'near', reason: 'typo', distance }
  }
  // 3. The lemma (infinitive) typed instead of the conjugated form.
  if (fold(answer) === fold(lemma.toLowerCase())) {
    return { quality: 'wrongForm', reason: 'lemma', distance }
  }
  // 4. A different valid inflection of the same verb (before the generic typo branch).
  if (inParadigm(userAnswer)) {
    return { quality: 'wrongForm', reason: 'inflection', distance }
  }
  // 5. A genuine misspelling near-miss of the target.
  if (distance <= 2 && target.length > 3) {
    return { quality: 'near', reason: 'typo', distance }
  }
  return { quality: 'wrong', reason: 'wrong', distance }
}

export function computeRating(params: {
  correctWord: string
  userAnswer: string
  timeMs: number
  hintUsed: boolean
  mode: Mode
  // When present (verb card, POS-gated), grading classifies against the conjugated target +
  // paradigm via classifyVerbBlank instead of classifyBlankAnswer. Rating mapping unchanged.
  verb?: { target: string; lemma: string; inParadigm: (answer: string) => boolean }
}): RatingResult {
  const { correctWord, userAnswer, timeMs, hintUsed, mode, verb } = params

  // fast < 5 s · medium 5–15 s · slow > 15 s
  const speed: 'fast' | 'medium' | 'slow' =
    timeMs < 5000 ? 'fast' : timeMs <= 15000 ? 'medium' : 'slow'

  let rating: 1 | 2 | 3 | 4
  let reason: string

  if (mode === 'mc') {
    const correct = userAnswer.trim().toLowerCase() === correctWord.toLowerCase()
    if (!correct) {
      rating = 1
      reason = 'Mauvaise réponse'
    } else if (speed === 'slow') {
      rating = 2
      reason = `Bonne réponse · ${timeLabel(timeMs)}`
    } else if (speed === 'medium') {
      rating = 3
      reason = `Bonne réponse · ${timeLabel(timeMs)}`
    } else {
      rating = 4
      reason = 'Bonne réponse · rapide'
    }
  } else {
    const { quality } = verb
      ? classifyVerbBlank({ target: verb.target, lemma: verb.lemma, userAnswer, inParadigm: verb.inParadigm })
      : classifyBlankAnswer(correctWord, userAnswer)

    if (quality === 'wrong') {
      rating = 1
      reason = 'Mauvaise réponse'
    } else if (quality === 'wrongForm') {
      // Right verb, wrong form — a lapse to review (À revoir), not "close".
      rating = 1
      reason = 'Bon verbe, mauvaise forme'
    } else if (quality === 'near' && speed === 'slow') {
      rating = 2
      reason = `Quasi correct · ${timeLabel(timeMs)}`
    } else if (quality === 'near' || (quality === 'exact' && speed === 'slow')) {
      rating = 3
      reason = quality === 'near' ? `Quasi correct · ${timeLabel(timeMs)}` : `Exact · ${timeLabel(timeMs)}`
    } else {
      // exact + fast or medium
      rating = 4
      reason = speed === 'fast' ? 'Exact · rapide' : `Exact · ${timeLabel(timeMs)}`
    }

    if (hintUsed) {
      rating = Math.max(1, rating - 1) as 1 | 2 | 3 | 4
      reason += ' · indice utilisé'
    }
  }

  return { rating, reason }
}
