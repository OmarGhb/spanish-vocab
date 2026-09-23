// Chrome golden-fixture generator + verifier (M8 Phase 0). Captures every authored chrome string,
// resolved under all three of today's immersion modes, as a committed byte-level fixture — the
// proof that the (locale, policy) refactor leaves `fr` + `visible` (and the other two policies)
// byte-identical to the shipped FR/ES behavior.
//
// Usage:
//   npx tsx scripts/dump-chrome.ts            # verify against the committed fixture (writes nothing)
//   npx tsx scripts/dump-chrome.ts --emit     # (re)write the fixture — run ONCE at pre-change HEAD
//
// DELIBERATE: this script does NOT import resolveChrome. It inlines a REFERENCE COPY of the
// pre-refactor one-liner (`mode === 'fr_es' ? pair.fr : pair.es ?? pair.fr`), so it keeps emitting
// the same bytes before and after the signature change, and can never "prove" equality by simply
// moving with the code under test. Only the dictionary CONSTANTS are imported — their string values
// are exactly what Phase 0 promises not to touch.
//
// No env, no network, no credentials.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import {
  REVIEW_CHROME,
  RATING_LABELS,
  DISCOVER_CHROME,
  NAV_CHROME,
  HOME_CHROME,
  STATUS_CHROME,
  WORDS_CHROME,
  DETAIL_CHROME,
  DRILL_CHROME,
  SHARED_CHROME,
  DICT_CHROME,
  ADD_CHROME,
  ACCOUNT_CHROME,
} from '../lib/immersion'

const EMIT = process.argv.includes('--emit')
export const FIXTURE_PATH = 'lib/__fixtures__/chrome-golden.tsv'

// The three shipped modes, in the enum's own order.
const MODES = ['fr_es', 'immersion', 'totale'] as const

// Every authored dictionary, under a STABLE label. RATING_LABELS is keyed 1–4 (ts-fsrs ratings),
// the rest by string key — both iterate identically via Object.entries.
const DICTIONARIES: Record<string, Record<string, { fr: string; es?: string }>> = {
  ACCOUNT_CHROME,
  ADD_CHROME,
  DETAIL_CHROME,
  DICT_CHROME,
  DISCOVER_CHROME,
  DRILL_CHROME,
  HOME_CHROME,
  NAV_CHROME,
  RATING_LABELS,
  REVIEW_CHROME,
  SHARED_CHROME,
  STATUS_CHROME,
  WORDS_CHROME,
}

// Reference implementation — a verbatim copy of lib/immersion.ts's resolveChrome AS OF HEAD 38b3513.
// Never re-point this at the live helper.
function resolveChromeReference(pair: { fr: string; es?: string }, mode: (typeof MODES)[number]): string {
  return mode === 'fr_es' ? pair.fr : pair.es ?? pair.fr
}

export function buildFixture(): string {
  const lines: string[] = []
  for (const [dictName, dict] of Object.entries(DICTIONARIES)) {
    for (const [key, pair] of Object.entries(dict)) {
      for (const mode of MODES) {
        lines.push(`${dictName}.${key}\t${mode}\t${resolveChromeReference(pair, mode)}`)
      }
    }
  }
  // Sorted so the file is order-independent: a dictionary reshuffle can't show up as a diff.
  lines.sort()
  return lines.join('\n') + '\n'
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

const built = buildFixture()
const pairCount = Object.values(DICTIONARIES).reduce((n, d) => n + Object.keys(d).length, 0)
const lineCount = built.trimEnd().split('\n').length

console.log(`dictionaries : ${Object.keys(DICTIONARIES).length}`)
console.log(`pairs        : ${pairCount}`)
console.log(`lines        : ${lineCount}  (${pairCount} pairs x ${MODES.length} modes)`)
console.log(`sha256       : ${sha256(built)}`)

if (EMIT) {
  writeFileSync(FIXTURE_PATH, built, 'utf8')
  console.log(`\nWROTE ${FIXTURE_PATH}`)
} else if (existsSync(FIXTURE_PATH)) {
  const onDisk = readFileSync(FIXTURE_PATH, 'utf8')
  const match = onDisk === built
  console.log(`\nfixture sha256: ${sha256(onDisk)}`)
  console.log(match ? 'VERIFY: MATCH' : 'VERIFY: MISMATCH')
  if (!match) process.exitCode = 1
} else {
  console.log(`\nNo fixture at ${FIXTURE_PATH} — run with --emit to create it.`)
}
