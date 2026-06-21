// Audio playback-speed control for the "Vitesse de lecture" setting (Profil surface, M5.5i).
//
// CRITICAL — the cached MP3 is already SLOW. lib/tts.ts synthesizes at GCP `speakingRate: 0.9`,
// so the 0.9× slowdown is BAKED into the cached file. The client plays it at the default
// playbackRate (1.0), which is why "today's default" already sounds like 0.9× speech.
//
// This control is applied STRICTLY as HTMLMediaElement.playbackRate over that existing cache —
// never re-synthesis, never cache invalidation. Because the file is pre-slowed, the playbackRate
// we set is the INTENDED perceived rate ÷ the baked 0.9:
//
//     perceived = 0.9 (baked) × playbackRate     ⇒     playbackRate = perceivedTarget / 0.9
//
//   Label   Intended perceived   playbackRate (= perceived ÷ 0.9)
//   ─────   ──────────────────   ────────────────────────────────
//   lent    0.75                 0.833…
//   normal  0.90  (= today)      1.000   ← plays the cached file exactly as-is
//   rapide  1.00                 1.111…
//
// Keep `preservesPitch` at its HTMLMediaElement default (true) at the call site so the rate
// change does not pitch-shift the voice.
export type PlaybackSpeed = 'lent' | 'normal' | 'rapide'

const BAKED_RATE = 0.9 // lib/tts.ts speakingRate — the slowdown already in the cached MP3

// Intended PERCEIVED speeds (Normal = today's default), before dividing out the baked 0.9.
const PERCEIVED_TARGET: Record<PlaybackSpeed, number> = {
  lent: 0.75,
  normal: 0.9,
  rapide: 1.0,
}

export const DEFAULT_PLAYBACK_SPEED: PlaybackSpeed = 'normal'

// Maps a speed label to the HTMLMediaElement.playbackRate to set on the cached audio element.
// Unknown/empty input falls back to 'normal' (playbackRate 1.0 = the cached file unchanged).
export function playbackRateFor(speed: PlaybackSpeed | string | null | undefined): number {
  const key = (speed ?? DEFAULT_PLAYBACK_SPEED) as PlaybackSpeed
  const target = PERCEIVED_TARGET[key] ?? PERCEIVED_TARGET[DEFAULT_PLAYBACK_SPEED]
  return target / BAKED_RATE
}
