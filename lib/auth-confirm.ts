import type { EmailOtpType } from '@supabase/supabase-js'

// Pure parsing/validation for the email-confirm route (app/auth/confirm/route.ts). Kept out of the
// route so the param handling + open-redirect guard are unit-testable (the inline→tested-helper rule).
//
// Scope: the two link types that land here, each with its OWN validated `next` default — the landing
// target is a property of the link type, not a global:
//   invite → /auth/set-password   the invitee has no password yet, so setting one is the only
//                                 sensible next step (M6.0/v0.12.28 invite flow).
//   signup → /onboarding          the confirming user already chose a password at signup, and
//                                 verifyOtp establishes a session — so they go straight into the
//                                 first-run flow (Auth hardening, v0.12.31).
//
// Still rejected: 'recovery' (password reset) and 'magiclink'/'email_change'. Each needs its own
// validated `next` before it can be accepted — /auth/forgot-password is still a stub, and routing a
// recovery link to either target above would be wrong. Add them to NEXT_BY_TYPE deliberately, with
// tests, when those flows are built.
const NEXT_BY_TYPE = {
  invite: '/auth/set-password',
  signup: '/onboarding',
} as const satisfies Partial<Record<EmailOtpType, string>>

type AcceptedType = keyof typeof NEXT_BY_TYPE

function isAcceptedType(t: string | null): t is AcceptedType {
  return t !== null && t in NEXT_BY_TYPE
}

// A safe post-verify redirect target: a same-origin relative path only. Rejects protocol-relative
// (`//host`), absolute URLs (`https://…`, `mailto:`), and anything not starting with a single `/`,
// so a crafted `next` can't turn a confirmation link into an open redirect. Falls back to the
// per-type default rather than a single global one.
function sanitizeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  return raw
}

export function parseConfirmParams(
  params: URLSearchParams,
): { token_hash: string; type: AcceptedType; next: string } | null {
  const token_hash = params.get('token_hash')
  const type = params.get('type')
  if (!token_hash) return null
  if (!isAcceptedType(type)) return null
  return { token_hash, type, next: sanitizeNext(params.get('next'), NEXT_BY_TYPE[type]) }
}
