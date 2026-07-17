'use client'

import Image from 'next/image'
import { ArrowRight, Volume2, X, Lock, BookA } from 'lucide-react'
import ConjugationGrid from '../(app)/ConjugationGrid'
import { buildConjugationGridForTense } from '@/lib/conjugation-grid'

// The five tour previews + the ¡Uy! mistake surface. These are STATIC, faithful reproductions of the
// real app surfaces for context (onb-tour-variants.jsx) — not interactive mounts (the real deck /
// exercise need data + state). The ONE exception is the mistake reveal, which mounts the REAL
// deterministic ConjugationGrid (never a redrawn table). All copy is French — instructional
// scaffolding, never mode-aware. The same word — el abrigo — travels the loop.

// 1 · AJOUTER — the /add entry: title + focused input (amber caret) + Paco helper + Rechercher.
export function SurfType() {
  return (
    <div className="bg-card border border-line rounded-[16px] p-4 pb-[17px] shadow-card">
      <div className="font-serif text-[20px] font-bold tracking-[-0.02em] text-ink">Nouveau mot</div>
      <div className="font-sans text-[12.5px] font-medium text-muted mt-[3px]">Entre un mot espagnol</div>
      <div className="flex items-center gap-2.5 bg-card border-[1.5px] border-accent rounded-[13px] px-[15px] py-[13px] shadow-amber-sm mt-[13px]">
        <span className="flex-1 font-serif text-[18px] text-ink">bienvenido</span>
        <span className="w-2 h-[21px] bg-accent rounded-[1px]" />
      </div>
      <div className="flex items-start gap-3 mt-3">
        <Image src="/paco.png" alt="" width={44} height={44} className="object-contain shrink-0" />
        <div className="font-sans text-[12.5px] leading-[1.5] text-muted pt-0.5">
          Paco va générer la définition, des exemples et des mots associés.
        </div>
      </div>
      <div className="mt-[13px] flex items-center justify-center gap-2 py-[13px] rounded-[13px] bg-accent text-ivory font-sans text-[15px] font-semibold shadow-amber-sm">
        Rechercher <ArrowRight size={16} strokeWidth={2.1} />
      </div>
    </div>
  )
}

// 2 · DÉCOUVRIR — the swipe deck caught mid-swipe RIGHT (À apprendre): tilt + amber wash + stamp.
export function SurfDiscover() {
  return (
    <div className="bg-page border border-line rounded-[18px] p-[13px] pb-3.5 shadow-card">
      {/* deck header */}
      <div className="flex items-center justify-between">
        <span className="grid place-items-center w-[30px] h-[30px] rounded-full border border-line bg-card text-muted">
          <X size={15} strokeWidth={2} />
        </span>
        <div className="text-center leading-none">
          <div className="font-sans text-[8.5px] font-bold uppercase tracking-[0.12em] text-faint">La ropa</div>
          <div className="font-sans text-[11.5px] font-bold text-muted mt-[3px] tabular-nums">1 / 10</div>
        </div>
        <span className="w-[30px]" />
      </div>
      <div className="h-1 bg-line rounded-full mt-[9px]">
        <div className="h-full w-[10%] bg-accent rounded-full" />
      </div>
      {/* triage card — mid-swipe right */}
      <div className="relative mt-3">
        <div className="absolute inset-x-1.5 top-2 -bottom-1.5 rounded-[16px] bg-card border border-line shadow-card-sm" />
        <div className="relative bg-card border border-line rounded-[16px] shadow-lift px-[18px] pt-5 pb-4 rotate-[7deg] translate-x-5 origin-bottom">
          <div className="absolute inset-0 rounded-[16px] bg-accent/15 pointer-events-none" />
          <div className="absolute top-2.5 right-2.5 -rotate-[11deg] border-[2.5px] border-amber-deep rounded-[8px] px-2 py-[3px] bg-card/70 font-sans font-extrabold text-[11px] tracking-[0.04em] text-amber-deep">
            À APPRENDRE
          </div>
          <div className="relative text-center mt-3.5">
            <div className="font-serif text-[32px] font-bold tracking-[-0.02em] text-ink whitespace-nowrap">el abrigo</div>
            <div className="mt-2 inline-flex items-baseline gap-[7px]">
              <span className="font-sans text-[13.5px] font-medium text-muted">n.m.</span>
              <span className="text-faint">·</span>
              <span className="font-serif italic text-[15px] text-muted">le manteau</span>
              <span className="grid place-items-center w-[26px] h-[26px] rounded-full border border-line text-accent">
                <Volume2 size={13} />
              </span>
            </div>
          </div>
          <div className="relative mt-3.5 pt-3 border-t border-border-soft">
            <div className="font-serif text-[13.5px] leading-[1.45] text-ink">
              Hace frío hoy; necesito mi <b className="text-accent font-bold">abrigo</b>.
            </div>
          </div>
        </div>
      </div>
      {/* action bar — À apprendre side lit */}
      <div className="flex gap-2.5 mt-[18px]">
        <div className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-[13px] bg-card border-[1.5px] border-sage-border text-sage-ink opacity-55">
          <span className="font-sans text-[13.5px] font-bold">Je connais</span>
          <span className="font-sans text-[9.5px] font-medium opacity-80">← glisse à gauche</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-[13px] bg-accent text-ivory shadow-amber">
          <span className="font-sans text-[13.5px] font-bold">À apprendre</span>
          <span className="font-sans text-[9.5px] font-medium opacity-90">glisse à droite →</span>
        </div>
      </div>
    </div>
  )
}

