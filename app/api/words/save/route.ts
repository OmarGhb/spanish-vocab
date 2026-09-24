import { createClient } from '@/lib/supabase/server'
import { createInitialCard } from '@/lib/fsrs'
import { z } from 'zod'
import { coerceSourceLocale, type SourceLocale } from '@/lib/immersion'

// Locale-aware gloss validation (M8 Phase 1a). Both sides optional at the type level; the side
// matching the saving user's source_locale is required by a refine, so an EN account can't store a
// French-only definition and vice versa. For locale 'fr' the accept/reject set is identical to the
// pre-Phase-1a schema — proven in lib/anthropic-schema.test.ts against an inlined copy of the old one.
const GlossSides = z.object({
  fr: z.string().min(1).optional(),
  en: z.string().min(1).optional(),
})
const requiresLocale = (locale: SourceLocale) => (o: { fr?: string; en?: string }) =>
  typeof o[locale] === 'string'

const SaveBodySchema = (locale: SourceLocale) =>
  z.object({
    word: z.string().min(1),
    definition: GlossSides.extend({ es: z.string().min(1), pos: z.string().optional() }).refine(
      requiresLocale(locale),
      { message: `definition.${locale} is required` },
    ),
    examples: z
      .array(
        GlossSides.extend({ es: z.string().min(1) }).refine(requiresLocale(locale), {
          message: `example.${locale} is required`,
        }),
      )
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // Validation is locale-keyed, so it has to run AFTER the user is resolved — the required gloss
  // side comes from their profile, never from the request body (which the client controls).
  const { data: profile } = await supabase.from('profiles').select('source_locale').maybeSingle()
  const locale = coerceSourceLocale(profile?.source_locale)

  const parsed = SaveBodySchema(locale).safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data.' }, { status: 400 })
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
