'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Button from '../(app)/Button'
import OnbShell from './OnbShell'
import WelcomePanel from './WelcomePanel'
import TourPanel from './TourPanel'
import { SurfType, SurfDiscover, SurfBlank, SurfMemorize, SurfDict, SurfMistake } from './TourSurfaces'
import styles from './transitions.module.css'

// The linear first-run flow (M6.2a, slice 1): Welcome → 5-step tour (with the ¡Uy! mistake reveal
// spliced after Réviser) → Home. Gated to show once; skippable from any tour step. Reaching the end
// OR "Passer" both persist onboarding_completed=true and land on Home. All copy French, always.
//
// Slices 2 (prénom/immersion/thème/niveau) and 3 (first swipe + real Home handoff) will insert their
// screens BETWEEN the last tour step and the completion hand-off.

// The 5-step journey. `dot` is the position on the 5-dot rail; the mistake screen shares Réviser's
// dot (2) — it's a suffix of that step, not a sixth one.
const JOURNEY = [
  {
    kind: 'step' as const,
    dot: 0,
    word: 'Ajouter',
    body: 'Tape n’importe quel mot espagnol. En un instant, Paco en rédige la définition, deux exemples en contexte et la prononciation — ta fiche est prête.',
    Surf: SurfType,
  },
  {
    kind: 'step' as const,
    dot: 1,
    word: 'Découvrir',
    body: 'Pas d’idée du jour ? Parcours des mots par thème et glisse vers la droite ceux que tu veux apprendre. D’un geste, ils rejoignent ta liste.',
    Surf: SurfDiscover,
  },
  {
    kind: 'step' as const,
    dot: 2,
    word: 'Réviser',
    body: 'Chaque jour, complète quelques phrases à trou. Paco fait revenir chaque mot juste avant le moment où tu l’oublierais.',
    Surf: SurfBlank,
  },
  { kind: 'mistake' as const, dot: 2 },
  {
    kind: 'step' as const,
    dot: 3,
    word: 'Mémoriser',
    body: 'À force de tomber juste, un mot passe en « Mémorisé ». Il est acquis pour de bon — Paco te le remontre de moins en moins souvent.',
    Surf: SurfMemorize,
  },
  {
    kind: 'step' as const,
    dot: 4,
    word: 'Construire',
    body: 'À mesure que tu ajoutes des mots, ton dictionnaire approche. À 10 mots, il s’ouvre — tes mots classés de A à Z, rien que les tiens.',
    Surf: SurfDict,
  },
]

// Screen 0 is Welcome; 1..N are the tour entries above.
const LAST_INDEX = JOURNEY.length // = index of the final tour screen

export default function OnboardingFlow() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  // Which direction the last step change went — picks the fly-in animation (from the right on
  // forward, from the left on back). The keyed wrapper below remounts on `index` so it replays.
  const [goingBack, setGoingBack] = useState(false)

  // Terminal action (reach the end OR "Passer"): persist the flag, THEN navigate — awaiting the write
  // means the (app) layout's server render reads the committed true and lets Home through instead of
  // bouncing straight back into onboarding. A failed write self-heals on the next load.
  async function complete() {
    if (saving) return
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
    } catch {
      /* ignore — self-heals next load */
    }
    router.push('/')
  }

  function next() {
    if (index >= LAST_INDEX) return complete()
    setGoingBack(false)
    setIndex((i) => i + 1)
  }
  function back() {
    setGoingBack(true)
    setIndex((i) => Math.max(0, i - 1))
  }

  // Keyed per-step wrapper carrying the fly-in animation. `flex-1 min-h-0 flex flex-col` so the
  // panels' own flex-1 layout still fills the shell body.
  const slide = goingBack ? styles.back : styles.forward

  // ── Welcome ──
  if (index === 0) {
    return (
      <OnbShell
        footer={
          <Button variant="primary" full onClick={next} disabled={saving}>
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
  const entry = JOURNEY[index - 1]
  const isLast = index === LAST_INDEX
  const ctaLabel = isLast ? 'Continuer' : 'Suivant'

  return (
    <OnbShell
      dots={{ total: 5, current: entry.dot }}
      onBack={back}
      onSkip={complete}
      footer={
        <Button variant="primary" full onClick={next} disabled={saving}>
          {ctaLabel} <ArrowRight size={16} strokeWidth={2.1} />
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
          <TourPanel
            eyebrow={`Étape ${entry.dot + 1} sur 5`}
            title={entry.word}
            surface={<entry.Surf />}
            body={entry.body}
          />
        )}
      </div>
    </OnbShell>
  )
}
