import { Plus, Compass, Rows3, BookA } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { oneEmbed, type WordCard } from '@/lib/word-status'
import { DICTIONARY_UNLOCK_THRESHOLD, getDictionaryState } from '@/lib/dictionary'
import { buildDrillPool, DRILL_UNLOCK_THRESHOLD } from '@/lib/drill'
import { estimateMinutes, RECENT_LOGS_WINDOW } from '@/lib/review-estimate'
import { resolveHomeState } from '@/lib/home-state'
import { coerceImmersionMode, resolveChrome, HOME_CHROME } from '@/lib/immersion'
import ReviewHero from './ReviewHero'
import HubCard from './HubCard'
import HubCardLocked from './HubCardLocked'
import CollectionSection, { type CollectionPreview } from './CollectionSection'
import UnlockSync from './UnlockSync'

// How many recent words the "Ta collection" preview shows before the "Voir les N mots →" footer.
const PREVIEW_COUNT = 10

export default async function HomePage() {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const [{ count: wordCount }, { count: dueCount }, { data: recent }, { data: logs }, { data: deckVerbs }, { data: profile }] =
    await Promise.all([
      // Only real collection words count: manual, or discovery rows fully promoted.
      supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .or('origin.eq.manual,discovery_status.eq.promoted'),
      supabase.from('review_cards').select('*', { count: 'exact', head: true }).lte('due', nowIso),
      supabase
        .from('words')
        .select('id, word, definition, review_cards(state, due, stability, reps)')
        .or('origin.eq.manual,discovery_status.eq.promoted')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('review_logs')
        .select('time_ms')
        .gt('time_ms', 0)
        .order('reviewed_at', { ascending: false })
        .limit(RECENT_LOGS_WINDOW),
      // Full deck verb scan for the drill unlock count (fetch-and-filter in JS — M4.1 precedent).
      supabase
        .from('words')
        .select('word, lemma, definition')
        .or('origin.eq.manual,discovery_status.eq.promoted'),
      // Immersion mode (M6.1c) — threaded into the server-rendered Home chrome (no client hook here).
      supabase.from('profiles').select('immersion_mode').maybeSingle(),
    ])

  const mode = coerceImmersionMode(profile?.immersion_mode)

  const totalWords = wordCount ?? 0
  const due = dueCount ?? 0

  // Trusted (drillable) deck verbs gate the Conjugaison card (active at ≥5).
  const trustedVerbCount = buildDrillPool(
    (deckVerbs ?? []).map((w) => {
      const def = w.definition as { pos?: string } | null
      return { pos: def?.pos, word: w.word as string, lemma: w.lemma as string | null }
    }),
  ).length
  const drillUnlocked = trustedVerbCount >= DRILL_UNLOCK_THRESHOLD

  // Dictionary card state + the "has this account ever reviewed" signal (Σ reps, monotonic) that
  // splits the caught-up hero (Durmiendo) from the before-first-review hero (Animando).
  const { unlocked: dictUnlocked, memorizedCount, totalReviews } = await getDictionaryState(supabase)
  const hasReviewedBefore = totalReviews > 0

  // Effort estimate via the shared helper (same formula the /review entry landing uses).
  const minutes = estimateMinutes(due, (logs ?? []).map((l) => l.time_ms as number))

  type CardEmbed = WordCard & { reps: number }
  const previews: CollectionPreview[] = (recent ?? []).slice(0, PREVIEW_COUNT).map((w) => {
    const def = w.definition as Record<string, unknown> | null
    // to-one embed (UNIQUE word_id) → object; normalize so status reads correctly.
    const card = oneEmbed(w.review_cards as unknown as CardEmbed | CardEmbed[] | null)
    return {
      id: w.id as string,
      word: w.word as string,
      defEs: typeof def?.es === 'string' ? def.es : '',
      card,
    }
  })

  const { hero, collection } = resolveHomeState({ wordCount: totalWords, dueCount: due, hasReviewedBefore })

  return (
    <div className="flex flex-col flex-1">
      {/* Flips the sticky dictionary-unlock flag on app load once ≥10 words are memorized. */}
      <UnlockSync />
      <div className="flex-1 px-5 pb-[22px] pt-1.5 flex flex-col gap-[14px]">
        {/* Review hero — the loudest element; a crème+ SURFACE, never amber-filled. */}
        <ReviewHero state={hero} count={due} minutes={minutes} mode={mode} />

        {/* "Continuer avec Paco" — the function rail. Horizontally-scrollable, equal-height (132px)
            cards; Ajouter is the feature card, the two gated functions render their existing-gate
            locked variant below threshold. Full-bleed (-mx-5) with a right-edge fade. */}
        <p className="px-0.5 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          {resolveChrome(HOME_CHROME.continueWithPaco, mode)}
        </p>
        <div className="-mx-5 relative">
          <div className="flex gap-[11px] overflow-x-auto no-scrollbar px-5 pb-[14px]">
            <HubCard
              feature
              href="/add"
              icon={<Plus size={19} strokeWidth={1.9} />}
              title={resolveChrome(HOME_CHROME.addTitle, mode)}
              desc={resolveChrome(HOME_CHROME.addDesc, mode)}
              className="w-[182px] h-[132px] shrink-0"
            />
            <HubCard
              href="/discover"
              icon={<Compass size={19} strokeWidth={1.9} />}
              title={resolveChrome(HOME_CHROME.discoverTitle, mode)}
              desc={resolveChrome(HOME_CHROME.discoverDesc, mode)}
              className="w-[182px] h-[132px] shrink-0"
            />
            {drillUnlocked ? (
              <HubCard
                href="/drill"
                icon={<Rows3 size={19} strokeWidth={1.9} />}
                title={resolveChrome(HOME_CHROME.conjTitle, mode)}
                desc={resolveChrome(HOME_CHROME.conjDesc, mode)}
                className="w-[182px] h-[132px] shrink-0"
              />
            ) : (
              <HubCardLocked
                icon={<Rows3 size={19} strokeWidth={1.7} />}
                title={resolveChrome(HOME_CHROME.conjTitle, mode)}
                have={trustedVerbCount}
                need={DRILL_UNLOCK_THRESHOLD}
                unit={resolveChrome(HOME_CHROME.conjUnit, mode)}
                className="w-[182px] h-[132px] shrink-0"
              />
            )}
            {dictUnlocked ? (
              <HubCard
                href="/dictionary"
                icon={<BookA size={19} strokeWidth={1.9} />}
                title={resolveChrome(HOME_CHROME.dictTitle, mode)}
                desc={resolveChrome(HOME_CHROME.dictDesc, mode)}
                className="w-[182px] h-[132px] shrink-0"
              />
            ) : (
              <HubCardLocked
                icon={<BookA size={19} strokeWidth={1.7} />}
                title={resolveChrome(HOME_CHROME.dictTitle, mode)}
                have={memorizedCount}
                need={DICTIONARY_UNLOCK_THRESHOLD}
                unit={resolveChrome(HOME_CHROME.dictUnit, mode)}
                className="w-[182px] h-[132px] shrink-0"
              />
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-[14px] right-0 w-10 bg-[linear-gradient(90deg,transparent,var(--color-page))]"
          />
        </div>

        {/* Ta collection — header + recent preview, joined by an amber accent rail. */}
        <div className="pt-1" />
        <CollectionSection state={collection} previews={previews} totalCount={totalWords} mode={mode} />
      </div>
    </div>
  )
}
