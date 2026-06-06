'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildDrillPrompts,
  gradeDrillAnswer,
  personsForScope,
  type DrillPromptItem,
  type DrillVerb,
} from '@/lib/drill'
import { useFocusMode } from '../FocusMode'
import type { DrillPrefs } from './page'
import DrillSetup from './DrillSetup'
import DrillPrompt from './DrillPrompt'
import DrillResult, { type DrillOutcome } from './DrillResult'
import DrillRecap from './DrillRecap'

type Phase = 'setup' | 'playing' | 'recap'

// Self-contained drill flow: setup → 10 prompts (prompt → result, manual advance) → recap.
// Focus mode for the whole lifetime (TopNav suppressed across all three phases, matching the
// mockups), restored on unmount. Pure practice — no /api/review, no review_cards/_logs writes.
export default function DrillClient({
  pool,
  prefs,
  displayName,
}: {
  pool: DrillVerb[]
  prefs: DrillPrefs
  displayName: string | null
}) {
  const router = useRouter()
  const { setFocus } = useFocusMode()
  useEffect(() => {
    setFocus(true)
    return () => setFocus(false)
  }, [setFocus])

  const [phase, setPhase] = useState<Phase>('setup')
  const [used, setUsed] = useState<DrillPrefs>(prefs) // last-used selection (drives Rejouer)
  const [prompts, setPrompts] = useState<DrillPromptItem[]>([])
  const [index, setIndex] = useState(0)
  const [current, setCurrent] = useState<DrillOutcome | null>(null) // current prompt's graded result
  const [outcomes, setOutcomes] = useState<DrillOutcome[]>([])

  const exit = () => router.push('/')

  function begin(sel: DrillPrefs) {
    const built = buildDrillPrompts(pool, sel.tenses, personsForScope(sel.personScope))
    setUsed(sel)
    setPrompts(built)
    setIndex(0)
    setCurrent(null)
    setOutcomes([])
    setPhase('playing')
  }

  // From Setup: persist the selection (fire-and-forget) and start.
  function start(sel: DrillPrefs) {
    void fetch('/api/drill/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenses: sel.tenses, personScope: sel.personScope }),
    }).catch(() => {
      /* losing a prefs write is harmless — the drill runs from the in-memory selection */
    })
    begin(sel)
  }

  function submit(answer: string) {
    const prompt = prompts[index]
    const { verdict } = gradeDrillAnswer({ target: prompt.correctForm, lemma: prompt.verb, userAnswer: answer })
    const outcome: DrillOutcome = { prompt, userAnswer: answer, verdict }
    setCurrent(outcome)
    setOutcomes((prev) => [...prev, outcome])
  }

  function next() {
    if (index + 1 >= prompts.length) {
      setPhase('recap')
      return
    }
    setIndex((i) => i + 1)
    setCurrent(null)
  }

  if (phase === 'setup') {
    return <DrillSetup prefs={prefs} onStart={start} onExit={exit} />
  }

  if (phase === 'recap') {
    return <DrillRecap outcomes={outcomes} displayName={displayName} onReplay={() => begin(used)} onFinish={exit} />
  }

  // playing — input then result, per prompt
  const count = index + 1
  return current ? (
    <DrillResult outcome={current} count={count} total={prompts.length} onNext={next} onExit={exit} />
  ) : (
    <DrillPrompt
      key={index}
      prompt={prompts[index]}
      count={count}
      total={prompts.length}
      onSubmit={submit}
      onExit={exit}
    />
  )
}
