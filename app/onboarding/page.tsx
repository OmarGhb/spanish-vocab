import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsProvider } from '../(app)/SettingsProvider'
import { DEFAULT_PLAYBACK_SPEED, type PlaybackSpeed } from '@/lib/playback-speed'
import { coerceTheme } from '@/lib/theme'
import { coerceImmersionMode } from '@/lib/immersion'
import { countByTheme } from '@/lib/discovery-topics'
import OnboardingFlow from './OnboardingFlow'

// First-run onboarding (M6.2a/b) — OUTSIDE the (app) group, so it has its own full-screen chrome (no
// TopNav) and the (app) layout's onboarding gate can't loop it back here. middleware already requires
// a logged-in user for this non-public route. If the user has already finished (or skipped)
// onboarding, there's nothing to show → send them Home.
//
// Wrapped in SettingsProvider (M6.2b): the immersion + thème capture steps write via the real
// setImmersionMode / setTheme, and the thème step's palette adopts app-wide. Seeded from the profile
// like the (app) layout, so those setters persist to the same row.
export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, theme, immersion_mode, autoplay_audio, playback_speed')
    .maybeSingle()
  if (profile?.onboarding_completed === true) redirect('/')

  // Active pool counts per theme_key (M6.2c) for the starter grid. Shared-read RLS lets any logged-in
  // user read the pool; grouped in JS (a theme with no pool rows simply shows 0).
  const { data: poolRows } = await supabase.from('discovery_pool').select('theme_key').eq('status', 'active')
  const poolCounts = countByTheme((poolRows ?? []) as { theme_key: string }[])

  return (
    <SettingsProvider
      initialAutoplayAudio={profile?.autoplay_audio ?? true}
      initialPlaybackSpeed={(profile?.playback_speed as PlaybackSpeed) ?? DEFAULT_PLAYBACK_SPEED}
      initialTheme={coerceTheme(profile?.theme)}
      initialImmersionMode={coerceImmersionMode(profile?.immersion_mode)}
    >
      <OnboardingFlow poolCounts={poolCounts} />
    </SettingsProvider>
  )
}
