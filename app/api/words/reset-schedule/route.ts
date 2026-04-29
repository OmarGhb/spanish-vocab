import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const wordId =
    body !== null && typeof body === 'object' && 'wordId' in body && typeof body.wordId === 'string'
      ? (body.wordId as string).trim()
      : ''

  if (!wordId) {
    return Response.json({ error: 'wordId is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // RLS on review_cards ensures only this user's cards are updated.
  const { error } = await supabase
    .from('review_cards')
    .update({ due: new Date().toISOString() })
    .eq('word_id', wordId)

  if (error) {
    return Response.json({ error: 'Failed to reset schedule.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
