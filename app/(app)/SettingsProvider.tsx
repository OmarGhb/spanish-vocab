'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { playbackRateFor, DEFAULT_PLAYBACK_SPEED, type PlaybackSpeed } from '@/lib/playback-speed'
import { DEFAULT_THEME, THEME_COOKIE, type ThemeId } from '@/lib/theme'
import { DEFAULT_IMMERSION_MODE, type ImmersionMode } from '@/lib/immersion'

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
  theme: ThemeId
  immersionMode: ImmersionMode
  setAutoplayAudio: (v: boolean) => void
  setPlaybackSpeed: (v: PlaybackSpeed) => void
  setTheme: (v: ThemeId) => void
  setImmersionMode: (v: ImmersionMode) => void
}

// Defaults match the column defaults — used when a consumer renders outside the provider
// (e.g. a future reuse of AudioButton on a public route) so audio never hard-crashes.
const DEFAULTS = {
  autoplayAudio: true,
  playbackSpeed: DEFAULT_PLAYBACK_SPEED,
  theme: DEFAULT_THEME,
  immersionMode: DEFAULT_IMMERSION_MODE,
}

// One-year theme cookie — read by the root layout to set <html data-theme> server-side (FOUC-free).
function writeThemeCookie(id: ThemeId) {
  document.cookie = `${THEME_COOKIE}=${id};path=/;max-age=31536000;samesite=lax`
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({
  children,
  initialAutoplayAudio,
  initialPlaybackSpeed,
  initialTheme,
  initialImmersionMode,
}: {
  children: ReactNode
  initialAutoplayAudio: boolean
  initialPlaybackSpeed: PlaybackSpeed
  initialTheme: ThemeId
  initialImmersionMode: ImmersionMode
}) {
  const [autoplayAudio, setAutoplay] = useState(initialAutoplayAudio)
  const [playbackSpeed, setSpeed] = useState<PlaybackSpeed>(initialPlaybackSpeed)
  const [theme, setThemeState] = useState<ThemeId>(initialTheme)
  const [immersionMode, setImmersionModeState] = useState<ImmersionMode>(initialImmersionMode)
  const router = useRouter()

  // profiles is canonical: reconcile the <html data-theme> + cookie to the server-seeded theme on
  // mount (covers a missing/stale cookie, e.g. first load on a new device after login). Common case
  // (cookie already matches) is a no-op → no flash.
  useEffect(() => {
    if (document.documentElement.dataset.theme !== initialTheme) {
      document.documentElement.dataset.theme = initialTheme
    }
    writeThemeCookie(initialTheme)
  }, [initialTheme])

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
  // Live theme switch: flip the root attribute (instant re-theme via CSS) + mirror the cookie (SSR)
  // + persist to profiles (canonical).
  const setTheme = useCallback(
    (v: ThemeId) => {
      setThemeState(v)
      document.documentElement.dataset.theme = v
      writeThemeCookie(v)
      patch({ theme: v })
    },
    [patch],
  )
  // Immersion mode drives React (the chrome resolver + gloss gate), not CSS — so unlike theme it
  // needs NO <html> attribute and NO cookie (it's consumed only under app/(app)/, which server-seeds
  // this provider from profiles → already FOUC-free).
  //
  // Optimistic local state flips CLIENT consumers (the picker, AccountClient, PasswordForm…) at once.
  // But SERVER components under (app) — the /account "Apprentissage" labels, dictionary, etc. — read
  // immersion_mode at request time and prop-thread it, so they only reflect the new mode after a
  // router.refresh() re-runs them. Refresh AFTER the PATCH resolves, else the re-render re-reads the
  // stale row; on a failed write we skip the refresh (the optimistic client state self-heals on the
  // next load, same as the other settings).
  const setImmersionMode = useCallback(
    (v: ImmersionMode) => {
      setImmersionModeState(v)
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immersion_mode: v }),
      })
        .then((res) => {
          if (res.ok) router.refresh()
        })
        .catch(() => {})
    },
    [router],
  )

  const value = useMemo<SettingsValue>(
    () => ({
      autoplayAudio,
      playbackSpeed,
      playbackRate: playbackRateFor(playbackSpeed),
      theme,
      immersionMode,
      setAutoplayAudio,
      setPlaybackSpeed,
      setTheme,
      setImmersionMode,
    }),
    [autoplayAudio, playbackSpeed, theme, immersionMode, setAutoplayAudio, setPlaybackSpeed, setTheme, setImmersionMode],
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
    setTheme: () => {},
    setImmersionMode: () => {},
  }
}
