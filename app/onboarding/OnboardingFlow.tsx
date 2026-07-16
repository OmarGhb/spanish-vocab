'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Button from '../(app)/Button'
import { useSettings } from '../(app)/SettingsProvider'
import type { ImmersionMode } from '@/lib/immersion'
import type { DiscoveryLevel } from '@/lib/discovery-pool'
import OnbShell from './OnbShell'
import WelcomePanel from './WelcomePanel'
import TourPanel from './TourPanel'
import { SurfType, SurfDiscover, SurfBlank, SurfMemorize, SurfDict, SurfMistake } from './TourSurfaces'
import NameStep from './NameStep'
import ImmersionStep from './ImmersionStep'
import ThemeStep from './ThemeStep'
import LevelStep from './LevelStep'
import styles from './transitions.module.css'

// The linear first-run flow: Welcome → 5-step tour (¡Uy! reveal after Réviser) → the M6.2b capture
// cluster (prénom · immersion · thème · niveau) → Home. Each capture step writes a profiles field;
// onboarding_completed flips at the end of niveau (or on any Passer of the last step). Skippable
// throughout — Passer applies that step's fallback. All copy French, always (picking an immersion
// mode sets it for the app, not for this scaffolding). Slice 3 will insert the starter-theme pick +
// first-swipe + real Home handoff before the final hand-off.

const JOURNEY = [
  { kind: 'step' as const, dot: 0, word: 'Ajouter', body: 'Tape n’importe quel mot espagnol. En un instant, Paco en rédige la définition, deux exemples en contexte et la prononciation — ta fiche est prête.', Surf: SurfType },
  { kind: 'step' as const, dot: 1, word: 'Découvrir', body: 'Pas d’idée du jour ? Parcours des mots par thème et glisse vers la droite ceux que tu veux apprendre. D’un geste, ils rejoignent ta liste.', Surf: SurfDiscover },
  { kind: 'step' as const, dot: 2, word: 'Réviser', body: 'Chaque jour, complète quelques phrases à trou. Paco fait revenir chaque mot juste avant le moment où tu l’oublierais.', Surf: SurfBlank },
  { kind: 'mistake' as const, dot: 2 },
  { kind: 'step' as const, dot: 3, word: 'Mémoriser', body: 'À force de tomber juste, un mot passe en « Mémorisé ». Il est acquis pour de bon — Paco te le remontre de moins en moins souvent.', Surf: SurfMemorize },
  { kind: 'step' as const, dot: 4, word: 'Construire', body: 'À mesure que tu ajoutes des mots, ton dictionnaire approche. À 10 mots, il s’ouvre — tes mots classés de A à Z, rien que les tiens.', Surf: SurfDict },
]

// Index map: 0 = Welcome · 1..TOUR_LAST = tour · CAPTURE_BASE..CAPTURE_LAST = the 4 capture steps.
const TOUR_LAST = JOURNEY.length // 6
const CAPTURE_BASE = TOUR_LAST + 1 // 7
const CAPTURE_COUNT = 4
const CAPTURE_LAST = CAPTURE_BASE + CAPTURE_COUNT - 1 // 10