// 3 · RÉVISER — a fill-in-the-blank (same beber item as the ¡Uy! screen, for continuity).
export function SurfBlank() {
  return (
    <div className="bg-surface-alt border-[1.5px] border-tinted-border rounded-[14px] px-4 py-[15px] shadow-card-sm">
      <div className="flex items-center justify-between mb-2.5">
        <span className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-accent text-ivory font-sans text-[9.5px] font-bold uppercase tracking-[0.06em]">
          À réviser
        </span>
        <span className="grid place-items-center w-[26px] h-[26px] rounded-full border-[1.5px] border-line text-accent">
          <Volume2 size={13} />
        </span>
      </div>
      <p className="font-serif text-[16.5px] leading-[1.55] text-ink">
        Espero que no{' '}
        <span className="inline-block min-w-[80px] text-center border-b-2 border-accent font-serif text-[17px] font-bold text-amber-deep px-1">
          beb
          <span className="inline-block w-0.5 h-[0.95em] bg-accent align-[-2px] ml-px" />
        </span>{' '}
        ese zumo caducado.
      </p>
      <p className="mt-2 font-serif text-[13px] italic leading-[1.4] text-muted">
        J&apos;espère que vous ne boirez pas ce jus périmé.
      </p>
      <div className="mt-3 text-center py-[9px] rounded-[10px] bg-accent text-ivory font-sans text-[12.5px] font-semibold shadow-amber-sm">
        Vérifier
      </div>
    </div>
  )
}

