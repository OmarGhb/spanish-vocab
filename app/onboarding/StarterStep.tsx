import { Check, Sparkles } from 'lucide-react'
import { DISCOVERY_TOPICS, ESENCIAL_TOPIC } from '@/lib/discovery-topics'

// Starter pick (onb-flow.jsx `OnbStarter`) — "Par quoi veux-tu commencer ?": the featured curated
// "mélange" (esencial) pre-selected, or a specific theme. Each shows its live pool count. Controlled
// by the flow; the choice seeds the first-swipe. French scaffolding.
export default function StarterStep({
  selected,
  onSelect,
  counts,
}: {
  selected: string
  onSelect: (key: string) => void
  counts: Record<string, number>
}) {
  const mixOn = selected === ESENCIAL_TOPIC.key
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mb-4">
        <h1 className="font-serif text-[25px] font-bold tracking-[-0.02em] leading-[1.12] text-ink">
          Par quoi veux-tu commencer&nbsp;?
        </h1>
        <p className="mt-[9px] font-sans text-[13.5px] leading-[1.5] text-muted">
          Un mélange à ton niveau, ou un thème précis si tu as une idée.
        </p>
      </div>

      {/* Featured — the curated mélange (esencial), the "Ajouter" feature treatment */}
      <button
        type="button"
        onClick={() => onSelect(ESENCIAL_TOPIC.key)}
        aria-pressed={mixOn}
        className={`press-card w-full flex items-center gap-3 text-left rounded-[16px] bg-surface-alt border border-tinted-border border-l-[3px] border-l-accent px-4 py-[15px] ${
          mixOn ? 'shadow-[0_0_0_1.5px_var(--color-accent)]' : 'shadow-card'
        }`}
      >
        <span className="shrink-0 grid place-items-center w-11 h-11 rounded-[12px] bg-accent text-ivory shadow-amber-sm">
          <Sparkles size={22} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-serif text-[17.5px] font-bold text-ink">Un mélange conseillé</span>
            <span className="font-sans text-[8.5px] font-bold uppercase tracking-[0.08em] text-amber-deep bg-amber-light px-[7px] py-[3px] rounded-full">Conseillé</span>
          </span>
          <span className="block font-sans text-[12.5px] leading-[1.45] text-muted mt-0.5">
            Les mots essentiels pour bien démarrer, à ton niveau.
          </span>
        </span>
        <span className={`shrink-0 w-[22px] h-[22px] rounded-full grid place-items-center border-2 ${mixOn ? 'bg-accent border-accent' : 'border-line'}`}>
          {mixOn && <Check size={13} strokeWidth={3} className="text-ivory" />}
        </span>
      </button>

      {/* divider */}
      <div className="flex items-center gap-3 my-[18px]">
        <span className="flex-1 h-px bg-border-soft" />
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-faint">ou choisis un thème</span>
        <span className="flex-1 h-px bg-border-soft" />
      </div>

      {/* theme grid */}
      <div className="grid grid-cols-2 gap-3 pb-1">
        {DISCOVERY_TOPICS.map((t) => {
          const on = selected === t.key
          const n = counts[t.key] ?? 0
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(t.key)}
              aria-pressed={on}
              className={`press-card text-left rounded-[16px] border p-[14px] ${
                on ? 'bg-surface-alt border-[1.5px] border-accent' : 'bg-card border-line shadow-card-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-[38px] h-[38px] rounded-[11px] bg-amber-light border border-tinted-border text-amber-deep">
                  <t.Icon size={19} strokeWidth={1.8} />
                </span>
                {on ? (
                  <span className="w-5 h-5 rounded-full grid place-items-center bg-accent">
                    <Check size={12} strokeWidth={3} className="text-ivory" />
                  </span>
                ) : (
                  <span className="font-sans text-[11px] font-semibold text-faint">{n} mots</span>
                )}
              </div>
              <div className="font-serif text-[16.5px] font-bold text-ink mt-2.5">{t.es}</div>
              <div className="font-serif text-[12.5px] italic text-muted mt-px">{t.fr}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
