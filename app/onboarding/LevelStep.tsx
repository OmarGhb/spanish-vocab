import { Check } from 'lucide-react'
import type { DiscoveryLevel } from '@/lib/discovery-pool'

// Niveau (onb-flow.jsx `OnbLevel`) — the CEFR self-assessment. Ids match profiles.level + the M8
// discovery band ordering (a1/a2 → core-first, b1/b2 → extended-first). Controlled by the flow;
// persists to profiles.level on Continue. Skippable → null → discovery's core-first default.
const LEVELS: { id: DiscoveryLevel; tag: string; cefr: string; desc: string }[] = [
  { id: 'a1', tag: 'Grand débutant', cefr: '< A2', desc: 'Je commence tout juste.' },
  { id: 'a2', tag: 'Élémentaire', cefr: 'A2', desc: 'Je connais les bases.' },
  { id: 'b1', tag: 'Intermédiaire', cefr: 'B1', desc: 'Je tiens une conversation simple.' },
  { id: 'b2', tag: 'Avancé', cefr: '> B1', desc: 'Je veux enrichir mon vocabulaire.' },
]

export default function LevelStep({
  selected,
  onSelect,
}: {
  selected: DiscoveryLevel | null
  onSelect: (id: DiscoveryLevel) => void
}) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <div className="mb-5">
        <h1 className="font-serif text-[25px] font-bold tracking-[-0.02em] leading-[1.12] text-ink">
          Quel est ton niveau d&apos;espagnol&nbsp;?
        </h1>
        <p className="mt-[9px] font-sans text-[13.5px] leading-[1.5] text-muted">
          Paco choisira des mots ni trop faciles, ni trop durs — tu pourras l&apos;ajuster plus tard.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {LEVELS.map((l) => {
          const on = selected === l.id
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelect(l.id)}
              aria-pressed={on}
              className={`press-card flex items-center gap-3 rounded-[14px] border-[1.5px] px-[15px] py-[13px] text-left ${
                on ? 'border-accent bg-surface-alt' : 'border-line bg-card shadow-card-sm'
              }`}
            >
              <span
                className={`shrink-0 min-w-[46px] text-center rounded-[10px] px-[9px] py-[7px] border ${
                  on ? 'bg-accent border-accent' : 'bg-amber-light border-tinted-border'
                }`}
              >
                <span className={`font-sans text-[13px] font-bold ${on ? 'text-ivory' : 'text-amber-deep'}`}>{l.cefr}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-serif text-[16.5px] font-bold text-ink">{l.tag}</span>
                <span className="block font-sans text-[12px] text-muted mt-px">{l.desc}</span>
              </span>
              <span
                className={`shrink-0 w-5 h-5 rounded-full grid place-items-center border-2 ${
                  on ? 'bg-accent border-accent' : 'border-line'
                }`}
              >
                {on && <Check size={12} strokeWidth={3} className="text-ivory" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
