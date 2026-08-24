import type { EmailOtpType } from '@supabase/supabase-js'

// Pure parsing/validation for the invite-confirm route (app/auth/confirm/route.ts). Kept out of the
// route so the param handling + open-redirect guard are unit-testable (the inline→tested-helper rule).
//
// Scope: invite links ONLY. `type` must be exactly 'invite' — the invite flow is the sole entry point
// today, and its `next` target (/auth/set-password) is only correct for a user who has NO password yet.
// A 'recovery' (reset) or 'email' (confirmation) link routed here would be wrong (an email-confirming
// user already has a password); when those flows are built they extend this parser deliberately, each
// with its own validated `next`.

const DEFAULT_NEXT = '/auth/set-password'

// A safe post-verify redirect target: a same-origin relative path only. Rejects protocol-relative
// (`//host`), absolute URLs (`https://…`, `mailto:`), and anything not starting with a single `/`,
// so a crafted `next` can't turn the invite link into an open redirect.
function sanitizeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT
  if (!raw.startsWith('/')) return DEFAULT_NEXT
  if (raw.startsWith('//')) return DEFAULT_NEXT
  return raw
}

export function parseConfirmParams(
  params: URLSearchParams,
): { token_hash: string; type: EmailOtpType; next: string } | null {
  const token_hash = params.get('token_hash')
  const type = params.get('type')
  if (!token_hash) return null
  if (type !== 'invite') return null
  return { token_hash, type, next: sanitizeNext(params.get('next')) }
}
