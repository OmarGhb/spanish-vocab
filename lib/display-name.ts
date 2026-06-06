// Temporary display name (PLACEHOLDER). The app has no name field yet, so we derive a friendly name
// from the authenticated user's email local-part: the first token before the @ (split on . _ + -),
// title-cased. E.g. "camille.r@…" → "Camille", "gahbicheomar@…" → "Gahbicheomar".
//
// Pure + unit-tested so every name surface reads from one place. **M6 onboarding** will collect a
// real display name and store it on `profiles`; when it lands, swap ONLY this helper's source (read
// the stored name, fall back to the email derivation) — no need to hunt down call sites. (Logged in
// docs/backlog.md → Onboarding.)
export function displayNameFromEmail(email?: string | null): string | null {
  if (!email) return null
  const local = email.split('@')[0]?.trim()
  if (!local) return null
  const first = local.split(/[._+-]/).find(Boolean)
  if (!first) return null
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}
