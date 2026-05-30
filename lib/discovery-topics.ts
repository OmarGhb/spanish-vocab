import {
  UtensilsCrossed,
  Plane,
  Briefcase,
  House,
  Users,
  PartyPopper,
  PersonStanding,
  Shirt,
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

export function getTopic(key: string): DiscoveryTopic | undefined {
  return DISCOVERY_TOPICS.find((t) => t.key === key)
}
