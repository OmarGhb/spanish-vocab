import Link from 'next/link'
import { ChevronRight, Compass, Library, Sparkles } from 'lucide-react'
import type { WordCard } from '@/lib/word-status'
import type { CollectionState } from '@/lib/home-state'
import { resolveChrome, HOME_CHROME, type ImmersionMode } from '@/lib/immersion'
import WordRow from './WordRow'
import Button from './Button'

// M5.5j "Ta collection" — header + preview joined by one amber accent rail so the header reads as
// the head of the list (a real "voir tout"). Three states over the SAME M5.5b row primitives
// (WordRow → StatusPill + MasteryGauge), no new row logic:
//   established → "Ta collection" + "Tout voir →" (→ /words) · preview rows · "Voir les N mots →".
//   young       → "Tes premiers mots" + "Découvrir" pill (→ /discover) · preview rows.
//   empty       → "Ta collection" + "Découvrir" pill · empty card (+ Ajouter / Découvrir CTAs).
// The header pill is amber-tint (a control affordance, not a filled card) — CARTE ≠ CONTRÔLE holds.
export type CollectionPreview = {
  id: string
  word: string
  defEs: string
  card: WordCard | null
}

export default function CollectionSection({
  state,
  previews,
  totalCount,
  mode = 'fr_es',
}: {
  state: CollectionState
  previews: CollectionPreview[]
  totalCount: number
  mode?: ImmersionMode
}) {
  const discover = state !== 'established'
  const headerHref = discover ? '/discover' : '/words'
  const label = resolveChrome(state === 'young' ? HOME_CHROME.firstWords : HOME_CHROME.taCollection, mode)

  return (
    <div className="flex">
      <div className="w-[3px] rounded-full bg-accent shrink-0 mr-[13px]" aria-hidden />
      <div className="flex-1 min-w-0">
        <Link href={headerHref} className="press-row flex items-center justify-between px-0.5 pb-3">
          <span className="font-serif text-[19px] font-bold text-ink tracking-[-0.01em]">{label}</span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-deep bg-amber-tint border border-amber-light rounded-full px-2.5 py-1.5 shrink-0">
            {discover ? (
              <>
                <Compass size={14} strokeWidth={2} /> {resolveChrome(HOME_CHROME.discoverTitle, mode)}
              </>
            ) : (
              <>
                {resolveChrome(HOME_CHROME.seeAll, mode)} <ChevronRight size={13} strokeWidth={2.2} />
              </>
            )}
          </span>
        </Link>

        {state === 'empty' ? (
          <div className="bg-card border border-dashed border-line rounded-card px-5 pt-[26px] pb-[22px] flex flex-col items-center text-center gap-[9px]">
            <span className="w-[46px] h-[46px] rounded-[13px] bg-page border border-line text-faint flex items-center justify-center">
              <Library size={22} strokeWidth={1.7} />
            </span>
            <p className="mt-0.5 font-serif text-[18px] font-bold text-ink">{resolveChrome(HOME_CHROME.collectionEmpty, mode)}</p>
            <p className="text-[12.5px] leading-[1.5] text-muted max-w-[250px]">
              {resolveChrome(HOME_CHROME.emptyCopy, mode)}
            </p>
            <div className="flex gap-[9px] mt-1.5">
              <Button variant="primary" href="/add" className="!px-[18px] !py-3 !text-[15px]">
                {resolveChrome(HOME_CHROME.addWordBtn, mode)}
              </Button>
              <Button variant="secondary" href="/discover" className="!px-4 !py-3 !text-[14.5px]">
                <Compass size={16} strokeWidth={1.9} className="text-accent" /> {resolveChrome(HOME_CHROME.discoverTitle, mode)}
              </Button>
            </div>
          </div>
        ) : state === 'preparing' ? (
          // Words added but still enriching (fresh onboarding) — a calm "arriving" card, NO CTAs
          // (the words are on their way; the PreparingPoller refreshes Home when they land).
          <div className="bg-card border border-line rounded-card px-5 pt-[26px] pb-[22px] flex flex-col items-center text-center gap-[9px]">
            <span className="w-[46px] h-[46px] rounded-[13px] bg-amber-tint border border-amber-light text-amber-deep flex items-center justify-center motion-safe:animate-pulse">
              <Sparkles size={22} strokeWidth={1.7} />
            </span>
            <p className="mt-0.5 font-serif text-[18px] font-bold text-ink">{resolveChrome(HOME_CHROME.collectionPreparingTitle, mode)}</p>
            <p className="text-[12.5px] leading-[1.5] text-muted max-w-[250px]">
              {resolveChrome(HOME_CHROME.collectionPreparingCopy, mode)}
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-[9px]">
              {previews.map((p) => (
                <WordRow key={p.id} id={p.id} word={p.word} defEs={p.defEs} card={p.card} mode={mode} />
              ))}
            </ul>
            {state === 'established' && (
              <Link
                href="/words"
                className="press-row mt-3 self-center inline-flex items-center justify-center gap-1.5 w-full text-[14px] font-semibold text-accent underline underline-offset-[3px]"
              >
                {mode === 'fr_es' ? `Voir les ${totalCount} mots` : `Ver las ${totalCount} palabras`} <ChevronRight size={14} strokeWidth={2.2} />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
