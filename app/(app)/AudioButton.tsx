'use client'

import { Volume2 } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSettings } from './SettingsProvider'

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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // "Vitesse de lecture" — applied as playbackRate over the cached MP3 (which is baked at 0.9×;
  // the rate is perceivedTarget ÷ 0.9, see lib/playback-speed.ts). The Web-Speech fallback below
  // is a SEPARATE engine (no cached file) and stays at its fixed 0.9 — out of this control's scope.
  const { playbackRate } = useSettings()

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

  function speakWord() {
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'es-ES'
    utterance.rate = 0.9
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    const voices = speechSynthesis.getVoices()

    function pickVoice(vs: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
      return vs.find((v) => v.lang === 'es-ES') ?? vs.find((v) => v.lang.startsWith('es'))
    }

    if (voices.length > 0) {
      const voice = pickVoice(voices)
      if (voice) utterance.voice = voice
      speechSynthesis.speak(utterance)
    } else {
      // Chrome: voices load asynchronously — wait for the event then speak once.
      const handler = () => {
        const voice = pickVoice(speechSynthesis.getVoices())
        if (voice) utterance.voice = voice
        speechSynthesis.speak(utterance)
        speechSynthesis.removeEventListener('voiceschanged', handler)
      }
      speechSynthesis.addEventListener('voiceschanged', handler)
    }
  }

  if (variant === 'circle') {
    return (
      <button
        type="button"
        onClick={audioUrl ? playUrl : speakWord}
        aria-label="Écouter la prononciation"
        className={`press-icon shrink-0 w-9 h-9 rounded-full grid place-items-center border border-line bg-card text-accent transition-colors ${speaking ? 'animate-pulse' : ''}`}
      >
        <Volume2 size={17} strokeWidth={1.8} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={audioUrl ? playUrl : speakWord}
      aria-label="Écouter la prononciation"
      className={`p-1 text-muted transition-colors hover:text-accent ${speaking ? 'animate-pulse text-accent' : ''}`}
    >
      <Volume2 size={18} />
    </button>
  )
}
