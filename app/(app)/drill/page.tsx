import Link from 'next/link'
import { Rows3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  buildDrillPool,
  DRILL_TENSES,
  DRILL_UNLOCK_THRESHOLD,
  type DrillTense,
  type DrillVerb,
  type PersonScope,
} from '@/lib/drill'
import { resolveDisplayName } from '@/lib/display-name'
import { coerceImmersionMode, resolveChrome, HOME_CHROME, NAV_CHROME } from '@/lib/immersion'
import HubCardLocked from '../HubCardLocked'
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
    supabase.from('profiles').select('drill_tenses, drill_person_scope, immersion_mode, display_name').maybeSingle(),
    supabase.auth.getUser(),
  ])

  const mode = coerceImmersionMode(profile?.immersion_mode)

  // Real name from onboarding (M6.2b) if captured, else the email-derived fallback.
  const displayName = resolveDisplayName(profile?.display_name, auth.user?.email)

  const pool: DrillVerb[] = buildDrillPool(
    (words ?? []).map((w) => {
      const def = w.definition as { pos?: string } | null
      return { pos: def?.pos, word: w.word as string, lemma: w.lemma as string | null }
    }),
  )

  // Soft-lock fallback for a direct visit below the unlock threshold (the Home card normally gates).
  if (pool.length < DRILL_UNLOCK_THRESHOLD) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center gap-5 px-5 pb-10">
        <div className="w-full max-w-[260px]">
          <HubCardLocked
            icon={<Rows3 size={19} strokeWidth={1.7} />}
            title={resolveChrome(HOME_CHROME.conjTitle, mode)}
            have={pool.length}
            need={DRILL_UNLOCK_THRESHOLD}
            unit={resolveChrome(HOME_CHROME.conjUnit, mode)}
          />
        </div>
        <Link href="/" className="text-center text-sm text-accent">
          ← {resolveChrome(NAV_CHROME.home, mode)}
        </Link>
      </div>
    )
  }

  return <DrillClient pool={pool} prefs={coercePrefs(profile)} displayName={displayName} />
}
