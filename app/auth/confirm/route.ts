import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseConfirmParams } from '@/lib/auth-confirm'

// Invite landing (server). Dashboard invites deliver the token via the implicit flow (hash fragment),
// which @supabase/ssr's PKCE client can't consume. The invite email instead links here with
// ?token_hash&type=invite&next=…; we verifyOtp server-side (sets the session cookie), then redirect to
// the set-password form. On any missing/invalid param or a failed verify → the invite-error page.
export async function GET(request: NextRequest) {
  const parsed = parseConfirmParams(request.nextUrl.searchParams)
  if (!parsed) {
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    type: parsed.type,
    token_hash: parsed.token_hash,
  })
  if (error) {
    console.error('[auth/confirm] verifyOtp failed:', error.message)
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  // verifyOtp wrote the session cookie via the server client; the redirect response carries it.
  return NextResponse.redirect(new URL(parsed.next, request.url))
}
