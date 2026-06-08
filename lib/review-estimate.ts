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
