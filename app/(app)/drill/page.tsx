import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  buildDrillPool,
  DRILL_TENSES,
  DRILL_UNLOCK_THRESHOLD,
  type DrillTense,
  type DrillVerb,
  type PersonScope,
} from '@/lib/drill'
import { displayNameFromEmail } from '@/lib/display-name'
import DrillCard from '../DrillCard'
import DrillClient from './DrillClient'

export type DrillPrefs = { tenses: DrillTense[]; personScope: PersonScope }

const VALID_TENSES = new Set<string>(DRILL_TENSES.map((t) => t.tense))
const DEFAULT_TENSES: DrillTense[] = ['presente', 'preterito', 'imperfecto', 'futuro']

function coercePrefs(row: { drill_tenses?: unknown; drill_person_scope?: unknown } | null): DrillPrefs {
  const rawTenses = Array.isArray(row?.drill_tenses) ? row.drill_tenses : []
  const tenses = rawTenses.filter((t): t is DrillTense => typeof t === 'string' && VALID_TENSES.has(t))
  const personScope: PersonScope = row?.drill_person_scope === 'all' ? 'all' : 'singular'
  return { tenses: tenses.length > 0 ? tenses : DEFAULT_TENSES, personScope }
}

export default async function DrillPage() {
  const supabase = await createClient()

  // Full deck verb scan (fetch-and-filter in JS — the M4.1 precedent; ~dozens of rows). Only real
  // collection words: manual, or discovery rows fully promoted.
  const [{ data: words }, { data: profile }, { data: auth }] = await Promise.all([
    supabase
      .from('words')
      .select('word, lemma, definition')
      .or('origin.eq.manual,discovery_status.eq.promoted'),
    supabase.from('profiles').select('drill_tenses, drill_person_scope').maybeSingle(),
    supabase.auth.getUser(),
  ])

  // Placeholder display name from the email local-part (M6 onboarding replaces the source).
  const displayName = displayNameFromEmail(auth.user?.email)

  const pool: DrillVerb[] = buildDrillPool(
    (words ?? []).map((w) => {
      const def = w.definition as { pos?: string } | null
      return { pos: def?.pos, word: w.word as string, lemma: w.lemma as string | null }
    }),
  )

  // Soft-lock fallback for a direct visit below the unlock threshold (the Home card normally gates).
  if (pool.length < DRILL_UNLOCK_THRESHOLD) {
    return (
      <div className="flex-1 flex flex-col justify-center gap-5 px-5 pb-10">
        <DrillCard count={pool.length} />
        <Link href="/" className="text-center text-sm text-accent">
          ← Accueil
        </Link>
      </div>
    )
  }

  return <DrillClient pool={pool} prefs={coercePrefs(profile)} displayName={displayName} />
}
