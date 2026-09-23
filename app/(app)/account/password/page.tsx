import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { coerceGlossPolicy, coerceSourceLocale, resolveChrome, ACCOUNT_CHROME, type ChromeCtx } from '@/lib/immersion'
import PasswordForm from './PasswordForm'

// Change-password sub-screen. The shipped TopNav (app layout) is the nav chrome; this adds the
// "← Compte" back bar + heading, then the client form. The user's email is read here and passed
// down for the current-password reauthentication (signInWithPassword needs it).
export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? ''
  const { data: profile } = await supabase.from('profiles').select('source_locale, gloss_policy').maybeSingle()
  const ctx: ChromeCtx = {
    locale: coerceSourceLocale(profile?.source_locale),
    policy: coerceGlossPolicy(profile?.gloss_policy),
  }

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-[18px] pt-1.5 pb-0.5">
        <Link
          href="/account"
          className="inline-flex items-center gap-1 -ml-1 px-1.5 py-1.5 font-sans text-[14px] font-semibold text-muted"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
          {resolveChrome(ACCOUNT_CHROME.ghAccount, ctx)}
        </Link>
      </div>
      <div className="px-[22px] pt-2">
        <h1 className="font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">{resolveChrome(ACCOUNT_CHROME.changePassword, ctx)}</h1>
        <p className="font-sans text-[13.5px] leading-[1.5] text-muted mt-2">
          {resolveChrome(ACCOUNT_CHROME.changePasswordStay, ctx)}
        </p>
      </div>
      <PasswordForm email={email} />
    </div>
  )
}
