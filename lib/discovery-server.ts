import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getDiscoveryBatch } from './anthropic'
import type { DiscoveryTopic } from './discovery-topics'
import type { CollectionCard, Gender } from './discovery'

// Server-side discovery helpers shared by the pool-first `/session` route and the legacy `/generate`
// fallback, so the per-user live-generation body lives in exactly one place.

export type DiscoveryWordRow = {
  id: string
  word: string
  definition: { es?: string; fr?: string; pos?: string; gender?: Gender } | null
  examples: Array<{ es: string; fr: string }> | null
}

export const DISCOVERY_WORD_COLS = 'id, word, definition, examples'

export function rowToCard(row: DiscoveryWordRow): CollectionCard {
  const def = row.definition ?? {}
  const example = row.examples?.[0] ?? { es: '', fr: '' }
  return {
    id: row.id,
    word: row.word,
    fr: typeof def.fr === 'string' ? def.fr : '',
    pos: typeof def.pos === 'string' ? def.pos : '',
    gender: def.gender === 'm' || def.gender === 'f' ? def.gender : null,
    example,
  }
}

// Every word the user already has, in ANY state — the discovery exclude list.
export async function fetchUserWords(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from('words').select('word')
  if (error) throw error
  return (data ?? []).map((r) => r.word as string)
}

// Insert discovery cards into the user's collection as `pending` rows (the exact shape both the live
// generator and the pool draw use). gender lives inside the definition JSONB (no new column).
export async function insertPendingCards(
  supabase: SupabaseClient,
  userId: string,
  topicKey: string,
  cards: Array<Pick<CollectionCard, 'word' | 'fr' | 'pos' | 'gender' | 'example'>>,
): Promise<CollectionCard[]> {
  const insertRows = cards.map((c) => ({
    user_id: userId,
    word: c.word.trim(),
    origin: 'discovery' as const,
    discovery_status: 'pending' as const,
    discovery_topic: topicKey,
    definition: { es: '', fr: c.fr, pos: c.pos, gender: c.gender },
    examples: [c.example],
    distractors: [] as string[],
  }))
  const { data, error } = await supabase.from('words').insert(insertRows).select(DISCOVERY_WORD_COLS)
  if (error || !data) throw error ?? new Error('insert failed')
  return (data as DiscoveryWordRow[]).map(rowToCard)
}

// Live per-user generation (today's path) — the primary for the legacy `/generate` route and the
// exhaustion fallback for `/session`. Throws on Anthropic error / AbortError; the caller maps to a
// status code. `band` from the batch is ignored here (words has no band column — band lives in the pool).
export async function runLiveDiscovery(
  supabase: SupabaseClient,
  userId: string,
  topic: DiscoveryTopic,
  excludeWords: string[],
  signal?: AbortSignal,
): Promise<CollectionCard[]> {
  const excludeSet = new Set(excludeWords.map((w) => w.toLowerCase()))
  const entries = await getDiscoveryBatch(topic.es, topic.count, excludeWords, signal)

  const seen = new Set<string>()
  const fresh = entries.filter((e) => {
    const key = e.word.trim().toLowerCase()
    if (!key || excludeSet.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (fresh.length === 0) return []

  return insertPendingCards(
    supabase,
    userId,
    topic.key,
    fresh.map((e) => ({ word: e.word, fr: e.fr, pos: e.pos, gender: e.gender, example: e.example })),
  )
}
