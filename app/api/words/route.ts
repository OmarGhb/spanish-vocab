import { createClient } from '@/lib/supabase/server'
import { getWordData, type WordData } from '@/lib/anthropic'
import { createInitialCard } from '@/lib/fsrs'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const word =
    body !== null && typeof body === 'object' && 'word' in body && typeof body.word === 'string'
      ? body.word.trim()
      : ''

  if (!word) {
    return Response.json({ error: 'Word cannot be empty.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let wordData: WordData
  try {
    wordData = await getWordData(word, request.signal)
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Anthropic call failed.' },
      { status: 500 }
    )
  }

  const { data: savedWord, error: wordError } = await supabase
    .from('words')
    .insert({
      user_id: user.id,
      word,
      definition: wordData.definition,
      examples: wordData.examples,
      distractors: wordData.distractors,
    })
    .select('id')
    .single()

  if (wordError || !savedWord) {
    return Response.json({ error: 'Failed to save word to database.' }, { status: 500 })
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
    // Roll back the word insert so we don't end up with an orphaned row.
    await supabase.from('words').delete().eq('id', savedWord.id)
    return Response.json({ error: 'Failed to create review card.' }, { status: 500 })
  }

  const { count } = await supabase
    .from('review_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  console.log(`[sanity] review_cards for user ${user.id}: ${count}`)

  return Response.json({
    word,
    definition: wordData.definition,
    examples: wordData.examples,
    distractors: wordData.distractors,
  })
}
