'use client'

import { Toggle, Segmented } from '@/components/form/Controls'
import { useSettings } from '../SettingsProvider'
import { resolveChrome, ACCOUNT_CHROME } from '@/lib/immersion'
import type { PlaybackSpeed } from '@/lib/playback-speed'

// Audio controls read/write the SettingsProvider context (server-seeded from profiles), so a change
// here takes effect app-wide immediately (every AudioButton + the review autoplay) AND persists via
// the context's PATCH — no local state, no initial props needed.

export function AutoplayToggle() {
  const { autoplayAudio, setAutoplayAudio } = useSettings()
  return <Toggle on={autoplayAudio} onChange={setAutoplayAudio} />
}

export function SpeedSegmented() {
  const { playbackSpeed, setPlaybackSpeed, immersionMode } = useSettings()
  const options: readonly { value: PlaybackSpeed; label: string }[] = [
    { value: 'lent', label: resolveChrome(ACCOUNT_CHROME.speedSlow, immersionMode) },
    { value: 'normal', label: resolveChrome(ACCOUNT_CHROME.speedNormal, immersionMode) },
    { value: 'rapide', label: resolveChrome(ACCOUNT_CHROME.speedFast, immersionMode) },
  ]
  return <Segmented options={options} value={playbackSpeed} onChange={setPlaybackSpeed} />
}
