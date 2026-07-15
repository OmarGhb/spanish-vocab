import { createClient } from '@/lib/supabase/server'
import { getDiscoveryBatch } from '@/lib/anthropic'
import { getTopic } from '@/lib/discovery-topics'
import type { CollectionCard, Gender } from '@/lib/discovery'

export const maxDuration = 60

type WordRow = {
  id: string
  word: string
  definition: { es?: string; fr?: string; pos?: string; gender?: Gender } | null
  examples: Array<{ es: string; fr: string }> | null
}

function rowToCard(row: WordRow): CollectionCard {
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

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const topicKey =
    body !== null && typeof body === 'object' && 'topic' in body && typeof body.topic === 'string'
      ? body.topic
      : ''
  const topic = getTopic(topicKey)
  if (!topic) {
    return Response.json({ error: 'Unknown topic.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // 1. Resume — return any pending rows for this topic without calling Anthropic.
  const { data: pending, error: pendingError } = await supabase
    .from('words')
    .select('id, word, definition, examples')
    .eq('origin', 'discovery')
    .eq('discovery_topic', topic.key)
    .eq('discovery_status', 'pending')
    .order('created_at', { ascending: true })

  if (pendingError) {
    console.error('[discovery/generate] pending fetch error:', pendingError)
    return Response.json({ error: 'Failed to load collection.' }, { status: 500 })
  }
  if (pending && pending.length > 0) {
    return Response.json({ cards: (pending as WordRow[]).map(rowToCard) })
  }

  // 2. Build the exclude-list: every word the user already has, in ANY state.
  const { data: existing, error: existingError } = await supabase.from('words').select('word')
  if (existingError) {
    console.error('[discovery/generate] exclude fetch error:', existingError)
    return Response.json({ error: 'Failed to load collection.' }, { status: 500 })
  }
  const exclude = (existing ?? []).map((r) => (r.word as string))
  const excludeSet = new Set(exclude.map((w) => w.toLowerCase()))

  // 3. Generate.
  let entries: Awaited<ReturnType<typeof getDiscoveryBatch>>
  try {
    entries = await getDiscoveryBatch(topic.es, topic.count, exclude, request.signal)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      // Client cancelled (× on the loading screen) — nothing persisted, nothing to report.
      return new Response(null, { status: 499 })
    }
    console.error('[discovery/generate] anthropic error:', e)
    return Response.json({ error: 'Generation failed.' }, { status: 500 })
  }

  // 4. Dedup safety net — drop anything the user already has (case-insensitive),
  //    and any duplicates within the batch itself.
  const seen = new Set<string>()
  const fresh = entries.filter((e) => {
    const key = e.word.trim().toLowerCase()
    if (!key || excludeSet.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (fresh.length === 0) {
    return Response.json({ cards: [] })
  }

  // 5. Persist as pending rows. gender lives inside the definition JSONB (no new column).
  const insertRows = fresh.map((e) => ({
    user_id: user.id,
    word: e.word.trim(),
    origin: 'discovery' as const,
    discovery_status: 'pending' as const,
    discovery_topic: topic.key,
    definition: { es: '', fr: e.fr, pos: e.pos, gender: e.gender },
    examples: [e.example],
    distractors: [] as string[],
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('words')
    .insert(insertRows)
    .select('id, word, definition, examples')

  if (insertError || !inserted) {
    console.error('[discovery/generate] insert error:', insertError)
    return Response.json({ error: 'Failed to save collection.' }, { status: 500 })
  }

  return Response.json({ cards: (inserted as WordRow[]).map(rowToCard) })
}
