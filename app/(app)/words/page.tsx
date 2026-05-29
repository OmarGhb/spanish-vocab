import { createClient } from '@/lib/supabase/server'
import type { WordCard } from '@/lib/word-status'
import WordList from './WordList'

export type WordListItem = {
  id: string
  word: string
  defEs: string
  createdAt: string
  card: WordCard | null
}

export default async function WordsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('words')
    .select('id, word, definition, created_at, review_cards(state, due, stability)')
    .order('created_at', { ascending: false })

  const items: WordListItem[] = (data ?? []).map((w) => {
    const def = w.definition as Record<string, unknown> | null
    const cards = w.review_cards as unknown as WordCard[]
    return {
      id: w.id as string,
      word: w.word as string,
      // Null-safe: legacy rows may carry a malformed definition shape.
      defEs: typeof def?.es === 'string' ? def.es : '',
      createdAt: w.created_at as string,
      card: cards?.[0] ?? null,
    }
  })

  return <WordList items={items} />
}
