import { describe, it, expect } from 'vitest'
import { playbackRateFor, DEFAULT_PLAYBACK_SPEED, type PlaybackSpeed } from './playback-speed'

describe('playbackRateFor', () => {
  // The cached MP3 is baked at 0.9× (lib/tts.ts), so playbackRate = perceivedTarget ÷ 0.9.
  it('maps each label to perceivedTarget ÷ 0.9', () => {
    expect(playbackRateFor('lent')).toBeCloseTo(0.75 / 0.9, 10) // 0.833…
    expect(playbackRateFor('normal')).toBeCloseTo(1.0, 10) // 0.9 / 0.9 — cached file unchanged
    expect(playbackRateFor('rapide')).toBeCloseTo(1.0 / 0.9, 10) // 1.111…
  })

  it("'normal' is EXACTLY 1.0 — today's default plays the cached file as-is", () => {
    expect(playbackRateFor('normal')).toBe(1.0)
  })

  it('yields the intended perceived speed when multiplied back by the baked 0.9', () => {
    const perceived = (s: PlaybackSpeed) => playbackRateFor(s) * 0.9
    expect(perceived('lent')).toBeCloseTo(0.75, 10)
    expect(perceived('normal')).toBeCloseTo(0.9, 10)
    expect(perceived('rapide')).toBeCloseTo(1.0, 10)
  })

  it('falls back to normal (1.0) for unknown / null / undefined', () => {
    expect(playbackRateFor(null)).toBe(1.0)
    expect(playbackRateFor(undefined)).toBe(1.0)
    expect(playbackRateFor('')).toBe(1.0)
    expect(playbackRateFor('turbo')).toBe(1.0)
    expect(DEFAULT_PLAYBACK_SPEED).toBe('normal')
  })
})
