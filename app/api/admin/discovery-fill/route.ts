import { adminSupabase } from '@/lib/supabase/admin'
import { getDiscoveryBatch, getWordData } from '@/lib/anthropic'
import { getTopic } from '@/lib/discovery-topics'
import { normalizeSearch } from '@/lib/word-search'

export const maxDuration = 60

// Background fill for the shared discovery_pool (M8). PROTECTED — Bearer CRON_SECRET (Vercel Cron can
// wrap it later; runnable by hand now). Writes via the service-role adminSupabase (the pool has no
// user-facing write policy). ONE BOUNDED BATCH PER INVOCATION — never a loop to target: a single
// getDiscoveryBatch runs ~20–40s, so looping to POOL_TARGET would blow maxDuration. Re-invoke to keep
// filling; each call is idempotent (reads current count, adds one batch, stops).
const POOL_TARGET = 160 // per-theme active-row target (the cost dial — exhaustion ≈ never fires)
const BATCH_MAX = 25 // max words generated/curated per invocation (bounded, predictable spend)

function genderFromPos(pos: string): 'm' | 'f' | null {
  if (pos === 'n.m.') return 'm'
  if (pos === 'n.f.') return 'f'
  return null
}

async function existingPoolWords(themeKey: string): Promise<Set<string>> {
  const { data, error } = await adminSupabase.from('discovery_pool').select('word').eq('theme_key', themeKey)
  if (error) throw error
  return new Set((data ?? []).map((r) => normalizeSearch(r.word as string)))
}

async function activeCount(themeKey: string): Promise<number> {
  const { count, error } = await adminSupabase
    .from('discovery_pool')
    .select('*', { count: 'exact', head: true })
    .eq('theme_key', themeKey)
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

export async function POST(request: Request) {
  // ── Auth ──
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const mode = typeof body.mode === 'string' ? body.mode : 'generate'

  try {
    // ── flag: prune a bad shared row (excluded from reads for everyone) ──
    if (mode === 'flag') {
      const id = typeof body.id === 'string' ? body.id : ''
      if (!id) return Response.json({ error: 'flag requires an id.' }, { status: 400 })
      const { error } = await adminSupabase.from('discovery_pool').update({ status: 'flagged' }).eq('id', id)
      if (error) throw error
      return Response.json({ ok: true, flagged: id })
    }

    // ── curate: enrich a vetted word list via getWordData, insert as curated/core ──
    if (mode === 'curate') {
      const themeKey = typeof body.theme === 'string' && body.theme ? body.theme : 'esencial'
      const words = Array.isArray(body.words) ? body.words.filter((w): w is string => typeof w === 'string') : []
      if (words.length === 0) return Response.json({ error: 'curate requires a words array.' }, { status: 400 })

      const already = await existingPoolWords(themeKey)
      const seen = new Set<string>()
      const todo = words
        .map((w) => w.trim())
        .filter((w) => {
          const k = normalizeSearch(w)
          if (!k || already.has(k) || seen.has(k)) return false
          seen.add(k)
          return true
        })
        .slice(0, BATCH_MAX)

      if (todo.length === 0) {
        return Response.json({ theme: themeKey, added: 0, total: await activeCount(themeKey), remaining: 0 })
      }

      const settled = await Promise.allSettled(todo.map((w) => getWordData(w)))
      const rows = todo.flatMap((word, i) => {
        const r = settled[i]
        if (r.status !== 'fulfilled') return []
        const d = r.value.definition
        return [
          {
            theme_key: themeKey,
            word,
            fr: d.fr,
            pos: d.pos,
            gender: genderFromPos(d.pos),
            example: r.value.examples[0],
            band: 'core' as const,
            fill_source: 'curated' as const,
          },
        ]
      })

      if (rows.length > 0) {
        const { error } = await adminSupabase.from('discovery_pool').insert(rows)
        if (error) throw error
      }
      return Response.json({
        theme: themeKey,
        added: rows.length,
        total: await activeCount(themeKey),
        remaining: words.length - todo.length, // re-invoke to continue the list
      })
    }

    // ── generate (default): one bounded getDiscoveryBatch, deduped against the pool ──
    const theme = getTopic(typeof body.theme === 'string' ? body.theme : '')
    if (!theme) return Response.json({ error: 'generate requires a known theme key.' }, { status: 400 })

    const count = await activeCount(theme.key)
    if (count >= POOL_TARGET) {
      return Response.json({ theme: theme.key, added: 0, total: count, done: true })
    }
    const n = Math.min(BATCH_MAX, POOL_TARGET - count)

    const already = await existingPoolWords(theme.key)
    const entries = await getDiscoveryBatch(theme.es, n, [...already])

    const seen = new Set<string>()
    const rows = entries.flatMap((e) => {
      const k = normalizeSearch(e.word)
      if (!k || already.has(k) || seen.has(k)) return []
      seen.add(k)
      return [
        {
          theme_key: theme.key,
          word: e.word.trim(),
          fr: e.fr,
          pos: e.pos,
          gender: e.gender,
          example: e.example,
          band: e.band,
          fill_source: 'generated' as const,
        },
      ]
    })

    if (rows.length > 0) {
      const { error } = await adminSupabase.from('discovery_pool').insert(rows)
      if (error) throw error
    }
    const total = count + rows.length
    return Response.json({ theme: theme.key, added: rows.length, total, done: total >= POOL_TARGET })
  } catch (e) {
    console.error('[discovery-fill] error:', e)
    return Response.json({ error: 'Fill failed.' }, { status: 500 })
  }
}
