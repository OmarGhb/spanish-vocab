'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, Compass, Share2, BarChart3, Sparkles, type LucideIcon } from 'lucide-react'
import { DISCOVERY_TOPICS, type DiscoveryTopic } from '@/lib/discovery-topics'
import { posAbbrev, collectionArticle, type CollectionCard } from '@/lib/discovery'
import SwipeCard from '../SwipeCard'
import LoadingChecklist from '../LoadingChecklist'
import Button from '../Button'
import TapReveal from '../TapReveal'
import { useSettings } from '../SettingsProvider'
import { glossVisibility, resolveChrome, DISCOVER_CHROME } from '@/lib/immersion'

type Phase = 'grid' | 'generating' | 'collection' | 'bilan' | 'exhausted'
type Featured = 'adjacency' | 'level'

// Discovery generation phase labels (board ②) — the loading choreography is the shared
// /add one (LoadingChecklist), only the labels + a longer dwell differ. Immersion-aware:
// resolved to FR/ES per mode in-component.
const GEN_PHASE_PAIRS = [
  DISCOVER_CHROME.genPhaseSelect,
  DISCOVER_CHROME.genPhaseDefs,
  DISCOVER_CHROME.genPhaseConfuse,
  DISCOVER_CHROME.genPhasePhon,
] as const

// Background enrichment of kept words. Fired on grid mount (catch-up for any stranded 'kept' rows),
// DURING the swipe session (first keep + a light interval — so words are mostly promoted by the time
// the user reaches Home, shrinking the Home "preparing" window), and when the bilan shows. The
// endpoint is concurrency-safe, drains all pending 'kept' rows, and is idempotent — so overlapping or
// empty calls are harmless; the route's per-invocation cap means each call does a bounded batch and
// repeated calls finish the rest. Fetches are fire-and-forget (they survive an SPA unmount).
const ENRICH_INTERVAL_MS = 15_000 // cadence while swiping the deck
function triggerEnrich() {
  void fetch('/api/discovery/enrich', { method: 'POST' }).catch(() => {})
}

// Full-bleed focused backdrop, content constrained to the standard mobile column.
function FocusedOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-page">
      <div className="relative w-full max-w-[430px] mx-auto h-full flex flex-col">{children}</div>
    </div>
  )
}

// 38px outline circle close (board chrome) — in-flow at the top-left of each modal. Reads the mode
// itself (rendered under the provider) so its aria-label follows immersion without prop threading.
function CircleClose({ onClose }: { onClose: () => void }) {
  const { immersionMode } = useSettings()
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={resolveChrome(DISCOVER_CHROME.close, immersionMode)}
      className="press-icon w-[38px] h-[38px] rounded-full border border-line bg-card grid place-items-center text-muted shrink-0"
    >
      <X size={19} strokeWidth={2} />
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-1 pt-1 pb-0.5">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted whitespace-nowrap">{children}</span>
      <span className="flex-1 h-px bg-border-soft" />
    </div>
  )
}

// Bold the headword where it appears in the example (board: target word bold amber).
function boldTarget(sentence: string, word: string): ReactNode {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'i')
  return sentence.split(re).map((part, i) =>
    re.test(part) ? <b key={i} className="text-accent font-bold">{part}</b> : part,
  )
}

// "Pour toi" featured card — a curated collection, NON-FUNCTIONAL placeholder this slice.
// Distinct from topic tiles: horizontal, amber-FILLED icon tile (featured accent without
// painting the card), and a neutral "Bientôt" chip (NOT the live amber → arrow) so it
// doesn't read as a tap-dead-end. Tapping shows a warm Paco-voice "pas encore disponible".
function FeaturedCard({
  Icon, title, sub, onTap,
}: { Icon: LucideIcon; title: string; sub: string; onTap: () => void }) {
  const { immersionMode } = useSettings()
  return (
    <button
      type="button"
      onClick={onTap}
      className="press-card text-left w-full bg-card border border-line rounded-[16px] shadow-card p-[15px] flex items-center gap-3.5"
    >
      <span className="w-[52px] h-[52px] rounded-[14px] bg-accent text-ivory grid place-items-center shrink-0 shadow-amber-sm">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-lg font-bold tracking-[-0.01em] text-ink leading-[1.18]">{title}</div>
        <div className="text-[12.5px] text-muted leading-snug mt-1">{sub}</div>
      </div>
      <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.1em] text-faint border border-border-soft rounded-full px-2 py-1">
        {resolveChrome(DISCOVER_CHROME.soon, immersionMode)}
      </span>
    </button>
  )
}

