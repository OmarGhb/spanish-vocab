import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopNav from './TopNav'
import { FocusModeProvider } from './FocusMode'
import { DeferredDeleteProvider } from './DeferredDelete'
import { SettingsProvider } from './SettingsProvider'
import { DEFAULT_PLAYBACK_SPEED, type PlaybackSpeed } from '@/lib/playback-speed'

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
    .select('dictionary_unlocked, autoplay_audio, playback_speed')
    .maybeSingle()

  return (
    <FocusModeProvider>
      <DeferredDeleteProvider>
        <SettingsProvider
          initialAutoplayAudio={profile?.autoplay_audio ?? true}
          initialPlaybackSpeed={(profile?.playback_speed as PlaybackSpeed) ?? DEFAULT_PLAYBACK_SPEED}
        >
          <div className="w-full max-w-[430px] mx-auto min-h-screen flex flex-col">
            <TopNav dictionaryUnlocked={profile?.dictionary_unlocked === true} />
            {children}
          </div>
        </SettingsProvider>
      </DeferredDeleteProvider>
    </FocusModeProvider>
  )
}
