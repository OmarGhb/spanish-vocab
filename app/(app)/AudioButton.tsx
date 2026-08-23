'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSettings } from './SettingsProvider'
import { resolveChrome, SHARED_CHROME } from '@/lib/immersion'
import { pickSpanishVoice } from '@/lib/tts-voice'

// `variant` controls chrome only (same playback logic): 'inline' (default) is the bare
// icon used across fiches; 'circle' is the dictionary row's 36px bordered speaker button
// (board §4) — a separate tap target beside the row link.
type Props = { word: string; audioUrl?: string; variant?: 'inline' | 'circle' }

// useSyncExternalStore is the idiomatic SSR-safe way to read a browser global.
// Server snapshot returns false → renders null during SSR; client snapshot
// checks the real API after hydration.
function noopSubscribe() { return () => {} }

export default function AudioButton({ word, audioUrl, variant = 'inline' }: Props) {
  const supported = useSyncExternalStore(noopSubscribe, () => 'speechSynthesis' in window, () => false)
  const [speaking, setSpeaking] = useState(false)
  // Set when the Web-Speech fallback is asked to speak but the device has NO Spanish voice installed.
  // We refuse to read Spanish text with the device-default (English) voice — that's the wrong-accent
  // bug. Instead we suppress playback and flash a "no audio" state so the tap isn't a silent no-op.
  const [unavailable, setUnavailable] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // "Vitesse de lecture" — applied as playbackRate over the cached MP3 (which is baked at 0.9×;
  // the rate is perceivedTarget ÷ 0.9, see lib/playback-speed.ts). The Web-Speech fallback below
  // is a SEPARATE engine (no cached file) and stays at its fixed 0.9 — out of this control's scope.
  const { playbackRate, immersionMode } = useSettings()
  const audioAria = resolveChrome(SHARED_CHROME.audioAria, immersionMode)

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  if (!audioUrl && !supported) return null

  function playUrl() {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onplay = () => setSpeaking(true)
      audio.onended = () => { setSpeaking(false) }
      audio.onerror = () => { setSpeaking(false) }
    } else {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    // Re-apply on every play so a mid-session speed change takes effect. preservesPitch stays at
    // its default (true), so the rate change doesn't pitch-shift the voice.
    audioRef.current.playbackRate = playbackRate
    void audioRef.current.play()
  }

  // Speak ONLY with a Spanish voice. When one exists, use it; when none is installed, refuse to fall
  // back to the device default (English) reading Spanish text — flash the "no audio" state instead.
  function speakWithVoice(voice: SpeechSynthesisVoice) {
    setUnavailable(false)
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'es-ES'
    utterance.rate = 0.9
    utterance.voice = voice
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    speechSynthesis.speak(utterance)
  }

  function noSpanishVoice() {
    setUnavailable(true)
    window.setTimeout(() => setUnavailable(false), 1500)
  }

  function speakWord() {
    speechSynthesis.cancel()
    const voices = speechSynthesis.getVoices()

    if (voices.length > 0) {
      const voice = pickSpanishVoice(voices)
      if (voice) speakWithVoice(voice)
      else noSpanishVoice()
    } else {
      // Chrome: voices load asynchronously — wait for the event, then speak once (or give up).
      const handler = () => {
        speechSynthesis.removeEventListener('voiceschanged', handler)
        const voice = pickSpanishVoice(speechSynthesis.getVoices())
        if (voice) speakWithVoice(voice)
        else noSpanishVoice()
      }
      speechSynthesis.addEventListener('voiceschanged', handler)
    }
  }

  if (variant === 'circle') {
    return (
      <button
        type="button"
        onClick={audioUrl ? playUrl : speakWord}
        aria-label={audioAria}
        className={`press-icon shrink-0 w-9 h-9 rounded-full grid place-items-center border border-line bg-card transition-colors ${unavailable ? 'text-faint' : 'text-accent'} ${speaking ? 'animate-pulse' : ''}`}
      >
        {unavailable ? <VolumeX size={17} strokeWidth={1.8} /> : <Volume2 size={17} strokeWidth={1.8} />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={audioUrl ? playUrl : speakWord}
      aria-label={audioAria}
      className={`p-1 transition-colors ${unavailable ? 'text-faint' : `text-muted hover:text-accent ${speaking ? 'animate-pulse text-accent' : ''}`}`}
    >
      {unavailable ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  )
}
