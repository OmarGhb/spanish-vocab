// Pool-example fixture generator + verifier (roadmap 8b).
//
// Derives `theme_key · word · pos · example_es` for every seeded discovery_pool row from the
// COMMITTED migrations — the seed, then each data migration that rewrites an example — so the
// maskability guard (lib/pool-examples.test.ts) can run with no database and no credentials.
//
// Usage:
//   npx tsx scripts/dump-pool-examples.ts           # verify against the committed fixture
//   npx tsx scripts/dump-pool-examples.ts --emit    # (re)write the fixture
//
// Reading the SQL rather than the live DB is deliberate: the committed migrations are the
// reproducible source of truth, and a fixture derived from live data would drift the moment someone
// edited a row by hand. Both files have a uniform, generated shape, so a tight regex is safe here —
// and the row-count assertions below fail loudly if either ever stops matching.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const EMIT = process.argv.includes('--emit')
const FIXTURE_PATH = 'lib/__fixtures__/pool-examples.tsv'
const SEED_PATH = 'supabase/migrations/20260824000000_discovery_pool_seed.sql'
const FIX_8B_PATH = 'supabase/migrations/20260925000000_fix_example_headword.sql'

const TAB = '\t'
const EXPECTED_SEED_ROWS = 672
const EXPECTED_8B_ROWS = 2

// Postgres doubles a quote to escape it; undo that for the value we compare in JS.
const unq = (s: string) => s.replace(/''/g, "'")

type Row = { theme: string; word: string; pos: string; es: string }

// Seed tuples: ('theme','word','fr','pos','gender', '{"es":"…","fr":"…"}'::jsonb, …)
function parseSeed(sql: string): Row[] {
  const re =
    /^\s*\('((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'(?:[^']|'')*',\s*'((?:[^']|'')*)',\s*(?:'[mf]'|NULL),\s*'(\{.*?\})'::jsonb/gm
  const out: Row[] = []
  for (const m of sql.matchAll(re)) {
    const example = JSON.parse(unq(m[4])) as { es: string }
    out.push({ theme: unq(m[1]), word: unq(m[2]), pos: unq(m[3]), es: example.es })
  }
  return out
}

// 8b override tuples in the FIRST VALUES block: ('theme','word','es','fr','en')
function parse8b(sql: string): Array<{ theme: string; word: string; es: string }> {
  const block = sql.slice(sql.indexOf('UPDATE discovery_pool'), sql.indexOf('UPDATE words'))
  const re = /^\s*\('((?:[^']|'')*)','((?:[^']|'')*)','((?:[^']|'')*)',\s*$/gm
  return [...block.matchAll(re)].map((m) => ({ theme: unq(m[1]), word: unq(m[2]), es: unq(m[3]) }))
}

function build(): string {
  const rows = parseSeed(readFileSync(SEED_PATH, 'utf8'))
  if (rows.length !== EXPECTED_SEED_ROWS) {
    throw new Error(`seed parse got ${rows.length} rows, expected ${EXPECTED_SEED_ROWS} — the seed's shape changed`)
  }

  const overrides = parse8b(readFileSync(FIX_8B_PATH, 'utf8'))
  if (overrides.length !== EXPECTED_8B_ROWS) {
    throw new Error(`8b parse got ${overrides.length} overrides, expected ${EXPECTED_8B_ROWS}`)
  }
  for (const o of overrides) {
    const row = rows.find((r) => r.theme === o.theme && r.word.toLowerCase() === o.word.toLowerCase())
    if (!row) throw new Error(`8b override matches no seed row: ${o.theme}/${o.word}`)
    row.es = o.es
  }

  const lines = rows
    .map((r) => [r.theme, r.word, r.pos, r.es].join(TAB))
    .sort()
  return ['theme_key\tword\tpos\texample_es', ...lines].join('\n') + '\n'
}

const built = build()
const sha = createHash('sha256').update(built, 'utf8').digest('hex')
console.log(`rows   : ${built.trimEnd().split('\n').length - 1}`)
console.log(`sha256 : ${sha}`)

if (EMIT) {
  writeFileSync(FIXTURE_PATH, built, 'utf8')
  console.log(`\nWROTE ${FIXTURE_PATH}`)
} else if (existsSync(FIXTURE_PATH)) {
  const onDisk = readFileSync(FIXTURE_PATH, 'utf8')
  console.log(onDisk === built ? 'VERIFY: MATCH' : 'VERIFY: MISMATCH')
  if (onDisk !== built) process.exitCode = 1
} else {
  console.log(`\nNo fixture at ${FIXTURE_PATH} — run with --emit to create it.`)
}
