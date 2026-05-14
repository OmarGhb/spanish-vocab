'use client'

import { Volume2 } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'

type Props = { word: string }

// useSyncExternalStore is the idiomatic SSR-safe way to read a browser global.
// Server snapshot returns false → renders null during SSR; client snapshot
// checks the real API after hydration.
function noopSubscribe() { return () => {} }

export default function AudioButton({ word }: Props) {
  const supported = useSyncExternalStore(noopSubscribe, () => 'speechSynthesis' in window, () => false)
  const [speaking, setSpeaking] = useState(false)

  if (!supported) return null

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

  return (
    <button
      type="button"
      onClick={speakWord}
      aria-label="Écouter la prononciation"
      className={`p-1 text-muted transition-colors hover:text-accent ${speaking ? 'animate-pulse text-accent' : ''}`}
    >
      <Volume2 size={18} />
    </button>
  )
}
