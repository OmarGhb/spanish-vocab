'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { RowWrap } from '@/components/form/SettingsCard'

// "Revoir l'introduction" — replays the first-run onboarding flow (M6.2a). Flips
// onboarding_completed back to false, then routes into /onboarding. Doubles as the owner's test
// affordance ("force-show on my account") and a genuine replay feature for anyone.
//
// Intentionally FRENCH, not mode-aware: it launches the onboarding flow, which is French-only
// instructional scaffolding by design (same reasoning as the ImmersionModePicker staying FR). So it
// carries no ACCOUNT_CHROME pair.
export default function ReplayIntroRow({ first }: { first?: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function replay() {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: false }),
      })
    } catch {
      /* ignore — the route below still shows onboarding; the gate self-heals next load */
    }
    router.push('/onboarding')
  }

  return (
    <button type="button" onClick={replay} disabled={busy} className="press-row block w-full text-left">
      <RowWrap first={first}>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[16.5px] font-semibold tracking-[-0.01em] text-ink">
            Revoir l&apos;introduction
          </div>
        </div>
        <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-faint" />
      </RowWrap>
    </button>
  )
}
