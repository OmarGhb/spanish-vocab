import { createClient } from '@/lib/supabase/server'
import { oneEmbed, type WordCard } from '@/lib/word-status'
import WordList from './WordList'

export type WordListItem = {
  id: string
  word: string
  defEs: string
  createdAt: string
  card: WordCard | null
  reps: number
}

export default async function WordsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('words')
    .select('id, word, definition, created_at, review_cards(state, due, stability, reps)')
    // Discovery rows that aren't promoted yet (pending/kept/known) are partial — exclude them.
    .or('origin.eq.manual,discovery_status.eq.promoted')
    .order('created_at', { ascending: false })

  type CardEmbed = WordCard & { reps: number }
  const items: WordListItem[] = (data ?? []).map((w) => {
    const def = w.definition as Record<string, unknown> | null
    // review_cards is a to-one embed (UNIQUE word_id) → object; normalize for safety.
    const card = oneEmbed(w.review_cards as unknown as CardEmbed | CardEmbed[] | null)
    return {
      id: w.id as string,
      word: w.word as string,
      // Null-safe: legacy rows may carry a malformed definition shape.
      defEs: typeof def?.es === 'string' ? def.es : '',
      createdAt: w.created_at as string,
      card,
      reps: card?.reps ?? 0,
    }
  })

  return <WordList items={items} />
}
