import { createClient } from '@/lib/supabase/server'
import { createInitialCard } from '@/lib/fsrs'
import { z } from 'zod'

const SaveBodySchema = z.object({
  word: z.string().min(1),
  definition: z.object({ es: z.string().min(1), fr: z.string().min(1), pos: z.string().optional() }),
  examples: z
    .array(z.object({ es: z.string().min(1), fr: z.string().min(1) }))
    .min(2)
    .max(3),
  distractors: z.array(z.string().min(1)).min(3).max(3),
  lemma: z.string().min(1).optional(),
  form_annotation: z.string().min(1).nullable().optional(),
  audio_urls: z.object({ es_ES: z.string() }).nullable().optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = SaveBodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { word, definition, examples, distractors, lemma, form_annotation, audio_urls } = parsed.data

  const { data: savedWord, error: wordError } = await supabase
    .from('words')
    .insert({ user_id: user.id, word, definition, examples, distractors, lemma, form_annotation, audio_urls })
    .select('id')
    .single()

  if (wordError || !savedWord) {
    console.error('Save error:', wordError)
    return Response.json({ error: 'Failed to save word.' }, { status: 500 })
  }

  const card = createInitialCard()

  const { error: cardError } = await supabase.from('review_cards').insert({
    word_id: savedWord.id,
    user_id: user.id,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  })

  if (cardError) {
    console.error('Card create error:', cardError)
    // Roll back the word insert so we don't end up with an orphaned row.
    await supabase.from('words').delete().eq('id', savedWord.id)
    return Response.json({ error: 'Failed to create review card.' }, { status: 500 })
  }

  // Return the new word id so the add-flow ⑥ single-success WordRow can link to it.
  return Response.json({ ok: true, id: savedWord.id })
}
