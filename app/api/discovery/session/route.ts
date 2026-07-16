import { createClient } from '@/lib/supabase/server'
import { getTopic } from '@/lib/discovery-topics'
import { selectPoolCards, type DiscoveryPoolRow, type DiscoveryLevel } from '@/lib/discovery-pool'
import {
  DISCOVERY_WORD_COLS,
  rowToCard,
  fetchUserWords,
  insertPendingCards,
  runLiveDiscovery,
  type DiscoveryWordRow,
} from '@/lib/discovery-server'

export const maxDuration = 60

// Pool-first discovery (M8) — the DEFAULT entry point. Draws from the shared `discovery_pool` (generated
// once, everyone reuses) so a theme-open makes ZERO AI/TTS calls. Order of operations:
//   1. Resume any of the user's still-pending rows for this theme (mid-session return);
//   2. Draw from the pool minus the user's words, ordered by band, and COPY the drawn cards into the
//      user's collection as `pending` (copy-on-draw) so decide/enrich/exclusion stay unchanged;
//   3. Only if the pool is exhausted for this user, fall back to per-user live generation.
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

  // 1. Resume — return the user's remaining pending rows for this theme (no draw, no AI).
  const { data: pending, error: pendingError } = await supabase
    .from('words')
    .select(DISCOVERY_WORD_COLS)
    .eq('origin', 'discovery')
    .eq('discovery_topic', topic.key)
    .eq('discovery_status', 'pending')
    .order('created_at', { ascending: true })

  if (pendingError) {
    console.error('[discovery/session] pending fetch error:', pendingError)
    return Response.json({ error: 'Failed to load collection.' }, { status: 500 })
  }
  if (pending && pending.length > 0) {
    return Response.json({ cards: (pending as DiscoveryWordRow[]).map(rowToCard) })
  }

  // 2. Draw from the shared pool, minus the user's words, ordered by the user's captured level.
  let exclude: string[]
  try {
    exclude = await fetchUserWords(supabase)
  } catch (e) {
    console.error('[discovery/session] exclude fetch error:', e)
    return Response.json({ error: 'Failed to load collection.' }, { status: 500 })
  }

  // Onboarding niveau (M6.2b) → band ordering. Null / not-yet-captured → core-first default.
  const { data: profile } = await supabase.from('profiles').select('level').maybeSingle()
  const level = (profile?.level as DiscoveryLevel | null) ?? undefined

  const { data: poolRows, error: poolError } = await supabase
    .from('discovery_pool')
    .select('id, word, fr, pos, gender, example, band, status')
    .eq('theme_key', topic.key)

  if (poolError) {
    console.error('[discovery/session] pool fetch error:', poolError)
    return Response.json({ error: 'Failed to load collection.' }, { status: 500 })
  }

  const { cards: drawn, exhausted } = selectPoolCards({
    rows: (poolRows ?? []) as DiscoveryPoolRow[],
    excludeWords: exclude,
    limit: topic.count,
    level,
  })

  if (!exhausted) {
    try {
      const cards = await insertPendingCards(supabase, user.id, topic.key, drawn)
      return Response.json({ cards })
    } catch (e) {
      console.error('[discovery/session] copy-on-draw insert error:', e)
      return Response.json({ error: 'Failed to save collection.' }, { status: 500 })
    }
  }

  // 3. Pool exhausted for this user. A curated-only pool (esencial) is never live-generated (no theme
  //    prompt) — return empty so the deck shows its exhausted state.
  if (topic.curatedOnly) {
    return Response.json({ cards: [] })
  }

  // Otherwise fall back to per-user live generation (today's path).
  try {
    const cards = await runLiveDiscovery(supabase, user.id, topic, exclude, request.signal)
    return Response.json({ cards })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return new Response(null, { status: 499 })
    }
    console.error('[discovery/session] fallback generation error:', e)
    return Response.json({ error: 'Generation failed.' }, { status: 500 })
  }
}
