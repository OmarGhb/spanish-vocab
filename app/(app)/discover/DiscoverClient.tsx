'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
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
      <div className="flex flex-col min-h-screen pb-20">
        <div className="p-5 flex flex-col gap-5">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink leading-none">Découvrir</h1>
            <p className="text-sm text-muted mt-1.5">Explore de nouveaux mots par thème</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DISCOVERY_TOPICS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => void startTopic(t)}
                className="bg-card border border-line rounded-card shadow-card p-4 flex flex-col gap-2 text-left active:bg-tint transition-colors"
              >
                <span className="w-10 h-10 rounded-full bg-tint text-accent flex items-center justify-center">
                  <t.Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="font-serif text-lg font-bold text-ink leading-tight">{t.es}</span>
                <span className="text-sm text-muted leading-tight">{t.fr}</span>
                <span className="text-[11px] uppercase tracking-widest text-muted mt-0.5">
                  {t.count} mots
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── FOCUSED OVERLAY (no NavBar) ─────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="fixed inset-0 z-[60] bg-page flex flex-col items-center justify-center p-6 text-center">
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
      </div>
    )
  }

  if (phase === 'exhausted') {
    return (
      <div className="fixed inset-0 z-[60] bg-page flex flex-col items-center justify-center p-6 text-center">
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
      </div>
    )
  }

  if (phase === 'bilan') {
    return (
      <div className="fixed inset-0 z-[60] bg-page flex flex-col items-center justify-center p-6 text-center">
        <Image src="/paco-feliz.png" alt="Paco" width={96} height={96} className="object-contain" />
        <h1 className="font-serif text-3xl font-bold text-ink mt-5">Thème terminé</h1>
        <p className="text-base text-ink mt-3">
          Tu as ajouté {kept} mot{kept !== 1 ? 's' : ''} à ta collection.
        </p>
        <p className="text-sm text-muted mt-1">
          {known} mot{known !== 1 ? 's' : ''} déjà connu{known !== 1 ? 's' : ''}.
        </p>
        <div
          className="w-full max-w-[320px] flex flex-col items-center gap-4 mt-8"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <button
            type="button"
            onClick={backToGrid}
            className="w-full bg-accent text-white rounded-card py-3.5 font-serif font-semibold text-sm"
          >
            Découvrir un autre thème →
          </button>
          <button
            type="button"
            onClick={() => router.push('/review')}
            className="text-sm text-accent underline underline-offset-2"
          >
            Réviser maintenant
          </button>
        </div>
      </div>
    )
  }

  // ── DECK ────────────────────────────────────────────────────────────────────
  const card = cards[index]
  const progress = cards.length > 0 ? (index / cards.length) * 100 : 0
  const article = card ? deckArticle(card.gender) : null

  return (
    <div className="fixed inset-0 z-[60] bg-page flex flex-col">
      {/* Top bar: × + progress */}
      <div className="relative px-5" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
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

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6">
        {card && (
          <SwipeCard
            key={card.id}
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
            <div className="w-full bg-card border border-line rounded-card shadow-card p-6 min-h-[340px] flex flex-col">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {posEyebrow(card.pos, card.gender)}
              </p>
              <p className="font-serif text-[2.5rem] font-bold text-ink leading-none mt-3">
                {article ? <span className="text-muted">{article} </span> : null}
                {card.word}
              </p>
              <p className="text-base text-muted mt-2">{card.fr}</p>
              <div className="border-t border-line mt-5 pt-5">
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
          className="flex-1 border border-line rounded-card py-3 flex flex-col items-center bg-card"
        >
          <span className="font-serif font-semibold text-sm text-ink">Je connais</span>
          <span className="text-[11px] text-muted mt-0.5">← glisse à gauche</span>
        </button>
        <button
          type="button"
          onClick={() => decide('kept')}
          className="flex-1 border border-ok/40 bg-ok/10 rounded-card py-3 flex flex-col items-center"
        >
          <span className="font-serif font-semibold text-sm text-ok">À apprendre</span>
          <span className="text-[11px] text-muted mt-0.5">glisse à droite →</span>
        </button>
      </div>
    </div>
  )
}
