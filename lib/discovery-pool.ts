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

// Onboarding niveau CEFR tier (slice 2, written to profiles.level). The value set matches the
// niveau picker + the profiles.level CHECK. `undefined`/null level → core-first default.
export type DiscoveryLevel = 'a1' | 'a2' | 'b1' | 'b2'

// The level→discovery-band mapping (backlog spec): beginners see core essentials first, more advanced
// learners see the extended/B1 tier first (they already know the core).
export function levelBand(level: DiscoveryLevel): PoolBand {
  return level === 'a1' || level === 'a2' ? 'core' : 'extended'
}

function bandRank(band: PoolBand, level?: DiscoveryLevel): number {
  // Surface the band matching the user's level first; the other band follows. No level → core-first.
  const preferred: PoolBand = level ? levelBand(level) : 'core'
  return band === preferred ? 0 : 1
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
