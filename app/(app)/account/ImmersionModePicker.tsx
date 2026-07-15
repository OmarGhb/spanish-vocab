'use client'

import { Check } from 'lucide-react'
import { useSettings } from '../SettingsProvider'
import { IMMERSION_MODES, type ImmersionMode } from '@/lib/immersion'

// "Mode d'immersion" — the ACTIVE Préférences control for the FR/ES immersion layer (M6.1a). Governs
// the interface-chrome language AND how the French translation is reached. Tap = persist via
// SettingsProvider.setImmersionMode (optimistic state + PATCH); product surfaces (Review now) read it
// from useSettings(). Settings chrome itself stays French (this control describes the modes in French).
// Copy from the immersion mock's MODE_IMM. The onboarding immersion selector reuses setImmersionMode.
const MODES: { id: ImmersionMode; label: string; note: string; recommended?: boolean }[] = [
  { id: 'fr_es', label: 'FR / ES', note: 'Consignes en français · traduction au clic' },
  { id: 'immersion', label: 'Immersion', note: 'Tout en espagnol · traduction au clic', recommended: true },
  { id: 'totale', label: 'Immersion totale', note: 'Tout en espagnol, aucune traduction' },
]

export default function ImmersionModePicker({ first }: { first?: boolean }) {
  const { immersionMode, setImmersionMode } = useSettings()
  const active = MODES.find((m) => m.id === immersionMode) ?? MODES[0]

  // Guard against IMMERSION_MODES / MODES drift (fails loudly in dev if a mode is added upstream
  // without a row here).
  if (process.env.NODE_ENV !== 'production' && MODES.length !== IMMERSION_MODES.length) {
    console.error('[ImmersionModePicker] MODES out of sync with IMMERSION_MODES')
  }

  return (
    <div className={`flex flex-col gap-2.5 px-4 py-[15px] ${first ? '' : 'border-t border-border-soft'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-serif text-[16.5px] font-semibold tracking-[-0.01em] text-ink">Mode d&apos;immersion</div>
        <div className="font-sans text-[13px] font-semibold text-accent">{active.label}</div>
      </div>
      <div className="font-sans text-[12.5px] text-muted mb-0.5">
        La langue de l&apos;interface et l&apos;accès à la traduction française. Modifiable à tout moment.
      </div>
      <div className="flex flex-col gap-2">
        {MODES.map((m) => {
          const selected = m.id === immersionMode
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setImmersionMode(m.id)}
              aria-pressed={selected}
              className={`press-card flex items-center gap-3 rounded-[12px] border-[1.5px] px-3.5 py-2.5 text-left ${
                selected ? 'border-accent bg-amber-tint' : 'border-line bg-card'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-serif text-[15px] font-semibold ${selected ? 'text-amber-deep' : 'text-ink'}`}>
                  {m.label}
                  {m.recommended && <span className="font-sans text-[11px] font-semibold text-muted"> · recommandé</span>}
                </div>
                <div className="font-sans text-[12px] leading-[1.4] text-muted mt-0.5">{m.note}</div>
              </div>
              <span
                className={`w-[20px] h-[20px] rounded-full grid place-items-center shrink-0 border-[1.5px] ${
                  selected ? 'bg-accent border-accent text-ivory' : 'border-line text-transparent'
                }`}
              >
                <Check size={12} strokeWidth={2.6} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
