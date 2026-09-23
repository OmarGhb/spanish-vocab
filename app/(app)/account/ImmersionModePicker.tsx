'use client'

import { Check } from 'lucide-react'
import { useSettings } from '../SettingsProvider'
import { GLOSS_POLICIES, resolveChrome, type ChromePair, type GlossPolicy } from '@/lib/immersion'

// "Mode d'immersion" — the ACTIVE Préférences control for the GLOSS POLICY axis (M6.1a, generalized
// M8 Phase 0). Governs the interface-chrome language AND how the source-locale translation is
// reached. Tap = persist via SettingsProvider.setGlossPolicy (optimistic state + PATCH); product
// surfaces read the resolved ctx from useSettings(). The onboarding selector reuses setGlossPolicy.
//
// C4 — THIS CONTROL RENDERS IN THE SOURCE LOCALE, ALWAYS. It is the meta-control over the language
// choice and the only escape hatch out of `hidden`, so it must stay readable: every string here
// resolves with the policy PINNED to 'visible' (see `pickerCtx`), never in Spanish. That is the one
// deliberate exception to the policy-aware rule the rest of the app follows.
//
// Its copy lives HERE rather than in lib/immersion.ts on purpose: these strings describe the control
// itself, are never reused, and keeping them out of the shared dictionaries keeps the golden fixture
// (lib/__fixtures__/chrome-golden.tsv) a pure record of PRODUCT chrome.
const COPY = {
  title: { fr: "Mode d'immersion", en: 'Immersion mode' },
  help: {
    fr: "La langue de l'interface et l'accès à la traduction française. Modifiable à tout moment.",
    en: 'The interface language and how you reach the translation. Changeable at any time.',
  },
  recommended: { fr: 'recommandé', en: 'recommended' },
} as const satisfies Record<string, ChromePair>

const OPTIONS: { id: GlossPolicy; label: ChromePair; note: ChromePair; recommended?: boolean }[] = [
  {
    id: 'visible',
    label: { fr: 'FR / ES', en: 'EN / ES' },
    note: {
      fr: 'Consignes en français · traduction au clic',
      en: 'Instructions in English · translation on tap',
    },
  },
  {
    id: 'tap',
    label: { fr: 'Immersion', en: 'Immersion' },
    note: {
      fr: 'Tout en espagnol · traduction au clic',
      en: 'All in Spanish · translation on tap',
    },
    recommended: true,
  },
  {
    id: 'hidden',
    label: { fr: 'Immersion totale', en: 'Full immersion' },
    note: {
      fr: 'Tout en espagnol, aucune traduction',
      en: 'All in Spanish, no translation',
    },
  },
]

export default function ImmersionModePicker({ first }: { first?: boolean }) {
  const { chromeCtx, setGlossPolicy } = useSettings()
  // The escape-hatch pin (C4): source locale honored, policy forced to 'visible'.
  const pickerCtx = { locale: chromeCtx.locale, policy: 'visible' as const }
  const active = OPTIONS.find((o) => o.id === chromeCtx.policy) ?? OPTIONS[0]

  // Guard against GLOSS_POLICIES / OPTIONS drift (fails loudly in dev if a policy is added upstream
  // without a row here).
  if (process.env.NODE_ENV !== 'production' && OPTIONS.length !== GLOSS_POLICIES.length) {
    console.error('[ImmersionModePicker] OPTIONS out of sync with GLOSS_POLICIES')
  }

  return (
    <div className={`flex flex-col gap-2.5 px-4 py-[15px] ${first ? '' : 'border-t border-border-soft'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-serif text-[16.5px] font-semibold tracking-[-0.01em] text-ink">
          {resolveChrome(COPY.title, pickerCtx)}
        </div>
        <div className="font-sans text-[13px] font-semibold text-accent">{resolveChrome(active.label, pickerCtx)}</div>
      </div>
      <div className="font-sans text-[12.5px] text-muted mb-0.5">{resolveChrome(COPY.help, pickerCtx)}</div>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((o) => {
          const selected = o.id === chromeCtx.policy
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setGlossPolicy(o.id)}
              aria-pressed={selected}
              className={`press-card flex items-center gap-3 rounded-[12px] border-[1.5px] px-3.5 py-2.5 text-left ${
                selected ? 'border-accent bg-amber-tint' : 'border-line bg-card'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-serif text-[15px] font-semibold ${selected ? 'text-amber-deep' : 'text-ink'}`}>
                  {resolveChrome(o.label, pickerCtx)}
                  {o.recommended && (
                    <span className="font-sans text-[11px] font-semibold text-muted">
                      {' '}
                      · {resolveChrome(COPY.recommended, pickerCtx)}
                    </span>
                  )}
                </div>
                <div className="font-sans text-[12px] leading-[1.4] text-muted mt-0.5">
                  {resolveChrome(o.note, pickerCtx)}
                </div>
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
