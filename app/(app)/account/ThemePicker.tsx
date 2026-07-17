'use client'

import { Check } from 'lucide-react'
import { useSettings } from '../SettingsProvider'
import { resolveChrome, ACCOUNT_CHROME } from '@/lib/immersion'
import { THEME_SWATCHES, themeName } from '@/lib/theme'

// "Thème de couleur" — the ACTIVE Préférences row + swatch picker (theming milestone). A visual
// cousin of Segmented for a 3–4 option discrete choice. Tap = instant app-wide re-theme (via
// SettingsProvider.setTheme → flips <html data-theme> + cookie + PATCH). Chip preview colors come
// from THEME_SWATCHES (a picker must paint every palette while another is live); the selected ring
// uses the CURRENT theme's accent (var(--color-accent)).
export default function ThemePicker() {
  const { theme, setTheme, immersionMode } = useSettings()

  return (
    <div className="flex flex-col gap-1.5 px-4 py-[15px] border-t border-border-soft">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-serif text-[16.5px] font-semibold tracking-[-0.01em] text-ink">{resolveChrome(ACCOUNT_CHROME.themeColor, immersionMode)}</div>
        <div className="font-sans text-[13px] font-semibold text-accent">{themeName(theme)}</div>
      </div>
      <div className="font-sans text-[12.5px] text-muted mb-2">
        {resolveChrome(ACCOUNT_CHROME.themeColorHelp, immersionMode)}
      </div>
      {/* 8 swatches overflow a phone row — scroll horizontally (no-scrollbar; the clipped last
          chip is the scroll cue). -mx-4 px-4 lets chips run edge-to-edge without clipping the ring. */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
        {THEME_SWATCHES.map((p) => {
          const selected = p.id === theme
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setTheme(p.id)}
              aria-pressed={selected}
              aria-label={p.name}
              className="press-card shrink-0 flex flex-col items-center gap-[7px]"
            >
              <span
                className="relative block w-[52px] h-[52px] rounded-[15px] overflow-hidden border-[1.5px]"
                style={{
                  background: p.page,
                  borderColor: p.border,
                  boxShadow: selected ? '0 0 0 2px var(--color-accent)' : 'none',
                }}
              >
                {/* surface dot (top-left) */}
                <span
                  className="absolute top-2 left-2 w-[15px] h-[15px] rounded-full border"
                  style={{ background: p.surface, borderColor: p.border }}
                />
                {/* accent bar (bottom) */}
                <span className="absolute left-0 right-0 bottom-0 h-[17px]" style={{ background: p.accent }} />
                {/* success tick (fixed semantic) above the bar */}
                <span
                  className="absolute right-[7px] bottom-[22px] w-[9px] h-[9px] rounded-full"
                  style={{ background: p.success }}
                />
                {/* selected check (top-right) */}
                {selected && (
                  <span
                    className="absolute top-[7px] right-[7px] w-[17px] h-[17px] rounded-full grid place-items-center"
                    style={{ background: p.accent }}
                  >
                    <Check size={11} strokeWidth={2.6} style={{ color: p.onAccent }} />
                  </span>
                )}
              </span>
              <span
                className={`font-sans text-[11px] ${selected ? 'font-bold text-accent' : 'font-medium text-muted'}`}
              >
                {p.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