const COMING_SOON_MS = 4000

export default function DiscoverClient({
  initialTopic,
  coachMark,
  onFinish,
}: {
  initialTopic?: DiscoveryTopic
  coachMark?: ReactNode
  onFinish?: (kept: number) => void
} = {}) {
  const router = useRouter()
  // Immersion mode gates the card French gloss + resolves all Discover chrome.
  const { immersionMode } = useSettings()
  const gloss = glossVisibility(immersionMode)
  // Onboarding first-swipe (M6.2c) mounts this with `initialTopic` (auto-start, skip the grid) +
  // `onFinish` (finish/close hands the kept count back to the flow instead of routing) + a French
  // `coachMark`. The bare /discover page passes none → grid-first, router-nav behavior unchanged.
  const [phase, setPhase] = useState<Phase>(initialTopic ? 'generating' : 'grid')
  const [topic, setTopic] = useState<DiscoveryTopic | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [comingSoon, setComingSoon] = useState<Featured | null>(null)
  const [cards, setCards] = useState<CollectionCard[]>([])
  const [index, setIndex] = useState(0)
  const [kept, setKept] = useState(0)
  const [known, setKnown] = useState(0)
  const [genReady, setGenReady] = useState(false)
  const [genError, setGenError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const genResultRef = useRef<CollectionCard[] | null>(null)
  // Fire enrichment as soon as the FIRST word is kept this session (state is async) — reset per topic.
  const enrichKickedRef = useRef(false)

  useEffect(() => {
    triggerEnrich()
    return () => abortRef.current?.abort()
  }, [])

  // Light enrichment cadence WHILE swiping the deck (drains keeps accumulated since the last tick), so
  // most kept words are promoted by the time the user hits Home. Only the interval is cleared on
  // unmount / phase change; any in-flight fetch is fire-and-forget and completes on the server.
  useEffect(() => {
    if (phase !== 'collection') return
    const id = setInterval(triggerEnrich, ENRICH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [phase])

  // Onboarding: auto-start the chosen topic (skips the grid). No persistent ref-guard — under React
  // Strict Mode (dev) the mount effect's cleanup aborts the first fetch, so a guard would leave it
  // aborted-and-never-retried. Keyed on `initialTopic` (a stable module constant from getTopic), this
  // re-fires on the Strict-Mode re-mount with a fresh, un-aborted controller; startTopic's own abort()
  // + the /session resume step prevent any duplicate draw.
  useEffect(() => {
    if (initialTopic) void startTopic(initialTopic)
  }, [initialTopic])

  // Auto-dismiss the "Pour toi" coming-soon toast (keyed re-tap restarts it).
  useEffect(() => {
    if (!comingSoon) return
    const t = setTimeout(() => setComingSoon(null), COMING_SOON_MS)
    return () => clearTimeout(t)
  }, [comingSoon])

  async function startTopic(t: DiscoveryTopic) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setTopic(t)
    setSelectedKey(t.key)
    setComingSoon(null)
    setGenError(false)
    setGenReady(false)
    genResultRef.current = null
    setIndex(0)
    setKept(0)
    setKnown(0)
    enrichKickedRef.current = false // new session → first-keep kickoff fires again
    setPhase('generating')
    try {
      // Pool-first (M8): /session draws from the shared pool (instant, no AI) and only falls back to
      // live generation when the user has drained a theme's pool. Same response shape as before.
      const res = await fetch('/api/discovery/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t.key }),
        signal: controller.signal,
      })
      if (!res.ok) {
        setGenError(true)
        return
      }
      const data = (await res.json()) as { cards: CollectionCard[] }
      const list = data.cards ?? []
      genResultRef.current = list
      setCards(list)
      // The choreography (LoadingChecklist) holds the screen until max(dataReady, floor);
      // onReveal then routes to the collection cards or exhausted.
      setGenReady(true)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setGenError(true)
    }
  }

  // Called by LoadingChecklist after the min-floor + settle beat.
  function onGenReveal() {
    const list = genResultRef.current ?? []
    setPhase(list.length > 0 ? 'collection' : 'exhausted')
  }

  function cancelGenerating() {
    abortRef.current?.abort()
    handleFinish(0)
  }

  function backToGrid() {
    setPhase('grid')
    setTopic(null)
    setSelectedKey(null)
    setCards([])
  }

  // Close/finish: onboarding (onFinish set) hands the kept count back to the flow; the bare /discover
  // page returns to the grid.
  function handleFinish(count: number) {
    if (onFinish) onFinish(count)
    else backToGrid()
  }

  function decide(decision: 'kept' | 'known') {
    const card = cards[index]
    if (!card) return
    void fetch('/api/discovery/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId: card.id, decision }),
    }).catch(() => {})

    if (decision === 'kept') {
      setKept((k) => k + 1)
      // Kick off enrichment on the first keep so it runs concurrently with the rest of the swiping.
      if (!enrichKickedRef.current) {
        enrichKickedRef.current = true
        triggerEnrich()
      }
    } else {
      setKnown((k) => k + 1)
    }

    if (index + 1 >= cards.length) {
      triggerEnrich()
      setPhase('bilan')
    } else {
      setIndex((i) => i + 1)
    }
  }

  // ── GRID (under the top nav) ────────────────────────────────────────────────
  if (phase === 'grid') {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-5 pt-1.5 pb-3 flex items-center gap-3.5">
          <Image src="/paco.png" alt="Paco" width={50} height={50} className="object-contain shrink-0" />
          <div>
            <h1 className="font-serif text-[30px] font-bold tracking-[-0.02em] text-ink leading-none">{resolveChrome(DISCOVER_CHROME.title, immersionMode)}</h1>
            <p className="text-[13px] text-muted mt-1.5">{resolveChrome(DISCOVER_CHROME.subtitle, immersionMode)}</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
          {/* POUR TOI — non-functional placeholders (adjacency = M5.1b, A2–B1 = content gate) */}
          <SectionLabel>{resolveChrome(DISCOVER_CHROME.forYou, immersionMode)}</SectionLabel>
          <FeaturedCard
            Icon={Share2}
            title={resolveChrome(DISCOVER_CHROME.featured1Title, immersionMode)}
            sub={resolveChrome(DISCOVER_CHROME.featured1Sub, immersionMode)}
            onTap={() => setComingSoon('adjacency')}
          />
          <FeaturedCard
            Icon={BarChart3}
            title={resolveChrome(DISCOVER_CHROME.featured2Title, immersionMode)}
            sub={resolveChrome(DISCOVER_CHROME.featured2Sub, immersionMode)}
            onTap={() => setComingSoon('level')}
          />
          <div className="mt-1">
            <SectionLabel>{resolveChrome(DISCOVER_CHROME.byTheme, immersionMode)}</SectionLabel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DISCOVERY_TOPICS.map((t) => {
              const sel = selectedKey === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => void startTopic(t)}
                  className={`text-left rounded-[16px] border p-[15px] pb-3.5 flex flex-col gap-3 min-h-[152px] transition-colors ${
                    sel ? 'press-card-feature bg-surface-alt border-[1.5px] border-accent' : 'press-card bg-card border-line shadow-card'
                  }`}
                >
                  <span
                    className={`w-12 h-12 rounded-[13px] grid place-items-center shrink-0 ${
                      sel ? 'bg-accent text-ivory' : 'bg-amber-light text-amber-deep'
                    }`}
                  >
                    <t.Icon size={22} strokeWidth={1.8} />
                  </span>
                  <div className="mt-auto">
                    <span className="block font-serif text-xl font-bold tracking-[-0.01em] text-ink leading-[1.1]">{t.es}</span>
                    <span className="block font-serif italic text-[13px] text-muted mt-[3px]">{t.fr}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-faint">{t.count} {resolveChrome(DISCOVER_CHROME.wordsPlural, immersionMode)}</span>
                    {sel && <ArrowRight size={16} className="text-accent" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Coming-soon toast — same dark treatment as the delete "« … » supprimé" toast. */}
        {comingSoon && (
          <div className="fixed bottom-24 inset-x-0 z-40 px-4 pointer-events-none">
            <div
              key={comingSoon}
              className="max-w-[430px] mx-auto rounded-card px-4 py-3.5 shadow-menu pointer-events-auto flex items-center gap-3.5 bg-ink select-none"
            >
              <Sparkles size={16} className="text-amber-light shrink-0" />
              <p className="text-[14.5px] font-serif text-ivory flex-1">
                {resolveChrome(comingSoon === 'adjacency' ? DISCOVER_CHROME.toastAdjacency : DISCOVER_CHROME.toastLevel, immersionMode)}
              </p>
              <button
                type="button"
                onClick={() => setComingSoon(null)}
                aria-label={resolveChrome(DISCOVER_CHROME.close, immersionMode)}
                className="text-ivory/70 shrink-0 -mr-1 p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── GENERATION (focused overlay, reuses the /add choreography) ───────────────
  if (phase === 'generating') {
    return (
      <FocusedOverlay>
        <div className="shrink-0 px-[18px]" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <CircleClose onClose={cancelGenerating} />
        </div>
        {genError ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-8 pb-10 gap-4">
            <Image src="/paco-sad.png" alt="Paco" width={72} height={72} className="object-contain" />
            <p className="text-sm text-err font-serif">{resolveChrome(DISCOVER_CHROME.errorMsg, immersionMode)}</p>
            <Button variant="primary" type="button" onClick={() => topic && void startTopic(topic)}>
              {resolveChrome(DISCOVER_CHROME.retry, immersionMode)}
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pt-1">
            <LoadingChecklist
              title={<>{resolveChrome(DISCOVER_CHROME.genTitle, immersionMode)} <span className="text-accent">«&nbsp;{topic?.es}&nbsp;»</span></>}
              phases={GEN_PHASE_PAIRS.map((p) => resolveChrome(p, immersionMode))}
              ready={genReady}
              onReveal={onGenReveal}
              phaseDwellMs={950}
              minFloorMs={3800}
              shellDelayMs={0}
            />
          </div>
        )}
      </FocusedOverlay>
    )
  }

  // ── BILAN — Thème terminé (Feliz) ───────────────────────────────────────────
  if (phase === 'bilan') {
    return (
      <FocusedOverlay>
        <div className="shrink-0 px-[18px]" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <CircleClose onClose={() => handleFinish(kept)} />
        </div>
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-9 pb-6">
          <Image src="/paco-feliz.png" alt="Paco" width={104} height={104} className="object-contain mb-2.5" />
          <h1 className="font-serif text-[28px] font-bold tracking-[-0.02em] text-ink">{resolveChrome(DISCOVER_CHROME.themeDone, immersionMode)}</h1>
          <p className="text-base text-ink leading-relaxed mt-3.5 max-w-[280px]">
            {immersionMode === 'fr_es' ? (
              <>Tu as ajouté <span className="font-bold text-amber-deep">{kept}&nbsp;mot{kept !== 1 ? 's' : ''}</span> à ta collection.</>
            ) : (
              <>Has añadido <span className="font-bold text-amber-deep">{kept}&nbsp;palabra{kept !== 1 ? 's' : ''}</span> a tu colección.</>
            )}
          </p>
          {known > 0 && (
            <p className="text-[13.5px] text-faint mt-1.5">
              {immersionMode === 'fr_es' ? (
                <>{known}&nbsp;mot{known !== 1 ? 's' : ''} déjà connu{known !== 1 ? 's' : ''}.</>
              ) : (
                <>{known}&nbsp;palabra{known !== 1 ? 's' : ''} ya conocida{known !== 1 ? 's' : ''}.</>
              )}
            </p>
          )}
          {kept > 0 && (
            <p className="text-[12.5px] text-muted leading-relaxed mt-3.5 max-w-[280px]">
              {resolveChrome(DISCOVER_CHROME.arrivalLine, immersionMode)}
            </p>
          )}
          <div
            className="w-full max-w-[300px] flex flex-col items-center gap-3 mt-7"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {onFinish ? (
              // Onboarding: one CTA hands off to the flow (→ Home handoff).
              <Button variant="primary" full type="button" onClick={() => onFinish(kept)}>
                Continuer →
              </Button>
            ) : (
              <>
                <Button variant="primary" full type="button" onClick={() => router.push('/review')}>
                  {resolveChrome(DISCOVER_CHROME.reviewNow, immersionMode)} →
                </Button>
                <Button variant="secondary" full type="button" onClick={() => router.push('/')}>
                  {resolveChrome(DISCOVER_CHROME.backHome, immersionMode)}
                </Button>
                <Button variant="text" type="button" onClick={backToGrid}>
                  {resolveChrome(DISCOVER_CHROME.discoverAnother, immersionMode)} →
                </Button>
              </>
            )}
          </div>
        </div>
      </FocusedOverlay>
    )
  }

  // ── EXHAUSTED — plus de mots (Durmiendo) ────────────────────────────────────
  if (phase === 'exhausted') {
    return (
      <FocusedOverlay>
        <div className="shrink-0 px-[18px]" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <CircleClose onClose={() => handleFinish(kept)} />
        </div>
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-10 pb-12">
          <Image src="/paco-durmiendo.png" alt="Paco" width={196} height={196} className="object-contain mb-0.5" />
          <h1 className="font-serif text-[23px] font-bold tracking-[-0.01em] text-ink leading-snug">
            {immersionMode === 'fr_es' ? (
              <>Tu as fait le tour de «&nbsp;{topic?.es}&nbsp;»</>
            ) : (
              <>Has recorrido todo «{topic?.es}»</>
            )}
          </h1>
          <p className="text-[14.5px] text-muted leading-relaxed mt-2.5 max-w-[264px]">
            {resolveChrome(DISCOVER_CHROME.exhaustedBody, immersionMode)}
          </p>
          <div className="mt-6">
            {onFinish ? (
              <Button variant="primary" type="button" onClick={() => onFinish(kept)}>
                Continuer →
              </Button>
            ) : (
              <Button variant="secondary" type="button" onClick={backToGrid}>
                <Compass size={17} strokeWidth={1.9} /> {resolveChrome(DISCOVER_CHROME.chooseAnother, immersionMode)}
              </Button>
            )}
          </div>
        </div>
      </FocusedOverlay>
    )
  }

  // ── COLLECTION (fling-commit) ───────────────────────────────────────────────
  const card = cards[index]
  const progress = cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0
  const article = card ? collectionArticle(card.gender) : null

  return (
    <FocusedOverlay>
      {/* Header: ✕ + theme eyebrow + counter + progress */}
      <div className="shrink-0 px-[18px]" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between gap-2">
          <CircleClose onClose={() => handleFinish(kept)} />
          <div className="flex-1 min-w-0 flex flex-col items-center gap-1 leading-none">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-faint whitespace-nowrap">{topic?.es}</span>
            <span className="text-[13px] font-bold tabular-nums text-muted">{index + 1} / {cards.length}</span>
          </div>
          <span className="w-[38px] shrink-0" />
        </div>
        <div className="h-1 bg-line rounded-full mt-2.5 overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Onboarding coach-mark (French scaffolding — stays FR regardless of the card's immersion mode) */}
      {coachMark && <div className="shrink-0 px-[22px] mt-3">{coachMark}</div>}

      {/* Card stack: two ghost cards behind + the swipeable top card */}
      <div className="flex-1 min-h-0 relative mx-[22px] mt-4 mb-1.5">
        <div className="absolute inset-0 rounded-[20px] bg-card border border-line shadow-card" style={{ transform: 'scale(0.9) translateY(20px)' }} aria-hidden />
        <div className="absolute inset-0 rounded-[20px] bg-card border border-line shadow-card" style={{ transform: 'scale(0.95) translateY(10px)' }} aria-hidden />
        {card && (
          <div className="absolute inset-0">
            <SwipeCard
              key={card.id}
              className="w-full h-full"
              lift
              onSwipeRight={() => decide('kept')}
              onSwipeLeft={() => decide('known')}
              rightWash="color-mix(in srgb, var(--color-accent) 15%, transparent)"
              leftWash="color-mix(in srgb, var(--color-ok) 15%, transparent)"
              rightStamp={
                <span className="font-sans text-[21px] font-extrabold uppercase tracking-[0.04em] text-amber-deep border-[3px] border-amber-deep rounded-[11px] px-3.5 py-1.5 bg-[color-mix(in_srgb,var(--color-card)_72%,transparent)]">
                  {resolveChrome(DISCOVER_CHROME.learnStamp, immersionMode)}
                </span>
              }
              leftStamp={
                <span className="font-sans text-[21px] font-extrabold uppercase tracking-[0.04em] text-sage-ink border-[3px] border-ok rounded-[11px] px-3.5 py-1.5 bg-[color-mix(in_srgb,var(--color-card)_72%,transparent)]">
                  {resolveChrome(DISCOVER_CHROME.knowStamp, immersionMode)}
                </span>
              }
            >
              {/* MINIMAL triage face (board ④ / brief): word + inline posAbbrev + gloss + one example.
                  No speaker (brief enumerates these four; audio lives on the kept word's /words/[id]). */}
              <div className="w-full h-full bg-card border border-line rounded-[20px] shadow-card px-[22px] pt-6 pb-[22px] flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="font-serif text-[42px] font-bold tracking-[-0.02em] leading-[1.05] text-ink whitespace-nowrap">
                    {article ? `${article} ` : ''}{card.word}
                  </p>
                  {/* posAbbrev stays; the FR gloss is gated: shown (fr_es) · tap (immersion) · hidden (totale). */}
                  <div className="mt-[11px] inline-flex items-baseline gap-2">
                    <span className="text-[15px] font-medium text-muted">{posAbbrev(card.pos)}</span>
                    {gloss !== 'hidden' && <span className="text-faint">·</span>}
                    {gloss === 'visible' && <span className="font-serif italic text-[17px] text-muted">{card.fr}</span>}
                    {gloss === 'tap' && (
                      <TapReveal label={resolveChrome(DISCOVER_CHROME.cardReveal, immersionMode)}>
                        <span className="font-serif italic text-[17px] text-muted">{card.fr}</span>
                      </TapReveal>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-border-soft">
                  <p className="font-serif text-base text-ink leading-relaxed">{boldTarget(card.example.es, card.word)}</p>
                  {/* Example FR gloss: shown (fr_es) · tap (immersion) · hidden (totale). */}
                  {gloss === 'visible' && (
                    <p className="font-serif italic text-[13.5px] text-muted mt-1.5 leading-relaxed">{card.example.fr}</p>
                  )}
                  {gloss === 'tap' && (
                    <div className="mt-1.5">
                      <TapReveal label={resolveChrome(DISCOVER_CHROME.cardReveal, immersionMode)}>
                        <p className="font-serif italic text-[13.5px] text-muted leading-relaxed">{card.example.fr}</p>
                      </TapReveal>
                    </div>
                  )}
                </div>
              </div>
            </SwipeCard>
          </div>
        )}
      </div>

      {/* Action bar — Je connais (sage) / À apprendre (amber). Mirrors the swipes. */}
      <div
        className="shrink-0 px-[18px] pt-1.5 flex gap-[11px]"
        style={{ paddingBottom: 'max(1.375rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => decide('known')}
          className="flex-1 py-[13px] rounded-[14px] bg-card border-[1.5px] border-sage-border text-sage-ink flex flex-col items-center gap-[3px] font-sans font-bold text-[15px]"
        >
          {resolveChrome(DISCOVER_CHROME.knowStamp, immersionMode)}
          <span className="text-[10.5px] font-medium opacity-80 whitespace-nowrap">{resolveChrome(DISCOVER_CHROME.swipeLeft, immersionMode)}</span>
        </button>
        <button
          type="button"
          onClick={() => decide('kept')}
          className="flex-1 py-[13px] rounded-[14px] bg-accent border-[1.5px] border-accent text-ivory shadow-amber-sm flex flex-col items-center gap-[3px] font-sans font-bold text-[15px]"
        >
          {resolveChrome(DISCOVER_CHROME.learnStamp, immersionMode)}
          <span className="text-[10.5px] font-medium opacity-90 whitespace-nowrap">{resolveChrome(DISCOVER_CHROME.swipeRight, immersionMode)}</span>
        </button>
      </div>
    </FocusedOverlay>
  )
}
