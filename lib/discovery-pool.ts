// Discovery shared-pool read logic (M8) — pure + tested. Given the theme's pool rows and the words a
// user already has, pick the cards to show: drop flagged/excluded, order by band (core before extended,
// the level→band bias), and cap to a session size. `exhausted` signals the session route to fall back
// to per-user live generation. No I/O here — the route supplies the rows and the exclude list.

import { normalizeSearch } from './word-search'
import type { CollectionCard, Gender } from './discovery'

export type PoolBand = 'core' | 'extended'

// The subset of a discovery_pool row this logic needs (the route selects exactly these columns).
export type DiscoveryPoolRow = {
  id: string
  word: string
  fr: string
  pos: string
  gender: Gender
  example: { es: string; fr: string }
  band: PoolBand
  status: 'active' | 'flagged'
}

// Onboarding niveau (slice 2). Until `profiles.level` is stored, ordering defaults to core-first —
// the beginner/onboarding bias (2A). Kept in the signature so the consumer is wired now; only the
// advanced tier currently changes behaviour (lets core/extended mix instead of forcing core ahead).
export type DiscoveryLevel = 'debutant' | 'a2' | 'b1' | 'avance'

const BAND_RANK: Record<PoolBand, number> = { core: 0, extended: 1 }

function bandRank(band: PoolBand, level?: DiscoveryLevel): number {
  // Advanced learners don't need core forced ahead of extended — let the two mix. Everyone else
  // (default, lower levels) gets core first.
  if (level === 'avance') return 0
  return BAND_RANK[band]
}

// Small deterministic hash of the row id → stable-ish intra-band order (so repeated draws don't
// reshuffle wildly, without being strict insertion order).
function seededKey(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return h
}

function toCard(r: DiscoveryPoolRow): CollectionCard {
  return { id: r.id, word: r.word, fr: r.fr, pos: r.pos, gender: r.gender, example: r.example }
}

export function selectPoolCards({
  rows,
  excludeWords,
  limit,
  level,
}: {
  rows: DiscoveryPoolRow[]
  excludeWords: string[]
  limit: number
  level?: DiscoveryLevel
}): { cards: CollectionCard[]; exhausted: boolean } {
  const excludeSet = new Set(excludeWords.map(normalizeSearch).filter(Boolean))

  const available = rows.filter(
    (r) => r.status === 'active' && !excludeSet.has(normalizeSearch(r.word)),
  )

  const ordered = [...available].sort((a, b) => {
    const byBand = bandRank(a.band, level) - bandRank(b.band, level)
    if (byBand !== 0) return byBand
    return seededKey(a.id) - seededKey(b.id)
  })

  const cards = ordered.slice(0, Math.max(0, limit)).map(toCard)
  return { cards, exhausted: cards.length === 0 }
}
