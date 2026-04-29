import { createClient } from '@/lib/supabase/server'
import { getWordData, type WordData } from '@/lib/anthropic'

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

  let wordData: WordData
  try {
    wordData = await getWordData(word, request.signal)
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Anthropic call failed.' },
      { status: 500 }
    )
  }

  // Duplicate check — RLS scopes query to the authenticated user automatically.
  // ilike without wildcards = exact case-insensitive match.
  const { data: existing } = await supabase
    .from('words')
    .select('id, review_cards(id, due)')
    .ilike('word', word)
    .limit(1)
    .maybeSingle()

  const row = existing as { id: string; review_cards: Array<{ id: string; due: string }> } | null

  let status: 'new' | 'due_now' | 'due_later' = 'new'
  let wordId: string | undefined
  let dueDate: string | undefined

  if (row) {
    const card = row.review_cards[0]
    wordId = row.id
    if (card) {
      dueDate = card.due
      status = new Date(card.due) <= new Date() ? 'due_now' : 'due_later'
    }
  }

  return Response.json({
    word,
    definition: wordData.definition,
    examples: wordData.examples,
    distractors: wordData.distractors,
    status,
    wordId,
    dueDate,
  })
}