function patchProfile(body: Record<string, unknown>) {
  return fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export default function OnboardingFlow() {
  const router = useRouter()
  const { setImmersionMode, setTheme } = useSettings()
  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [goingBack, setGoingBack] = useState(false)

  // Capture state (lifted here so persistence lives in one place; steps are controlled).
  const [name, setName] = useState('')
  const [immMode, setImmMode] = useState<ImmersionMode>('immersion') // pre-selected recommendation
  const [level, setLevel] = useState<DiscoveryLevel | null>(null)

  const forward = () => {
    setGoingBack(false)
    setIndex((i) => i + 1)
  }
  const back = () => {
    setGoingBack(true)
    setIndex((i) => Math.max(0, i - 1))
  }

  // Terminal action: persist onboarding_completed (+ any final fields) THEN navigate — awaiting the
  // write means the (app) layout reads the committed flag and lets Home through. Self-heals on fail.
  async function complete(extra: Record<string, unknown> = {}) {
    if (saving) return
    setSaving(true)
    try {
      await patchProfile({ ...extra, onboarding_completed: true })
    } catch {
      /* ignore — self-heals next load */
    }
    router.push('/')
  }

  const slide = goingBack ? styles.back : styles.forward

  // ── Welcome ──
  if (index === 0) {
    return (
      <OnbShell
        footer={
          <Button variant="primary" full onClick={forward} disabled={saving}>
            Faire connaissance <ArrowRight size={16} strokeWidth={2.1} />
          </Button>
        }
      >
        <div key={index} className={`flex-1 min-h-0 flex flex-col ${slide}`}>
          <WelcomePanel />
        </div>
      </OnbShell>
    )
  }

  // ── Tour (steps + mistake) ──
  if (index <= TOUR_LAST) {
    const entry = JOURNEY[index - 1]
    return (
      <OnbShell
        dots={{ total: 5, current: entry.dot }}
        onBack={back}
        onSkip={() => complete()}
        footer={
          <Button variant="primary" full onClick={forward} disabled={saving}>
            {index === TOUR_LAST ? 'Continuer' : 'Suivant'} <ArrowRight size={16} strokeWidth={2.1} />
          </Button>
        }
      >
        <div key={index} className={`flex-1 min-h-0 flex flex-col ${slide}`}>
          {entry.kind === 'mistake' ? (
            <TourPanel
              eyebrow="Étape 3 · Réviser"
              title="Une erreur ? Paco t'explique"
              titleClassName="text-[28px] leading-[1.05]"
              surface={<SurfMistake />}
              body="Pas de sanction : quand tu te trompes, Paco te montre pourquoi. Pour un verbe, il déplie la conjugaison et surligne la forme attendue."
            />
          ) : (
            <TourPanel eyebrow={`Étape ${entry.dot + 1} sur 5`} title={entry.word} surface={<entry.Surf />} body={entry.body} />
          )}
        </div>
      </OnbShell>
    )
  }

  // ── Capture cluster (prénom · immersion · thème · niveau) ──
  const step = index - CAPTURE_BASE // 0..3
  const isFinal = index === CAPTURE_LAST

  // Continue: persist this step's field, then advance (or complete on the final step).
  function captureContinue() {
    if (saving) return
    if (step === 0) {
      const n = name.trim()
      if (n) void patchProfile({ display_name: n })
      forward()
    } else if (step === 1) {
      setImmersionMode(immMode)
      forward()
    } else if (step === 2) {
      forward() // theme already applied live on tap
    } else {
      void complete(level ? { level } : {})
    }
  }

  // Passer: apply this step's fallback, then advance (or complete on the final step).
  function captureSkip() {
    if (step === 0) forward() // name stays null → email fallback
    else if (step === 1) {
      setImmersionMode('fr_es')
      forward()
    } else if (step === 2) {
      setTheme('sepia')
      forward()
    } else {
      void complete() // level stays null → discovery core-first default
    }
  }

  return (
    <OnbShell
      dots={{ total: CAPTURE_COUNT, current: step }}
      onBack={back}
      onSkip={captureSkip}
      footer={
        <Button variant="primary" full onClick={captureContinue} disabled={saving}>
          {isFinal ? 'C’est parti' : 'Continuer'} {isFinal ? '' : <ArrowRight size={16} strokeWidth={2.1} />}
        </Button>
      }
    >
      <div key={index} className={`flex-1 min-h-0 flex flex-col ${slide}`}>
        {step === 0 && <NameStep value={name} onChange={setName} />}
        {step === 1 && <ImmersionStep selected={immMode} onSelect={setImmMode} />}
        {step === 2 && <ThemeStep />}
        {step === 3 && <LevelStep selected={level} onSelect={setLevel} />}
      </div>
    </OnbShell>
  )
}
