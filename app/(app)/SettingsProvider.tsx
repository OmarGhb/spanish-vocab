'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { playbackRateFor, DEFAULT_PLAYBACK_SPEED, type PlaybackSpeed } from '@/lib/playback-speed'

// App-wide AUDIO settings, server-seeded from `profiles` in app/(app)/layout.tsx and consumed by
// every cached-audio surface (AudioButton + the review-reveal autoplay). profiles is the single
// source of truth; the context avoids hydration flicker and multi-device drift (vs localStorage).
//
// NOT in this context: cards_per_session — nothing client-side live-consumes it; /review reads it
// server-side and prop-threads it, so keeping it out avoids a needless client round-trip.
type SettingsValue = {
  autoplayAudio: boolean
  playbackSpeed: PlaybackSpeed
  playbackRate: number // derived from playbackSpeed via the tested helper (÷ baked 0.9)
  setAutoplayAudio: (v: boolean) => void
  setPlaybackSpeed: (v: PlaybackSpeed) => void
}

// Defaults match the column defaults — used when a consumer renders outside the provider
// (e.g. a future reuse of AudioButton on a public route) so audio never hard-crashes.
const DEFAULTS = {
  autoplayAudio: true,
  playbackSpeed: DEFAULT_PLAYBACK_SPEED,
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({
  children,
  initialAutoplayAudio,
  initialPlaybackSpeed,
}: {
  children: ReactNode
  initialAutoplayAudio: boolean
  initialPlaybackSpeed: PlaybackSpeed
}) {
  const [autoplayAudio, setAutoplay] = useState(initialAutoplayAudio)
  const [playbackSpeed, setSpeed] = useState<PlaybackSpeed>(initialPlaybackSpeed)

  // Fire-and-forget persistence — the optimistic local state is what the UI reads; a failed
  // write self-heals on the next load (the stored value simply stays as it was).
  const patch = useCallback((body: Record<string, unknown>) => {
    void fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }, [])

  const setAutoplayAudio = useCallback(
    (v: boolean) => {
      setAutoplay(v)
      patch({ autoplay_audio: v })
    },
    [patch],
  )
  const setPlaybackSpeed = useCallback(
    (v: PlaybackSpeed) => {
      setSpeed(v)
      patch({ playback_speed: v })
    },
    [patch],
  )

  const value = useMemo<SettingsValue>(
    () => ({
      autoplayAudio,
      playbackSpeed,
      playbackRate: playbackRateFor(playbackSpeed),
      setAutoplayAudio,
      setPlaybackSpeed,
    }),
    [autoplayAudio, playbackSpeed, setAutoplayAudio, setPlaybackSpeed],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// Graceful default outside a provider (read-only) so non-(app) reuse never crashes.
export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext)
  if (ctx) return ctx
  return {
    ...DEFAULTS,
    playbackRate: playbackRateFor(DEFAULTS.playbackSpeed),
    setAutoplayAudio: () => {},
    setPlaybackSpeed: () => {},
  }
}
