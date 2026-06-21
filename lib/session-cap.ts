// Cards-per-session bound for the "Cartes par session" stepper (Profil surface, M5.5i).
// The single source of the 10–50 range + the default, shared by the stepper UI, the
// /api/profile validator, and the server-side read in /review (so a stale/out-of-range
// stored value can never push the session cap outside the contract).
export const MIN_CARDS_PER_SESSION = 10
export const MAX_CARDS_PER_SESSION = 50
export const DEFAULT_CARDS_PER_SESSION = 20
export const CARDS_PER_SESSION_STEP = 1

// Clamps any number to [MIN, MAX]; non-finite / missing input falls back to the default.
export function clampCardsPerSession(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_CARDS_PER_SESSION
  const rounded = Math.round(value)
  if (rounded < MIN_CARDS_PER_SESSION) return MIN_CARDS_PER_SESSION
  if (rounded > MAX_CARDS_PER_SESSION) return MAX_CARDS_PER_SESSION
  return rounded
}

// Stepper helpers — clamp AND keep within bounds so the buttons can disable at the edges.
export function stepCardsPerSession(value: number, direction: 1 | -1): number {
  return clampCardsPerSession(value + direction * CARDS_PER_SESSION_STEP)
}
export const atMinCards = (value: number) => clampCardsPerSession(value) <= MIN_CARDS_PER_SESSION
export const atMaxCards = (value: number) => clampCardsPerSession(value) >= MAX_CARDS_PER_SESSION
