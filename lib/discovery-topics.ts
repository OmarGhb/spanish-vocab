import {
  UtensilsCrossed,
  Plane,
  Briefcase,
  House,
  Users,
  PartyPopper,
  PersonStanding,
  Shirt,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export type DiscoveryTopic = {
  /** Stable key used in URLs, the DB (words.discovery_topic), and the generate API. */
  key: string
  /** Spanish theme name shown on the card (Lora). */
  es: string
  /** French gloss shown under it. */
  fr: string
  /** Nominal generation target shown on the grid ("N mots"). Live deck may be smaller. */
  count: number
  Icon: LucideIcon
  /** Curated-only pool (M6.2c `esencial`): drawn from the pool, never live-generated (no theme prompt). */
  curatedOnly?: boolean
}

export const DISCOVERY_TOPICS: readonly DiscoveryTopic[] = [
  { key: 'comida', es: 'La comida', fr: 'la nourriture', count: 12, Icon: UtensilsCrossed },
  { key: 'viaje', es: 'El viaje', fr: 'le voyage', count: 16, Icon: Plane },
  { key: 'trabajo', es: 'El trabajo', fr: 'le travail', count: 14, Icon: Briefcase },
  { key: 'casa', es: 'La casa', fr: 'la maison', count: 18, Icon: House },
  { key: 'familia', es: 'La familia', fr: 'la famille', count: 11, Icon: Users },
  { key: 'fiesta', es: 'La fiesta', fr: 'la fête', count: 13, Icon: PartyPopper },
  { key: 'cuerpo', es: 'El cuerpo', fr: 'le corps', count: 15, Icon: PersonStanding },
  { key: 'ropa', es: 'La ropa', fr: 'les vêtements', count: 10, Icon: Shirt },
] as const

// The curated "essentiel A2–B1" pool (M6.2c) — the onboarding "mélange conseillé" starter. Populated
// only by the fill route's curate mode (theme_key='esencial'); deliberately NOT in DISCOVERY_TOPICS,
// so it never appears on the /discover theme grid. curatedOnly → the session route skips live-gen.
export const ESENCIAL_TOPIC: DiscoveryTopic = {
  key: 'esencial',
  es: 'Lo esencial',
  fr: 'l’essentiel A2–B1',
  count: 16,
  Icon: Sparkles,
  curatedOnly: true,
}

// Lookup across the grid themes + the curated esencial pool (session/fill accept both).
export function getTopic(key: string): DiscoveryTopic | undefined {
  if (key === ESENCIAL_TOPIC.key) return ESENCIAL_TOPIC
  return DISCOVERY_TOPICS.find((t) => t.key === key)
}

// Group active discovery_pool rows into per-theme_key counts (the onboarding starter grid). Pure.
export function countByTheme(rows: { theme_key: string }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.theme_key] = (counts[r.theme_key] ?? 0) + 1
  return counts
}
