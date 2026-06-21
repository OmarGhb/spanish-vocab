import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { scheduleCard, type Card } from '@/lib/fsrs'

const ReviewRequestSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  timeMs: z.number().int().nonnegative(),
  hintUsed: z.boolean(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = ReviewRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { cardId, rating, timeMs, hintUsed } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: row, error: fetchError } = await supabase
    .from('review_cards')
    .select('*')
    .eq('id', cardId)
    .single()

  if (fetchError || !row) {
    return Response.json({ error: 'Card not found.' }, { status: 404 })
  }

  // Reconstruct the ts-fsrs Card from stored columns.
  // learning_steps was added in ts-fsrs v5; default to 0 for rows created before that column existed.
  const currentCard: Card = {
    due: new Date(row.due as string),
    stability: row.stability as number,
    difficulty: row.difficulty as number,
    elapsed_days: row.elapsed_days as number,
    scheduled_days: row.scheduled_days as number,
    reps: row.reps as number,
    lapses: row.lapses as number,
    learning_steps: (row.learning_steps as number | null) ?? 0,
    state: row.state as Card['state'],
    last_review: row.last_review ? new Date(row.last_review as string) : undefined,
  }

  const now = new Date()
  const next = scheduleCard(currentCard, rating, now)

  // All FSRS fields come from the ts-fsrs result — never carry the old values.
  const { error: updateError } = await supabase
    .from('review_cards')
    .update({
      due: next.due.toISOString(),
      stability: next.stability,
      difficulty: next.difficulty,
      elapsed_days: next.elapsed_days,
      scheduled_days: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      learning_steps: next.learning_steps,
      state: next.state,
      last_review: next.last_review ? next.last_review.toISOString() : null,
    })
    .eq('id', cardId)

  if (updateError) {
    return Response.json({ error: 'Failed to update card.' }, { status: 500 })
  }

  // Log the review. If this insert fails we accept it — the card state is already
  // written and losing the log is less harmful than leaving the card un-advanced.
  const { error: logError } = await supabase.from('review_logs').insert({
    // review_logs is keyed by card_id (uuid, NOT NULL → review_cards); it has no word_id column.
    // cardId is the validated request id this handler fetched and updated the card by (=== row.id).
    card_id: cardId,
    user_id: user.id,
    rating,
    reviewed_at: now.toISOString(),
    scheduled_days: next.scheduled_days,
    time_ms: timeMs,
    hint_used: hintUsed,
  })

  if (logError) {
    // Non-fatal (the card is already advanced — don't 500 the review over a lost log), but now that
    // the insert should succeed, a failure here is a real unexpected error, not the known-broken baseline.
    console.error('[review] log insert failed (card already updated):', logError.message)
  }

  return Response.json({ ok: true })
}
