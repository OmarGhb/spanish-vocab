import Image from 'next/image'
import Link from 'next/link'
import { BookA, Lock, Clock, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { oneEmbed, type WordCard } from '@/lib/word-status'
import { DICTIONARY_UNLOCK_THRESHOLD, getDictionaryState } from '@/lib/dictionary'
import { buildDrillPool } from '@/lib/drill'
import { estimateMinutes, RECENT_LOGS_WINDOW } from '@/lib/review-estimate'
import WordRow from './WordRow'
import Display from './Display'
import Button from './Button'
import UnlockSync from './UnlockSync'
import DrillCard from './DrillCard'

export default async function HomePage() {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const [{ count: wordCount }, { count: dueCount }, { data: recent }, { data: logs }, { data: deckVerbs }] =
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
    ])

  const totalWords = wordCount ?? 0
  const due = dueCount ?? 0

  // Trusted (drillable) deck verbs gate the Conjugaison card (active at ≥5).
  const trustedVerbCount = buildDrillPool(
    (deckVerbs ?? []).map((w) => {
      const def = w.definition as { pos?: string } | null
      return { pos: def?.pos, word: w.word as string, lemma: w.lemma as string | null }
    }),
  ).length

  // Dictionary card state (memorized count is a JS-side filter, not a head count).
  const { unlocked: dictUnlocked, memorizedCount } = await getDictionaryState(supabase)
  const dictProgress = Math.min(memorizedCount, DICTIONARY_UNLOCK_THRESHOLD)

  // Effort estimate via the shared helper (same formula the /review entry landing uses).
  const minutes = estimateMinutes(due, (logs ?? []).map((l) => l.time_ms as number))

  type CardEmbed = WordCard & { reps: number }
  const previews = (recent ?? []).map((w) => {
    const def = w.definition as Record<string, unknown> | null
    // to-one embed (UNIQUE word_id) → object; normalize so status reads correctly.
    const card = oneEmbed(w.review_cards as unknown as CardEmbed | CardEmbed[] | null)
    return {
      id: w.id as string,
      word: w.word as string,
      defEs: typeof def?.es === 'string' ? def.es : '',
      card,
      reps: card?.reps ?? 0,
    }
  })

  return (
    <div className="flex flex-col flex-1">
      {/* Flips the sticky dictionary-unlock flag on app load once ≥10 words are memorized. */}
      <UnlockSync />
      <div className="flex-1 px-5 pb-5 pt-3 flex flex-col gap-6">
        {/* Review status — the loudest element. The re-skinned crème+ hero (board ①), relocated
            here from /review (which now auto-starts). A SURFACE, never amber-filled. */}
        {due > 0 ? (
          <div className="bg-surface-alt border-[1.5px] border-tinted-border rounded-card shadow-card px-[22px] pt-5 pb-[18px]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-deep">Révision disponible</p>
              <span className="flex items-center gap-1 text-[13px] text-muted shrink-0">
                <Clock size={13} /> ≈ {minutes} min
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <Display kind="count" className="text-[44px] leading-none text-ink">{due}</Display>
              <span className="font-serif text-[19px] font-bold text-ink">mot{due !== 1 ? 's' : ''} à revoir</span>
            </div>
            <div className="mt-4">
              <Button variant="primary" full href="/review">Commencer la révision →</Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-line rounded-card p-5 flex flex-col items-start gap-2">
            <div className="w-9 h-9 rounded-full bg-ok/10 text-ok flex items-center justify-center text-lg leading-none">
              ✓
            </div>
            <p className="font-serif text-xl font-bold text-ink">Tout est à jour</p>
            <p className="text-sm text-muted">
              Tu as révisé tous tes mots du jour. Reviens un peu plus tard.
            </p>
          </div>
        )}

        {/* Conjugaison drill — the first game mode. Active at ≥5 trusted verbs, else soft-locked. */}
        <DrillCard count={trustedVerbCount} />

        {/* Dictionary card — secondary, below the Review CTA so it never competes with it.
            A calm SURFACE, never amber-filled (carte ≠ contrôle). Icon = the swappable BookA
            placeholder (final pick deferred to the Accueil pass). */}
        {dictUnlocked ? (
          <Link
            href="/dictionary"
            className="flex items-center gap-3.5 bg-card border border-line rounded-2xl shadow-card px-[18px] py-4"
          >
            <span className="w-[46px] h-[46px] rounded-xl bg-amber-light text-amber-deep flex items-center justify-center shrink-0">
              <BookA size={26} strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-[17px] font-bold text-ink tracking-[-0.01em]">Ton dictionnaire</p>
              <p className="text-[13.5px] text-muted mt-0.5">
                {memorizedCount} mot{memorizedCount !== 1 ? 's' : ''}
              </p>
            </div>
            <ChevronRight size={20} strokeWidth={2} className="text-faint shrink-0" />
          </Link>
        ) : (
          <Link
            href="/dictionary"
            className="flex items-center gap-3.5 bg-transparent border-[1.5px] border-dashed border-tinted-border rounded-2xl px-[18px] py-4"
          >
            <span className="w-[46px] h-[46px] rounded-xl bg-surface-alt text-faint flex items-center justify-center shrink-0">
              <Lock size={20} strokeWidth={1.9} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-base font-bold text-muted tracking-[-0.01em]">Ton dictionnaire personnel</p>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(dictProgress / DICTIONARY_UNLOCK_THRESHOLD) * 100}%` }} />
                </div>
                <span className="text-[12.5px] font-semibold text-faint whitespace-nowrap tabular-nums">
                  {dictProgress}/{DICTIONARY_UNLOCK_THRESHOLD} mémorisés
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Ta collection — quieter ambient context, taps through to the full list */}
        <Link href="/words" className="flex items-baseline justify-between border-t border-line pt-[18px]">
          <p className="font-serif font-bold text-[10px] uppercase tracking-[0.16em] text-muted">
            Ta collection
          </p>
          <span className="font-serif text-[14px] text-muted">
            {totalWords} mot{totalWords !== 1 ? 's' : ''} enregistré{totalWords !== 1 ? 's' : ''}
          </span>
        </Link>

        {/* Short preview of the most recent words */}
        {previews.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {previews.map((p) => (
              <WordRow key={p.id} id={p.id} word={p.word} defEs={p.defEs} card={p.card} />
            ))}
          </ul>
        ) : (
          <div className="bg-card rounded-card shadow-card p-6 flex flex-col items-center gap-3 text-center">
            <Image src="/paco-pensando.png" alt="Paco" width={110} height={110} className="object-contain" />
            <p className="text-sm text-muted">Paco attend ton premier mot !</p>
          </div>
        )}
      </div>
    </div>
  )
}
