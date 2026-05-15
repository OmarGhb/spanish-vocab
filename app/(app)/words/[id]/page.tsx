import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AudioButton from '../../AudioButton'
import WordDetailContent from './WordDetailContent'

function statusPill(state: number, due: string): { label: string; cls: string } {
  if (state === 0) return { label: 'Nouveau', cls: 'bg-surface-alt text-muted' }
  if (state === 1) return { label: 'En apprentissage', cls: 'bg-tint text-accent' }
  if (state === 2 && new Date(due) <= new Date()) return { label: 'À réviser', cls: 'bg-accent/10 text-accent' }
  if (state === 2) return { label: 'Mémorisé', cls: 'bg-ok/10 text-ok' }
  return { label: 'À rappeler', cls: 'bg-err/10 text-err' }
}

function statsLine(reps: number, lastReview: string | null): string {
  if (reps === 0 || !lastReview) return 'Pas encore révisé'
  const todayMs = new Date(new Date().toDateString()).getTime()
  const lastMs = new Date(new Date(lastReview).toDateString()).getTime()
  const days = Math.round((todayMs - lastMs) / 86_400_000)
  const when =
    days === 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} jour${days > 1 ? 's' : ''}`
  return `Révisé ${reps} fois — dernière révision ${when}`
}

type CardRow = { state: number; due: string; reps: number; last_review: string | null }

export default async function WordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('words')
    .select('id, word, definition, examples, distractors, form_annotation, lemma, audio_urls, review_cards(state, due, reps, last_review)')
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()

  const card = (data.review_cards as unknown as CardRow[])[0]

  const pill = card ? statusPill(card.state, card.due) : { label: 'Nouveau', cls: 'bg-surface-alt text-muted' }
  const stats = card ? statsLine(card.reps, card.last_review) : 'Pas encore révisé'

  const def = data.definition as Record<string, unknown> | null
  const defEs = typeof def?.es === 'string' ? def.es : ''
  const defFr = typeof def?.fr === 'string' ? def.fr : null
  const defPos = typeof def?.pos === 'string' ? def.pos : undefined
  const formAnnotation = typeof data.form_annotation === 'string' ? data.form_annotation : null
  const audioUrls = data.audio_urls as { es_ES: string } | null
  const examples = Array.isArray(data.examples)
    ? (data.examples as { es: string; fr: string }[])
    : []
  const distractors = Array.isArray(data.distractors) ? (data.distractors as string[]) : []

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <div className="p-5 flex flex-col gap-5">
        <Link href="/" className="text-muted text-sm self-start">←</Link>

        {/* Status pill */}
        <span className={`self-start text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${pill.cls}`}>
          {pill.label}
        </span>

        {/* Word heading + audio */}
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-3xl font-bold text-ink leading-none">{data.word}</h1>
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
        />

        {/* Stats line */}
        <p className="text-xs text-muted">{stats}</p>
      </div>
    </div>
  )
}
