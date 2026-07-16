// Temporary display name (PLACEHOLDER). The app has no name field yet, so we derive a friendly name
// from the authenticated user's email local-part: the first token before the @ (split on . _ + -),
// title-cased. E.g. "camille.r@…" → "Camille", "gahbicheomar@…" → "Gahbicheomar".
//
// Pure + unit-tested so every name surface reads from one place.
export function displayNameFromEmail(email?: string | null): string | null {
  if (!email) return null
  const local = email.split('@')[0]?.trim()
  if (!local) return null
  const first = local.split(/[._+-]/).find(Boolean)
  if (!first) return null
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

// The single name-resolution source (M6.2b onboarding prénom step). Prefers the real name the user
// gave (profiles.display_name), falling back to the email derivation when it's unset. Every name
// surface resolves through this — the layout greeting, the drill recap, the account header.
export function resolveDisplayName(stored?: string | null, email?: string | null): string | null {
  const name = stored?.trim()
  return name ? name : displayNameFromEmail(email)
}
