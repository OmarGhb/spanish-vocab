import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { oneEmbed } from '@/lib/word-status'
import { posAbbrev } from '@/lib/discovery'
import { coerceImmersionMode, resolveChrome, DETAIL_CHROME, type ImmersionMode } from '@/lib/immersion'
import AudioButton from '../../AudioButton'
import StatusPill from '../../StatusPill'
import MasteryGauge from '../../MasteryGauge'
import WordDetailContent from './WordDetailContent'
import WordDetailActions from './WordDetailActions'

function statsLine(reps: number, lastReview: string | null, mode: ImmersionMode): string {
  if (reps === 0 || !lastReview) return resolveChrome(DETAIL_CHROME.notReviewedYet, mode)
  const todayMs = new Date(new Date().toDateString()).getTime()
  const lastMs = new Date(new Date(lastReview).toDateString()).getTime()
  const days = Math.round((todayMs - lastMs) / 86_400_000)
  if (mode === 'fr_es') {
    const when =
      days === 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} jour${days > 1 ? 's' : ''}`
    return `Révisé ${reps} fois — dernière révision ${when}`
  }
  const when = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} día${days > 1 ? 's' : ''}`
  return `Repasada ${reps} ${reps > 1 ? 'veces' : 'vez'} — último repaso ${when}`
}

type CardRow = { state: number; due: string; stability: number; reps: number; last_review: string | null }

export default async function WordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from('words')
      .select('id, word, definition, examples, distractors, form_annotation, lemma, audio_urls, origin, discovery_status, review_cards(state, due, stability, reps, last_review)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('profiles').select('immersion_mode').maybeSingle(),
  ])

  if (!data) notFound()

  const mode = coerceImmersionMode(profile?.immersion_mode)

  // A discovery word that isn't promoted yet is partial (no es definition, no distractors,
  // no review card) — never render it as a real collection word.
  if (data.origin === 'discovery' && data.discovery_status !== 'promoted') notFound()

  // to-one embed (UNIQUE word_id) → object; normalize for the stats/status read.
  const card = oneEmbed(data.review_cards as unknown as CardRow | CardRow[] | null)

  const stats = statsLine(card?.reps ?? 0, card?.last_review ?? null, mode)

  const def = data.definition as Record<string, unknown> | null
  const defEs = typeof def?.es === 'string' ? def.es : ''
  const defFr = typeof def?.fr === 'string' ? def.fr : null
  const defPos = typeof def?.pos === 'string' ? def.pos : undefined
  // Inline abbreviated POS (board §3) — gender rides in the n.m./n.f. abbreviation.
  const pos = defPos ? posAbbrev(defPos) : null
  const formAnnotation = typeof data.form_annotation === 'string' ? data.form_annotation : null
  const audioUrls = data.audio_urls as { es_ES: string } | null
  const examples = Array.isArray(data.examples)
    ? (data.examples as { es: string; fr: string }[])
    : []
  const distractors = Array.isArray(data.distractors) ? (data.distractors as string[]) : []

  return (
    <div className="flex flex-col flex-1">
      <div className="p-5 pb-10 flex flex-col gap-4">
        {/* Top bar: labeled back + ⋮ overflow menu (Relearn / Supprimer). */}
        <div className="flex items-center justify-between">
          <Link
            href="/words"
            className="inline-flex items-center gap-1 -ml-1 text-sm font-semibold text-muted"
          >
            <ChevronLeft size={18} />
            {resolveChrome(DETAIL_CHROME.myWordsBack, mode)}
          </Link>
          <WordDetailActions wordId={data.id as string} word={data.word as string} mode={mode} />
        </div>

        {/* Status pill + 4-dot mastery gauge (same components as the rows). */}
        <div className="flex items-center gap-3">
          <StatusPill card={card ?? null} mode={mode} />
          <MasteryGauge card={card ?? null} mode={mode} />
        </div>

        {/* Word heading + inline abbreviated POS (baseline) + audio. */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="font-serif text-[32px] font-bold text-ink leading-none tracking-[-0.02em]">
              {data.word}
            </h1>
            {pos && <span className="text-[14.5px] font-medium text-muted">{pos}</span>}
          </div>
          <AudioButton word={data.word} audioUrl={audioUrls?.es_ES} />
        </div>

        {/* Interactive content: reveals, examples, distractors */}
        <WordDetailContent
          word={data.word}
          defEs={defEs}
          defFr={defFr}
          pos={defPos}
          formAnnotation={formAnnotation}
          examples={examples}
          distractors={distractors}
          mode={mode}
        />

        {/* Stats line */}
        <p className="text-xs text-faint">{stats}</p>
      </div>
    </div>
  )
}
