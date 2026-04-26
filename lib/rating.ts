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

export function computeRating(params: {
  correctWord: string
  userAnswer: string
  timeMs: number
  hintUsed: boolean
  mode: Mode
}): RatingResult {
  const { correctWord, userAnswer, timeMs, hintUsed, mode } = params

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
    const normalized = userAnswer.trim().toLowerCase()
    const target = correctWord.toLowerCase()
    const dist = levenshtein(normalized, target)

    const quality: 'exact' | 'near' | 'wrong' =
      dist === 0 ? 'exact' : dist <= 2 && target.length > 3 ? 'near' : 'wrong'

    if (quality === 'wrong') {
      rating = 1
      reason = 'Mauvaise réponse'
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
