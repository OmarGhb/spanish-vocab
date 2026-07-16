import { Volume2, Eye, Lock, RefreshCw } from 'lucide-react'
import type { ImmersionMode } from '@/lib/immersion'

// Immersion selector (onb-immersion-variants.jsx `ImmPropLive`) — the recomposing live-preview version.
// Three segmented chips (pre-selecting Immersion), an ES/FR proportion meter, and two preview cards
// (a Découvrir word card + a Réviser fill-in-blank) rendered in the SELECTED mode's language treatment,
// so the consequence of each mode is legible. Controlled by the flow; Continue commits via the real
// setImmersionMode (M6.1a). The onboarding chrome stays French — only the PREVIEW content follows the
// mode (CD's vetted mock copy, not authored here).

type ModeMeta = { id: ImmersionMode; label: string; recommended?: boolean; es: number; fr: 'visible' | 'tap' | 'none'; frNote: string; tagline: string }
const MODES: ModeMeta[] = [
  { id: 'fr_es', label: 'FR / ES', es: 50, fr: 'visible', frNote: 'Consignes en français · traduction au clic', tagline: 'La façon la plus douce de commencer.' },
  { id: 'immersion', label: 'Immersion', recommended: true, es: 90, fr: 'tap', frNote: 'Tout en espagnol · traduction au clic', tagline: 'En espagnol, avec le français à portée de clic.' },
  { id: 'totale', label: 'Immersion totale', es: 100, fr: 'none', frNote: 'Tout en espagnol, aucune traduction', tagline: 'Sans filet. Pour quand tu te sens prêt·e.' },
]

// Language treatment per mode (preview only) — the "consequence": chrome language + how the FR appears.
const LANG: Record<ImmersionMode, { instr: string; verify: string; transLabel: string; cardTransLabel: string; hasTrans: boolean }> = {
  fr_es: { instr: 'Complète la phrase', verify: 'Vérifier', transLabel: 'Voir la traduction', cardTransLabel: 'Afficher en français', hasTrans: true },
  immersion: { instr: 'Completa la frase', verify: 'Comprobar', transLabel: 'Ver traducción', cardTransLabel: 'Toca para traducir', hasTrans: true },
  totale: { instr: 'Completa la frase', verify: 'Comprobar', transLabel: '', cardTransLabel: '', hasTrans: false },
}

const ABRIGO_DEF_ES = 'Prenda larga que se pone sobre la ropa para no pasar frío.'

function ImmMeter({ es, fr }: { es: number; fr: 'visible' | 'tap' | 'none' }) {
  const frPct = 100 - es
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-sans text-[9px] font-bold tracking-[0.08em] text-accent w-4">ES</span>
      <div className="flex-1 flex h-[9px] rounded-full overflow-hidden border border-line">
        <div className="bg-accent" style={{ width: `${es}%` }} />
        {frPct > 0 && (
          <div
            className="border-l border-card"
            style={{
              width: `${frPct}%`,
              background:
                fr === 'tap'
                  ? 'repeating-linear-gradient(135deg, var(--color-border-soft) 0 4px, var(--color-card) 4px 8px)'
                  : 'var(--color-border-soft)',
            }}
          />
        )}
      </div>
      <span className={`font-sans text-[9px] font-bold tracking-[0.08em] w-4 text-right ${frPct > 0 ? 'text-faint' : 'text-line'}`}>FR</span>
    </div>
  )
}

