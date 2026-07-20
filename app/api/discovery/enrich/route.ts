import { createClient } from '@/lib/supabase/server'
import { getWordData } from '@/lib/anthropic'
import { getAudioForWord } from '@/lib/tts'
import { createInitialCard } from '@/lib/fsrs'

// maxDuration requests 300s, but this project runs on Vercel HOBBY, whose function duration is capped
// (~60s) — so 300 is clamped at runtime. It's kept at 300 so a future Pro upgrade benefits, but we do
// NOT rely on the exact ceiling: MAX_PER_INVOCATION bounds each call to a small batch that finishes
// well under any plausible cap, so a single invocation can never run long enough to be killed
// mid-drain and STRAND rows (claimed-but-not-promoted, reclaimable only after STALE_MS). Repeated
// calls — the discovery-session cadence, the Home PreparingPoller, the bilan/grid-mount triggers —
// drain the rest incrementally. **Do NOT "simplify" this back into one drain-everything call**: that
// reintroduces the timeout/stranding risk. Overlapping calls are safe (the claim is atomic).
export const maxDuration = 300

const CHUNK = 3 // words enriched in parallel per loop iteration
const MAX_PER_INVOCATION = 9 // per-call word cap (≈3 chunks) — keep conservative; raise only with headroom
const STALE_MS = 2 * 60 * 1000 // a claim older than this is assumed dead and reclaimable

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type ClaimRow = { id: string; word: string }

// Fully enrich one kept word, then promote it. Promotion happens ONLY after the full
// definition is written, so a row is never promoted half-enriched. On failure the claim
// is released (discovery_claimed_at → null) and the row stays 'kept' for the next pass.
async function enrichOne(
  supabase: SupabaseServerClient,
  userId: string,
  row: ClaimRow,
): Promise<boolean> {
  try {
    const [wordData, audio] = await Promise.all([
      getWordData(row.word), // throws on Anthropic/parse failure
      getAudioForWord(row.word), // returns null on TTS failure — non-fatal
    ])

    // Ensure a review card exists. UNIQUE(word_id) makes a leftover card from a prior
    // partial run tolerable (23505) — promotion is still gated on the word update below.
    const card = createInitialCard()
    const { error: cardError } = await supabase.from('review_cards').insert({
      word_id: row.id,
      user_id: userId,
      due: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review ? card.last_review.toISOString() : null,
    })
    if (cardError && cardError.code !== '23505') throw cardError

    const { error: updateError } = await supabase
      .from('words')
      .update({
        definition: wordData.definition,
        examples: wordData.examples,
        distractors: wordData.distractors,
        lemma: wordData.lemma,
        form_annotation: wordData.form_annotation,
        audio_urls: audio,
        discovery_status: 'promoted',
        discovery_claimed_at: null,
      })
      .eq('id', row.id)
    if (updateError) throw updateError

    return true
  } catch (e) {
    console.error('[discovery/enrich]', row.word, e)
    // Release the claim so a later pass retries; keep the 'kept' decision.
    await supabase.from('words').update({ discovery_claimed_at: null }).eq('id', row.id)
    return false
  }
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let promoted = 0
  let processed = 0

  // Claim and process one chunk at a time so the claim window stays fresh even if a
  // single word's enrichment is slow. The claim is an atomic UPDATE … RETURNING: two
  // concurrent passes can never claim the same row.
  for (;;) {
    const staleIso = new Date(Date.now() - STALE_MS).toISOString()
    const claimable = `discovery_claimed_at.is.null,discovery_claimed_at.lt.${staleIso}`

    const { data: candidates, error: candError } = await supabase
      .from('words')
      .select('id')
      .eq('origin', 'discovery')
      .eq('discovery_status', 'kept')
      .or(claimable)
      .limit(CHUNK)

    if (candError) {
      console.error('[discovery/enrich] candidate fetch error:', candError)
      break
    }
    if (!candidates || candidates.length === 0) break

    const ids = candidates.map((c) => c.id as string)
    const { data: claimed, error: claimError } = await supabase
      .from('words')
      .update({ discovery_claimed_at: new Date().toISOString() })
      .in('id', ids)
      .eq('discovery_status', 'kept')
      .or(claimable)
      .select('id, word')

    if (claimError) {
      console.error('[discovery/enrich] claim error:', claimError)
      break
    }
    // Another pass grabbed these between our select and claim — cede to it.
    if (!claimed || claimed.length === 0) break

    const results = await Promise.all(
      (claimed as ClaimRow[]).map((row) => enrichOne(supabase, user.id, row)),
    )
    promoted += results.filter(Boolean).length
    processed += claimed.length
    // Per-invocation cap (see the maxDuration note above): bound the work so a single call can't
    // approach the serverless timeout and strand rows. Repeated calls finish the rest.
    if (processed >= MAX_PER_INVOCATION) break
  }

  return Response.json({ ok: true, promoted, capped: processed >= MAX_PER_INVOCATION })
}
