import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopNav from './TopNav'
import { FocusModeProvider } from './FocusMode'
import { DeferredDeleteProvider } from './DeferredDelete'
import { SettingsProvider } from './SettingsProvider'
import { DEFAULT_PLAYBACK_SPEED, type PlaybackSpeed } from '@/lib/playback-speed'
import { coerceTheme } from '@/lib/theme'
import { coerceImmersionMode } from '@/lib/immersion'
import { resolveDisplayName } from '@/lib/display-name'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Cheap single-row read: nav pill state + the app-wide audio settings (NOT the expensive
  // memorized scan). Missing row → column defaults via the fallbacks below.
  const { data: profile } = await supabase
    .from('profiles')
    .select('dictionary_unlocked, autoplay_audio, playback_speed, theme, immersion_mode, onboarding_completed, display_name')
    .maybeSingle()

  // First-run gate (M6.2a): a logged-in user who hasn't finished (or skipped) onboarding is bounced
  // into the flow. A brand-new user has no profiles row yet → `undefined` → treated as not-onboarded.
  // /onboarding lives OUTSIDE this (app) group, so there is no redirect loop. Existing users were
  // backfilled to true by the migration, so this never re-triggers for them.
  if (profile?.onboarding_completed !== true) {
    redirect('/onboarding')
  }

  return (
    <FocusModeProvider>
      <DeferredDeleteProvider>
        <SettingsProvider
          initialAutoplayAudio={profile?.autoplay_audio ?? true}
          initialPlaybackSpeed={(profile?.playback_speed as PlaybackSpeed) ?? DEFAULT_PLAYBACK_SPEED}
          initialTheme={coerceTheme(profile?.theme)}
          initialImmersionMode={coerceImmersionMode(profile?.immersion_mode)}
        >
          <div className="w-full max-w-[430px] mx-auto min-h-screen-safe flex flex-col">
            <TopNav
              dictionaryUnlocked={profile?.dictionary_unlocked === true}
              displayName={resolveDisplayName(profile?.display_name, user.email)}
            />
            {children}
          </div>
        </SettingsProvider>
      </DeferredDeleteProvider>
    </FocusModeProvider>
  )
}
