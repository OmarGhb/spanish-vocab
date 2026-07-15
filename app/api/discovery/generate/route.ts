import { createClient } from '@/lib/supabase/server'
import { getTopic } from '@/lib/discovery-topics'
import {
  DISCOVERY_WORD_COLS,
  rowToCard,
  fetchUserWords,
  runLiveDiscovery,
  type DiscoveryWordRow,
} from '@/lib/discovery-server'

export const maxDuration = 60

// Legacy per-user live generation. Since M8 this is the EXHAUSTION FALLBACK, not the default entry
// point — `/api/discovery/session` (pool-first) is the default and calls the same `runLiveDiscovery`
// when a user has drained a theme's shared pool. Kept as a route for that fallback + resume.
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
    .select(DISCOVERY_WORD_COLS)
    .eq('origin', 'discovery')
    .eq('discovery_topic', topic.key)
    .eq('discovery_status', 'pending')
    .order('created_at', { ascending: true })

  if (pendingError) {
    console.error('[discovery/generate] pending fetch error:', pendingError)
    return Response.json({ error: 'Failed to load collection.' }, { status: 500 })
  }
  if (pending && pending.length > 0) {
    return Response.json({ cards: (pending as DiscoveryWordRow[]).map(rowToCard) })
  }

  // 2. Generate live (exclude every word the user already has).
  try {
    const exclude = await fetchUserWords(supabase)
    const cards = await runLiveDiscovery(supabase, user.id, topic, exclude, request.signal)
    return Response.json({ cards })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      // Client cancelled (× on the loading screen) — nothing persisted, nothing to report.
      return new Response(null, { status: 499 })
    }
    console.error('[discovery/generate] error:', e)
    return Response.json({ error: 'Generation failed.' }, { status: 500 })
  }
}
