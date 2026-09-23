// Pure classification of Supabase auth-js (2.104) error codes for the login screen, so the branch
// logic is testable without the DOM or network. auth-js returns a stable `code` on AuthError
// (`code: ErrorCode | string | undefined`); we branch on the code, never the message string.

// How a failed signInWithPassword should be presented:
//   unverified → the email exists but isn't confirmed → distinct "check your inbox" + resend
//   invalid    → genuinely wrong credentials → the generic non-committal message
//   other      → anything else → also the generic message (fail safe, don't leak specifics)
export type LoginErrorKind = 'unverified' | 'invalid' | 'other'

export function loginErrorKind(code: string | undefined | null): LoginErrorKind {
  if (code === 'email_not_confirmed') return 'unverified'
  if (code === 'invalid_credentials') return 'invalid'
  return 'other'
}

// Outcome of the "resend verification email" action (supabase.auth.resend). The caller passes the
// resend error's `code` (or null/undefined when there was no error).
export type ResendResult = 'sent' | 'rate_limited' | 'error'

export function resendResult(errorCode: string | undefined | null): ResendResult {
  if (!errorCode) return 'sent'
  if (errorCode === 'over_email_send_rate_limit') return 'rate_limited'
  return 'error'
}
