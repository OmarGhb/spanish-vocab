import type { createClient } from './supabase/server'
import { isMemorized, oneEmbed, type WordCard } from './word-status'

export const DICTIONARY_UNLOCK_THRESHOLD = 10

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type DictionaryEntry = {
  id: string
  word: string
  defEs: string
  audioUrl?: string
}

export type DictionaryState = {
  unlocked: boolean
  memorizedCount: number
  entries: DictionaryEntry[]
}

// READ-ONLY: never writes. The unlock flip lives in the syncDictionaryUnlock server action
// so it can't fire during an RSC render (a route prefetch would otherwise flip the flag).
export async function getDictionaryState(
  supabase: SupabaseServerClient,
): Promise<DictionaryState> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('dictionary_unlocked')
    .maybeSingle()
  const unlocked = profile?.dictionary_unlocked === true

  // Exact same origin filter as /words (app/(app)/words/page.tsx) so the dictionary is
  // strictly the memorized SUBSET of Mes mots — no word in one but not the other.
  const { data } = await supabase
    .from('words')
    .select('id, word, definition, audio_urls, review_cards(state, due, stability)')
    .or('origin.eq.manual,discovery_status.eq.promoted')

  const entries: DictionaryEntry[] = (data ?? [])
    .map((w): DictionaryEntry | null => {
      // review_cards is a to-one embed (UNIQUE word_id) → object; normalize, never index [0].
      const card = oneEmbed(w.review_cards as unknown as WordCard | WordCard[] | null)
      if (!isMemorized(card)) return null
      const def = w.definition as Record<string, unknown> | null
      const audio = w.audio_urls as { es_ES?: string } | null
      return {
        id: w.id as string,
        word: w.word as string,
        // Spanish-first: the inline gloss is the Spanish definition, like every other surface.
        defEs: typeof def?.es === 'string' ? def.es : '',
        audioUrl: typeof audio?.es_ES === 'string' ? audio.es_ES : undefined,
      }
    })
    .filter((e): e is DictionaryEntry => e !== null)

  return { unlocked, memorizedCount: entries.length, entries }
}

// ── A–Z bucketing (pure, unit-tested) ───────────────────────────────────────
// Spanish collation: Ñ is its own letter, sorted AFTER N. Diacritics are stripped
// for BUCKETING ONLY (á→A) — the displayed word keeps its accents.

export const AZ_BUCKETS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const

export type Bucket = (typeof AZ_BUCKETS)[number] | '#'

// Spanish accented vowels fold to their base letter for bucketing. ñ is NOT here —
// it is its own bucket and is handled before this map.
const ACCENT_FOLD: Record<string, string> = {
  Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U',
}

export function bucketOf(word: string): Bucket {
  const first = word.trim().charAt(0)
  if (first === '') return '#'
  // ñ must be checked BEFORE folding — it is its own letter, sorted after N.
  if (first === 'ñ' || first === 'Ñ') return 'Ñ'
  const upper = first.toUpperCase()
  const base = ACCENT_FOLD[upper] ?? upper
  return (AZ_BUCKETS as readonly string[]).includes(base) ? (base as Bucket) : '#'
}

export type DictionarySection = { letter: Bucket; entries: DictionaryEntry[] }

// Groups entries into ordered, non-empty sections (A…N, Ñ, O…Z, then '#').
// Within a section, sorts by Spanish locale (accent-insensitive primary order).
export function groupAZ(entries: DictionaryEntry[]): DictionarySection[] {
  const order: Bucket[] = [...AZ_BUCKETS, '#']
  const map = new Map<Bucket, DictionaryEntry[]>()
  for (const e of entries) {
    const b = bucketOf(e.word)
    const list = map.get(b)
    if (list) list.push(e)
    else map.set(b, [e])
  }
  const sections: DictionarySection[] = []
  for (const letter of order) {
    const list = map.get(letter)
    if (!list || list.length === 0) continue
    list.sort((a, b) => a.word.localeCompare(b.word, 'es'))
    sections.push({ letter, entries: list })
  }
  return sections
}
