'use client'

import { Toggle, Segmented } from '@/components/form/Controls'
import { useSettings } from '../SettingsProvider'
import type { PlaybackSpeed } from '@/lib/playback-speed'

// Audio controls read/write the SettingsProvider context (server-seeded from profiles), so a change
// here takes effect app-wide immediately (every AudioButton + the review autoplay) AND persists via
// the context's PATCH — no local state, no initial props needed.

export function AutoplayToggle() {
  const { autoplayAudio, setAutoplayAudio } = useSettings()
  return <Toggle on={autoplayAudio} onChange={setAutoplayAudio} />
}

const SPEED_OPTIONS: readonly { value: PlaybackSpeed; label: string }[] = [
  { value: 'lent', label: 'Lent' },
  { value: 'normal', label: 'Normal' },
  { value: 'rapide', label: 'Rapide' },
]

export function SpeedSegmented() {
  const { playbackSpeed, setPlaybackSpeed } = useSettings()
  return <Segmented options={SPEED_OPTIONS} value={playbackSpeed} onChange={setPlaybackSpeed} />
}
