import { createClient } from '@/lib/supabase/server'

// Single-word delete. RLS on `words` scopes to the user; the explicit user_id
// match is belt-and-suspenders. FK cascade cleans the children
// (review_cards.word_id → words, review_logs.card_id → review_cards, both
// ON DELETE CASCADE — verified against the live schema), so no manual cleanup.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const wordId = id.trim()

  if (!wordId) {
    return Response.json({ error: 'id is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { error } = await supabase.from('words').delete().eq('id', wordId).eq('user_id', user.id)

  if (error) {
    console.error('[words/delete] delete failed:', error.message)
    return Response.json({ error: 'Failed to delete word.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
