// Auth form validation for the password-change flow (Profil surface, M5.5i) — the canonical
// rules login/signup/onboarding will reuse. Pure + tested so the on-screen helper copy and the
// enforced rule can never drift (POLICY_TEXT is rendered verbatim under the field).

// The enforced new-password rule. POLICY_TEXT MUST mirror this exactly.
export const MIN_PASSWORD_LENGTH = 8
export const PASSWORD_POLICY_TEXT = 'Au moins 8 caractères, dont un chiffre.'

// Pragmatic email shape check (a single @ with non-empty local + dotted domain). Not RFC-5322
// exhaustive — Supabase is the real authority — just enough to gate the form / show an inline error.
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// True iff the password satisfies POLICY_TEXT: ≥ MIN_PASSWORD_LENGTH chars AND contains a digit.
export function isValidPassword(password: string | null | undefined): boolean {
  if (!password) return false
  return password.length >= MIN_PASSWORD_LENGTH && /\d/.test(password)
}

// Whole change-password form gate (drives the primary button's disabled state):
//   current non-empty AND new valid per policy AND confirm === new.
export function canSubmitPasswordChange(args: {
  current: string
  next: string
  confirm: string
}): boolean {
  const { current, next, confirm } = args
  return current.length > 0 && isValidPassword(next) && confirm === next
}
