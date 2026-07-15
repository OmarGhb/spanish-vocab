import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingFlow from './OnboardingFlow'

// First-run onboarding (M6.2a, slice 1) — OUTSIDE the (app) group, so it has its own full-screen
// chrome (no TopNav) and the (app) layout's onboarding gate can't loop it back here. middleware
// already requires a logged-in user for this non-public route. If the user has already finished (or
// skipped) onboarding, there's nothing to show → send them Home.
export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('onboarding_completed').maybeSingle()
  if (profile?.onboarding_completed === true) redirect('/')

  return <OnboardingFlow />
}
