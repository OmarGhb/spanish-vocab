// Character-level diff between what the user typed and the correct word, for the
// near-miss / wrong result display (highlight the differing letters). Pure + tested.
// Matching is case-insensitive; emitted chars keep their original case.

export type DiffOp =
  | { type: 'match'; char: string }
  | { type: 'sub'; typed: string; correct: string }
  | { type: 'del'; typed: string } // extra letter in the typed answer
  | { type: 'ins'; correct: string } // letter missing from the typed answer

export function wordDiff(typed: string, correct: string): DiffOp[] {
  const a = [...typed]
  const b = [...correct]
  const m = a.length
  const n = b.length
  const eq = (x: string, y: string) => x.toLowerCase() === y.toLowerCase()

  // dp[i][j] = edit distance between a[0..i) and b[0..j)
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = eq(a[i - 1], b[j - 1])
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrace to a single alignment.
  const ops: DiffOp[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && eq(a[i - 1], b[j - 1]) && dp[i][j] === dp[i - 1][j - 1]) {
      ops.push({ type: 'match', char: b[j - 1] })
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ type: 'sub', typed: a[i - 1], correct: b[j - 1] })
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ type: 'del', typed: a[i - 1] })
      i--
    } else {
      ops.push({ type: 'ins', correct: b[j - 1] })
      j--
    }
  }
  return ops.reverse()
}