// 4 · MÉMORISER — the same word climbs the 4-point mastery gauge; at 4 it flips to « Mémorisé ».
function Gauge4({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-[5px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[7px] h-[7px] rounded-full border-[1.5px] ${
            i < level ? 'bg-ink border-ink' : 'border-line'
          }`}
        />
      ))}
    </span>
  )
}
export function SurfMemorize() {
  const rows = [
    { w: 'el abrigo', fr: 'le manteau', lvl: 1 },
    { w: 'la cocina', fr: 'la cuisine', lvl: 2 },
    { w: 'beber', fr: 'boire', lvl: 3 },
    { w: 'maravilloso', fr: 'merveilleux', lvl: 4 },
  ]
  return (
    <div className="bg-card border border-line rounded-[14px] overflow-hidden shadow-card-sm">
      {rows.map((r, i) => {
        const done = r.lvl === 4
        return (
          <div
            key={r.w}
            className={`flex items-center gap-3 px-[15px] py-3 ${i ? 'border-t border-border-soft' : ''} ${
              done ? 'bg-surface-alt' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="font-serif text-[17px] font-bold text-ink">{r.w}</div>
              <div className="font-serif text-[12px] italic text-muted">{r.fr}</div>
            </div>
            <div className="flex flex-col items-end gap-[7px]">
              {done ? (
                <span className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-ok-bg text-sage-ink border border-sage-border font-sans text-[9.5px] font-bold uppercase tracking-[0.06em]">
                  Mémorisé
                </span>
              ) : (
                <span className="font-sans text-[9.5px] font-bold uppercase tracking-[0.06em] text-faint">{r.lvl} / 4</span>
              )}
              <Gauge4 level={r.lvl} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 5 · CONSTRUIRE — the dictionary as an unlock horizon. Counts mots AJOUTÉS (the real gate metric),
// never « mémorisés » — a fresh user does not already own a full dico.
export function SurfDict() {
  const added = 7
  const gate = 10
  return (
    <div className="bg-card border border-line rounded-[14px] overflow-hidden shadow-card-sm">
      <div className="flex items-center justify-between px-[15px] py-[13px] bg-surface-alt border-b border-line">
        <span className="inline-flex items-center gap-2 font-serif text-[15.5px] font-bold text-ink">
          <BookA size={16} className="text-accent" />
          Ton dictionnaire
        </span>
        <span className="inline-flex items-center gap-[5px] font-sans text-[9.5px] font-bold uppercase tracking-[0.05em] text-faint">
          <Lock size={11} strokeWidth={2} />
          Verrouillé
        </span>
      </div>
      <div className="px-4 pt-[15px] pb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-sans text-[12px] font-semibold text-muted">Progression</span>
          <span className="font-sans font-bold text-ink">
            <span className="text-[18px] text-amber-deep">{added}</span>
            <span className="text-[12px] text-faint"> / {gate} mots</span>
          </span>
        </div>
        <div className="h-[7px] rounded-full bg-border-soft overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: `${(added / gate) * 100}%` }} />
        </div>
        <p className="mt-3 font-serif text-[14.5px] leading-[1.5] text-ink">
          À <b className="text-amber-deep">10 mots</b>, ton dictionnaire s&apos;ouvre — tes mots classés de A à Z,
          rien que les tiens.
        </p>
        <p className="mt-[7px] font-sans text-[11.5px] text-faint">Plus que {gate - added} mots avant l&apos;ouverture.</p>
      </div>
    </div>
  )
}

// 4b · RÉVISER — l'erreur expliquée (¡Uy!). The REAL deterministic ConjugationGrid, beber /
// presente de subjuntivo, vosotros → bebáis highlighted. Paco never punishes — he explains.
const BEBER_GRID = buildConjugationGridForTense('beber', 'subjPresente', 'vosotros')
export function SurfMistake() {
  return (
    <div className="bg-surface-alt border-[1.5px] border-tinted-border rounded-[16px] px-4 py-[15px] shadow-card-sm">
      <div className="flex items-center gap-3">
        <Image src="/paco-pensando.png" alt="" width={42} height={42} className="object-contain shrink-0" />
        <div>
          <div className="font-serif text-[21px] font-bold tracking-[-0.01em] text-terra-ink">¡Uy&nbsp;!</div>
          <div className="font-sans text-[12.5px] text-muted mt-px">
            La bonne réponse, c&apos;est <b className="text-ink">bebáis</b>.
          </div>
        </div>
      </div>
      <p className="mt-3 mb-2.5 font-serif text-[13.5px] leading-[1.45] text-ink">
        Espero que no <b className="text-amber-deep">bebáis</b> ese zumo caducado.
      </p>
      {BEBER_GRID && <ConjugationGrid grid={BEBER_GRID} infinitive="beber" />}
      <div className="mt-[11px] pt-2.5 border-t border-border-soft font-sans text-[12px] text-faint">
        Ta réponse&nbsp;: <span className="line-through text-terra-ink">bebas</span> — c&apos;était la forme « tú ».
      </div>
    </div>
  )
}
