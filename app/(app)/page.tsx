import Image from 'next/image'
import Link from 'next/link'
import { BookA, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { oneEmbed, type WordCard } from '@/lib/word-status'
import { DICTIONARY_UNLOCK_THRESHOLD, getDictionaryState } from '@/lib/dictionary'
import WordRow from './WordRow'
import EstimateInfo from './EstimateInfo'
import UnlockSync from './UnlockSync'

const COLD_START_MS = 12_000 // flat per-card estimate before we have enough data
const MIN_USABLE_LOGS = 20
const RECENT_LOGS_WINDOW = 200

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export default async function HomePage() {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const [{ count: wordCount }, { count: dueCount }, { data: recent }, { data: logs }] =
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
    ])

  const totalWords = wordCount ?? 0
  const due = dueCount ?? 0

  // Dictionary card state (memorized count is a JS-side filter, not a head count).
  const { unlocked: dictUnlocked, memorizedCount } = await getDictionaryState(supabase)
  const dictProgress = Math.min(memorizedCount, DICTIONARY_UNLOCK_THRESHOLD)

  // Effort estimate: median time-per-card over recent logs (outlier-robust),
  // falling back to a flat per-card cost until we have enough data.
  const times = (logs ?? []).map((l) => l.time_ms as number).filter((t) => t > 0)
  const perCardMs = times.length >= MIN_USABLE_LOGS ? median(times) ?? COLD_START_MS : COLD_START_MS
  const minutes = Math.max(1, Math.round((due * perCardMs) / 60_000))

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
        {/* Review status — the loudest element */}
        {due > 0 ? (
          <div className="bg-tint border border-accent/30 rounded-card p-5 flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">Révision disponible</p>
            <p className="font-serif text-2xl font-bold text-ink leading-tight mt-1">
              {due} mot{due !== 1 ? 's' : ''} à revoir
            </p>
            <div className="mt-1.5">
              <EstimateInfo minutes={minutes} />
            </div>
            <Link
              href="/review"
              className="bg-accent text-white rounded-card py-3.5 text-center font-serif font-semibold text-sm mt-5"
            >
              Commencer la révision →
            </Link>
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

        {/* Dictionary card — secondary, below the Review CTA so it never competes with it */}
        {dictUnlocked ? (
          <Link
            href="/dictionary"
            className="flex items-center gap-3 bg-card border border-line rounded-card p-4"
          >
            <span className="w-10 h-10 rounded-full bg-tint text-accent flex items-center justify-center shrink-0">
              <BookA size={20} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-base font-bold text-ink leading-none">Ton dictionnaire</p>
              <p className="text-sm text-muted mt-1">
                {memorizedCount} mot{memorizedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href="/dictionary"
            className="flex items-center gap-3 bg-card border border-dashed border-line rounded-card p-4"
          >
            <span className="w-10 h-10 rounded-full bg-surface-alt text-muted flex items-center justify-center shrink-0">
              <Lock size={18} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-base font-bold text-ink leading-none">Ton dictionnaire personnel</p>
              <p className="text-sm text-muted mt-1">{dictProgress}/10 mémorisés</p>
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
              <WordRow key={p.id} id={p.id} word={p.word} defEs={p.defEs} card={p.card} reps={p.reps} />
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
