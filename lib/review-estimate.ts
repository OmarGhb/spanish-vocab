// Shared review effort estimate ("≈N min") — used by the Home review CTA and the /review entry
// landing so the two can't drift (one formula, one source). Pure + tested.

export const COLD_START_MS = 12_000 // flat per-card estimate before we have enough data
export const MIN_USABLE_LOGS = 20
export const RECENT_LOGS_WINDOW = 200

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// Median time-per-card over recent logs (outlier-robust), falling back to a flat per-card cost
// until we have enough data. `dueCount` × per-card → minutes, floored at 1.
export function estimateMinutes(dueCount: number, recentTimesMs: number[]): number {
  const times = recentTimesMs.filter((t) => t > 0)
  const perCardMs = times.length >= MIN_USABLE_LOGS ? median(times) ?? COLD_START_MS : COLD_START_MS
  return Math.max(1, Math.round((dueCount * perCardMs) / 60_000))
}

// Whole calendar days from `now` to `then`, counted midnight-to-midnight in LOCAL time (NOT a
// rolling 24h window): a card due in 20h is "demain" if it crosses local midnight, "aujourd'hui"
// if not. Single-user app → we accept the server-local timezone as the calendar reference and
// don't over-engineer per-user zones.
function calendarDayDelta(nowMs: number, thenMs: number): number {
  const start = new Date(nowMs); start.setHours(0, 0, 0, 0)
  const end = new Date(thenMs); end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

// Humanized "prochaine révision" label for the /review empty state — relative-day granularity only
// (no time-of-day: FSRS due-times inherit the review hour, so "matin/soir" would be an artifact).
// `nextDueMs` is MIN(due) over the user's not-yet-due cards; null (nothing scheduled) → null so the
// caller omits the pill entirely. Anything already past → "aujourd'hui" (defensive; the empty state
// only queries future-due cards).
export function nextReviewLabel(nextDueMs: number | null, nowMs: number): string | null {
  if (nextDueMs == null) return null
  const days = calendarDayDelta(nowMs, nextDueMs)
  if (days <= 0) return 'aujourd’hui'
  if (days === 1) return 'demain'
  if (days <= 6) return `dans ${days} jours`
  if (days <= 13) return 'la semaine prochaine'
  return `dans ${Math.round(days / 7)} semaines`
}