function WordCardPreview({ mode }: { mode: ImmersionMode }) {
  const L = LANG[mode]
  return (
    <div className="bg-card border border-line rounded-[14px] px-4 py-[15px] shadow-card-sm">
      <div className="flex items-baseline justify-between">
        <span className="font-serif text-[24px] font-bold tracking-[-0.01em] text-ink">el abrigo</span>
        <span className="grid place-items-center w-7 h-7 rounded-full border-[1.5px] border-line text-accent">
          <Volume2 size={13} />
        </span>
      </div>
      <div className="font-sans text-[11.5px] text-faint mt-[3px]">n.m.</div>
      <p className="mt-[7px] font-serif text-[12.5px] leading-[1.45] text-muted">{ABRIGO_DEF_ES}</p>
      <div className="mt-[9px] min-h-[18px]">
        {L.hasTrans ? (
          <span className="inline-flex items-center gap-1.5 font-sans text-[11.5px] font-semibold text-accent underline underline-offset-[3px]">
            <Eye size={12} strokeWidth={2} /> {L.cardTransLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-[5px] font-sans text-[11px] italic text-faint">
            <Lock size={11} strokeWidth={2} /> solo en español
          </span>
        )}
      </div>
    </div>
  )
}

function BlankPreview({ mode }: { mode: ImmersionMode }) {
  const L = LANG[mode]
  return (
    <div className="bg-card border border-line rounded-[14px] px-4 py-[15px] shadow-card-sm">
      <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.09em] text-faint">{L.instr}</div>
      <p className="mt-2 font-serif text-[16.5px] leading-[1.5] text-ink">
        Hace frío, ponte <span className="inline-block w-[46px] border-b-2 border-accent align-baseline mx-0.5">&nbsp;</span> antes de salir.
      </p>
      <div className="mt-[9px] min-h-[18px]">
        {L.hasTrans ? (
          <span className="inline-flex items-center gap-[5px] font-sans text-[11px] font-semibold text-accent underline underline-offset-[3px]">
            <Eye size={11} strokeWidth={2} /> {L.transLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-[5px] font-sans text-[11px] text-faint">
            <Lock size={11} strokeWidth={2} /> sin traducción
          </span>
        )}
      </div>
      <div className="mt-[11px] text-center py-2 rounded-[9px] border-[1.5px] border-line text-accent font-sans text-[11.5px] font-semibold">
        {L.verify}
      </div>
    </div>
  )
}

export default function ImmersionStep({
  selected,
  onSelect,
}: {
  selected: ImmersionMode
  onSelect: (id: ImmersionMode) => void
}) {
  const M = MODES.find((m) => m.id === selected) ?? MODES[0]
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="text-center">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Mode d&apos;immersion</span>
        <h1 className="mt-[9px] font-serif text-[24px] font-bold tracking-[-0.02em] leading-[1.15] text-ink">
          Choisis l&apos;équilibre français / espagnol de ton appli
        </h1>
        <p className="mt-[9px] mx-auto max-w-[300px] font-sans text-[13px] leading-[1.5] text-muted">
          Du plus doux au sans-filet. Touche un mode pour voir l&apos;effet ci-dessous.
        </p>
      </div>

      {/* segmented chips */}
      <div className="flex gap-2 mt-4">
        {MODES.map((m) => {
          const on = m.id === selected
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              aria-pressed={on}
              className={`press-card flex-1 min-h-[54px] flex flex-col items-center justify-center gap-1 text-center px-1.5 py-[11px] rounded-[13px] border-[1.5px] ${
                on ? 'bg-accent border-accent text-ivory shadow-amber-sm' : 'bg-card border-line text-ink'
              }`}
            >
              <span className="font-serif text-[14px] font-bold leading-tight">{m.label}</span>
              {m.recommended && (
                <span className={`font-sans text-[8px] font-bold uppercase tracking-[0.08em] ${on ? 'text-ivory/85' : 'text-amber-deep'}`}>Reco.</span>
              )}
            </button>
          )
        })}
      </div>

      {/* live preview card — meter + the two recomposing surfaces */}
      <div className="mt-3.5 bg-surface-alt border-[1.5px] border-tinted-border border-l-[3px] border-l-accent rounded-[18px] p-4 shadow-card">
        <div className="mb-3">
          <ImmMeter es={M.es} fr={M.fr} />
          <div className="flex items-center justify-between mt-2">
            <span className="font-sans text-[11.5px] font-bold text-ink">{M.es === 90 ? '≈ 90' : M.es}% espagnol</span>
            <span className="font-sans text-[11px] text-muted">{M.frNote}</span>
          </div>
        </div>
        <div className="flex flex-col gap-[11px]">
          <WordCardPreview mode={selected} />
          <BlankPreview mode={selected} />
        </div>
      </div>

      <p className="mt-3 text-center font-serif text-[13.5px] italic text-amber-deep">« {M.tagline} »</p>

      <div className="mt-3 flex items-center justify-center gap-[7px] px-[13px] py-[9px] rounded-[11px] bg-card border border-line">
        <RefreshCw size={13} className="text-accent shrink-0" />
        <span className="font-sans text-[12px] text-muted text-center">
          Tu pourras en changer quand tu veux, depuis les <b className="text-ink">Réglages</b>.
        </span>
      </div>
    </div>
  )
}
