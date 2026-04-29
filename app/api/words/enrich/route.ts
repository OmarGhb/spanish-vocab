import { createClient } from '@/lib/supabase/server'
import { getWordData } from '@/lib/anthropic'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const word =
    body !== null && typeof body === 'object' && 'word' in body && typeof body.word === 'string'
      ? (body.word as string).trim()
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

  // Check deck first — ilike without wildcards = exact case-insensitive match.
  // RLS scopes query to the authenticated user automatically.
  const { data: existing } = await supabase
    .from('words')
    .select('id, word, definition, examples, distractors, review_cards(id, due)')
    .ilike('word', word)
    .limit(1)
    .maybeSingle()

  type ExistingRow = {
    id: string
    word: string
    definition: { es: string; fr: string; pos?: string }
    examples: Array<{ es: string; fr: string }>
    distractors: string[]
    review_cards: Array<{ id: string; due: string }>
  }

  const row = existing as ExistingRow | null

  if (row) {
    const card = row.review_cards[0]
    const dueDate = card?.due
    const status = dueDate && new Date(dueDate) <= new Date() ? 'due_now' : 'due_later'

    return Response.json({
      word: row.word,
      definition: row.definition,
      examples: row.examples,
      distractors: row.distractors,
      status,
      wordId: row.id,
      dueDate,
    })
  }

  // Not in deck — call Anthropic.
  let wordData
  try {
    wordData = await getWordData(word, request.signal)
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Anthropic call failed.' },
      { status: 500 }
    )
  }

  return Response.json({
    word,
    definition: wordData.definition,
    examples: wordData.examples,
    distractors: wordData.distractors,
    status: 'new',
  })
}
