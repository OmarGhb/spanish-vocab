'use client'

import { Check } from 'lucide-react'
import { useSettings } from '../(app)/SettingsProvider'
import { THEME_SWATCHES } from '@/lib/theme'

// Thème couleur (onb-flow.jsx `ThemePick`) — reuses the account theme write path (setTheme +
// THEME_SWATCHES) under the mock's onboarding header. Tap = instant app-wide re-theme; the flow
// adopts the chosen palette from this step on (copy stays FR). Skip → sepia (handled by the flow).
export default function ThemeStep() {
  const { theme, setTheme } = useSettings()
  return (
    <div className="flex-1 flex flex-col justify-center">
      <div className="text-center mb-[30px]">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Apparence</span>
        <h1 className="mt-[9px] font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">Choisis ton ambiance</h1>
        <p className="mt-[11px] mx-auto max-w-[290px] font-sans text-[14px] leading-[1.55] text-muted">
          Quatre palettes. Le vert (mémorisé) et le rouge (suppression) ne changent jamais.
        </p>
      </div>
      <div className="flex justify-center gap-4 flex-wrap">
        {THEME_SWATCHES.map((p) => {
          const selected = p.id === theme
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setTheme(p.id)}
              aria-pressed={selected}
              aria-label={p.name}
              className="press-card flex flex-col items-center gap-[7px]"
            >
              <span
                className="relative block w-[52px] h-[52px] rounded-[15px] overflow-hidden border-[1.5px]"
                style={{
                  background: p.page,
                  borderColor: p.border,
                  boxShadow: selected ? '0 0 0 2px var(--color-accent)' : 'none',
                }}
              >
                <span
                  className="absolute top-2 left-2 w-[15px] h-[15px] rounded-full border"
                  style={{ background: p.surface, borderColor: p.border }}
                />
                <span className="absolute left-0 right-0 bottom-0 h-[17px]" style={{ background: p.accent }} />
                <span className="absolute right-[7px] bottom-[22px] w-[9px] h-[9px] rounded-full" style={{ background: p.success }} />
                {selected && (
                  <span className="absolute top-[7px] right-[7px] w-[17px] h-[17px] rounded-full grid place-items-center" style={{ background: p.accent }}>
                    <Check size={11} strokeWidth={2.6} style={{ color: p.onAccent }} />
                  </span>
                )}
              </span>
              <span className={`font-sans text-[11px] ${selected ? 'font-bold text-accent' : 'font-medium text-muted'}`}>
                {p.name}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-[26px] text-center font-sans text-[12.5px] text-faint">
        Modifiable à tout moment dans les Préférences.
      </p>
    </div>
  )
}
