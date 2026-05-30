'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { DISCOVERY_TOPICS, type DiscoveryTopic } from '@/lib/discovery-topics'
import { posEyebrow, deckArticle, type DeckCard } from '@/lib/discovery'
import SwipeCard from '../SwipeCard'

type Phase = 'grid' | 'generating' | 'deck' | 'bilan' | 'exhausted'

// Background enrichment of kept words. Fired on grid mount (catch-up for any stranded
// 'kept' rows) and again when the bilan shows. The endpoint is concurrency-safe.
function triggerEnrich() {
  void fetch('/api/discovery/enrich', { method: 'POST' }).catch(() => {})
}

// Full-bleed focused backdrop with content constrained to the standard mobile column,
// so the progress bar / card / CTAs never span a wide viewport. `center` stacks content
// in the middle for the loading / exhausted / bilan screens.
function FocusedOverlay({ center, children }: { center?: boolean; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-page">
      <div
        className={`relative w-full max-w-[430px] mx-auto h-full flex flex-col${
          center ? ' items-center justify-center p-6 text-center' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

// Focused-mode close (×), pinned to the top-left within the safe area.
function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fermer"
      className="absolute left-4 z-10 text-muted p-2 -m-2"
      style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <X size={24} strokeWidth={1.8} />
    </button>
  )
}

export default function DiscoverClient() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('grid')
  const [topic, setTopic] = useState<DiscoveryTopic | null>(null)
  const [cards, setCards] = useState<DeckCard[]>([])
  const [index, setIndex] = useState(0)
  const [kept, setKept] = useState(0)
  const [known, setKnown] = useState(0)
  const [genError, setGenError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    triggerEnrich()
    return () => abortRef.current?.abort()
  }, [])

  async function startTopic(t: DiscoveryTopic) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setTopic(t)
    setGenError(false)
    setPhase('generating')
    try {
      const res = await fetch('/api/discovery/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t.key }),
        signal: controller.signal,
      })
      if (!res.ok) {
        setGenError(true)
        return
      }
      const data = (await res.json()) as { cards: DeckCard[] }
      if (!data.cards || data.cards.length === 0) {
        setPhase('exhausted')
        return
      }
      setCards(data.cards)
      setIndex(0)
      setKept(0)
      setKnown(0)
      setPhase('deck')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setGenError(true)
    }
  }

  function cancelGenerating() {
    abortRef.current?.abort()
    setPhase('grid')
  }

  function backToGrid() {
    setPhase('grid')
    setTopic(null)
    setCards([])
  }

  function decide(decision: 'kept' | 'known') {
    const card = cards[index]
    if (!card) return
    void fetch('/api/discovery/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId: card.id, decision }),
    }).catch(() => {})

    if (decision === 'kept') setKept((k) => k + 1)
    else setKnown((k) => k + 1)

    if (index + 1 >= cards.length) {
      triggerEnrich()
      setPhase('bilan')
    } else {
      setIndex((i) => i + 1)
    }
  }

  // ── GRID (with NavBar) ──────────────────────────────────────────────────────
  if (phase === 'grid') {
    return (
      <div className="flex flex-col min-h-screen pb-16">
        {/* Header — standard page gutter (px-5), consistent with every other screen */}
        <div className="pt-[14px] px-5 pb-3 flex items-center gap-3">
          <Image src="/paco.png" alt="Paco" width={56} height={56} className="object-contain shrink-0" />
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink leading-none">Découvrir</h1>
            <p className="text-sm text-muted mt-1.5">Explore de nouveaux mots par thème</p>
          </div>
        </div>
        {/* Grid — 2 equal columns, standard px-5 gutter to match the other screens */}
        <div className="px-5 grid grid-cols-2 gap-[13px]">
          {DISCOVERY_TOPICS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => void startTopic(t)}
              // Content-sized card: simple top-down stack, single 10px gap, no auto-margins.
              className="bg-card border border-line rounded-card shadow-card px-4 pt-4 pb-3.5 flex flex-col gap-2.5 text-left active:bg-tint transition-colors"
            >
              <span className="w-12 h-12 rounded-[13px] bg-tint text-accent flex items-center justify-center shrink-0">
                <t.Icon size={22} strokeWidth={1.8} />
              </span>
              <div>
                <span className="block font-serif text-lg font-bold text-ink leading-tight">{t.es}</span>
                <span className="block text-sm text-muted leading-tight mt-[3px]">{t.fr}</span>
              </div>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{t.count} MOTS</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── FOCUSED OVERLAY (no NavBar) ─────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <FocusedOverlay center>
        <CloseButton onClose={cancelGenerating} />
        {genError ? (
          <div className="flex flex-col items-center gap-4">
            <Image src="/paco-sad.png" alt="Paco" width={72} height={72} className="object-contain" />
            <p className="text-sm text-err font-serif">Une erreur s&apos;est produite.</p>
            <button
              type="button"
              onClick={() => topic && void startTopic(topic)}
              className="bg-accent text-white rounded-card px-6 py-3 font-serif font-semibold text-sm"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            <Image
              src="/paco-pensando.png"
              alt="Paco"
              width={88}
              height={88}
              className="object-contain motion-safe:animate-pulse"
            />
            <p className="font-serif text-xl font-bold text-ink mt-5 leading-snug">
              Paco choisit des mots de «&nbsp;{topic?.es}&nbsp;»…
            </p>
            <p className="text-sm text-muted mt-1.5">Ça prend juste un instant.</p>
            <ul className="w-full max-w-[280px] mt-8 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="h-12 rounded-card bg-surface-alt/60 motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </ul>
          </>
        )}
      </FocusedOverlay>
    )
  }

  if (phase === 'exhausted') {
    return (
      <FocusedOverlay center>
        <CloseButton onClose={backToGrid} />
        <Image src="/paco-pensando.png" alt="Paco" width={88} height={88} className="object-contain" />
        <p className="font-serif text-xl font-bold text-ink mt-5 leading-snug">
          {topic?.es}
        </p>
        <p className="text-sm text-muted mt-2 max-w-[280px]">
          Tu as déjà vu tous les mots de ce thème pour l&apos;instant.
        </p>
        <button
          type="button"
          onClick={backToGrid}
          className="bg-accent text-white rounded-card px-6 py-3 font-serif font-semibold text-sm mt-6"
        >
          Choisir un autre thème →
        </button>
      </FocusedOverlay>
    )
  }

  if (phase === 'bilan') {
    return (
      <FocusedOverlay center>
        <Image src="/paco-feliz.png" alt="Paco" width={96} height={96} className="object-contain" />
        <h1 className="font-serif text-3xl font-bold text-ink mt-5">Thème terminé</h1>
        <p className="text-base text-ink mt-3">
          Tu as ajouté {kept} mot{kept !== 1 ? 's' : ''} à ta collection.
        </p>
        <p className="text-sm text-muted mt-1">
          {known} mot{known !== 1 ? 's' : ''} déjà connu{known !== 1 ? 's' : ''}.
        </p>
        {kept > 0 && (
          <p className="text-xs text-muted mt-3 max-w-[300px] leading-relaxed">
            Tes nouveaux mots arrivent dans «&nbsp;Mes mots&nbsp;» — ça peut prendre jusqu&apos;à 30&nbsp;s.
          </p>
        )}
        <div
          className="w-full max-w-[320px] flex flex-col items-center gap-3 mt-8"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <button
            type="button"
            onClick={() => router.push('/review')}
            className="w-full bg-accent text-white rounded-card py-3.5 font-serif font-semibold text-sm"
          >
            Réviser maintenant
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-card border border-line text-ink rounded-card py-3.5 font-serif font-semibold text-sm"
          >
            Retour à l&apos;accueil
          </button>
          <button
            type="button"
            onClick={backToGrid}
            className="text-sm text-accent underline underline-offset-2 mt-1"
          >
            Découvrir un autre thème →
          </button>
        </div>
      </FocusedOverlay>
    )
  }

  // ── DECK ────────────────────────────────────────────────────────────────────
  const card = cards[index]
  const progress = cards.length > 0 ? (index / cards.length) * 100 : 0
  const article = card ? deckArticle(card.gender) : null

  return (
    <FocusedOverlay>
      {/* Top bar: × + progress */}
      <div className="px-5" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <CloseButton onClose={backToGrid} />
        <div className="pt-1 flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-muted tabular-nums">
            {index + 1} / {cards.length}
          </p>
          <div className="w-full max-w-[280px] h-1.5 rounded-full bg-surface-alt overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card — fills the space between header and CTAs, full mobile-column width */}
      <div className="flex-1 min-h-0 flex px-5 py-3">
        {card && (
          <SwipeCard
            key={card.id}
            className="w-full h-full"
            onSwipeRight={() => decide('kept')}
            onSwipeLeft={() => decide('known')}
            rightStamp={
              <span className="border-[3px] border-ok text-ok rounded-lg px-3 py-1 text-xl font-bold uppercase tracking-wider">
                À apprendre
              </span>
            }
            leftStamp={
              <span className="border-[3px] border-err text-err rounded-lg px-3 py-1 text-xl font-bold uppercase tracking-wider">
                Je connais
              </span>
            }
          >
            <div className="w-full h-full bg-card border border-line rounded-card shadow-card p-6 flex flex-col overflow-hidden">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {posEyebrow(card.pos, card.gender)}
              </p>
              {/* Word + gloss vertically centered in the card */}
              <div className="flex-1 flex flex-col justify-center">
                <p className="font-serif text-[2.75rem] font-bold text-ink leading-none">
                  {article ? <span className="text-muted">{article} </span> : null}
                  {card.word}
                </p>
                <p className="text-base text-muted mt-2">{card.fr}</p>
              </div>
              {/* Example pinned to the card bottom */}
              <div className="pt-5 border-t border-line">
                <p className="font-serif text-base text-ink leading-relaxed">{card.example.es}</p>
                <p className="font-serif italic text-sm text-muted mt-2">{card.example.fr}</p>
              </div>
            </div>
          </SwipeCard>
        )}
      </div>

      {/* Buttons — same outcome as swipes (accessibility + non-swipe fallback) */}
      <div
        className="px-5 pt-2 flex gap-3"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => decide('known')}
          className="flex-1 border border-err rounded-card py-3 flex flex-col items-center bg-card"
        >
          <span className="font-serif font-semibold text-sm text-err">Je connais</span>
          <span className="text-[11px] text-muted mt-0.5">← glisse à gauche</span>
        </button>
        <button
          type="button"
          onClick={() => decide('kept')}
          className="flex-1 bg-accent rounded-card py-3 flex flex-col items-center"
        >
          <span className="font-serif font-semibold text-sm text-white">À apprendre</span>
          <span className="text-[11px] text-white/70 mt-0.5">glisse à droite →</span>
        </button>
      </div>
    </FocusedOverlay>
  )
}
