// Cloze-level masking snapshot (roadmap 8d).
//
// For every discovery_pool row, records what the app ACTUALLY renders — the output of
// `pickClozeExample`, i.e. the full maskOne chain (maskInfinitive → maskProcliticReflexive →
// maskVerbSentence → maskSentence), not raw maskSentence. That distinction is the point: two rows
// (`esencial/poner`, `familia/reunirse`) change at the maskSentence level and are UNCHANGED at the
// cloze level, because the trusted-paradigm masker runs first and wins. A raw-maskSentence snapshot
// would report a drift the learner never sees.
//
// Usage:
//   npx tsx scripts/dump-mask-expectations.ts           # verify against the committed fixture
//   npx tsx scripts/dump-mask-expectations.ts --emit    # (re)write the fixture
//
// The `before` column is captured ONCE, at pre-change HEAD, and is then PRESERVED verbatim on every
// re-emit — the generator only recomputes `after`. So the committed file is simultaneously the
// frozen baseline and the current state, and its diff shows exactly which rows changed. A row where
// `before` is non-NULL and `after` differs is a regression; a row going NULL → sentence is a fix.
//
// No env, no network, no credentials.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { pickClozeExample } from '../lib/review-cloze'

const EMIT = process.argv.includes('--emit')
const FIXTURE = 'lib/__fixtures__/pool-mask-expectations.tsv'
const SOURCE = 'lib/__fixtures__/pool-examples.tsv'
const TAB = '\t'
const NONE = 'NULL'

// Rows whose RAW maskSentence result changes in 8d but whose CLOZE result does not, because
// maskVerbSentence (trusted paradigm) resolves them first. Recorded so the absence of a diff here is
// understood as "correctly unchanged", not "not yet measured".
const NOTES: Record<string, string> = {
  'esencial/poner':
    'maskSentence now also matches (stem pon-); cloze unchanged — trusted paradigm masks it first',
  'familia/reunirse':
    'maskSentence now also matches (stem reun-); cloze unchanged — trusted paradigm masks it first',
}

type Row = { theme: string; word: string; pos: string; es: string }

function clozeFor(r: Row): string {
  // Pool rows carry exactly one example and no lemma (insertPendingCards writes lemma-less rows), so
  // this mirrors what a freshly drawn card looks like. `reps: 0` — with one example there is nothing
  // to rotate, so the result is deterministic.
  const picked = pickClozeExample({
    examples: [{ es: r.es, fr: '' }],
    word: r.word,
    id: `${r.theme}-${r.word}`,
    lemma: null,
    pos: r.pos,
    reps: 0,
  })
  return picked ? picked.masked : NONE
}

function readSource(): Row[] {
  return readFileSync(SOURCE, 'utf8')
    .trimEnd()
    .split('\n')
    .slice(1)
    .map((l) => {
      const [theme, word, pos, es] = l.split(TAB)
      return { theme, word, pos, es }
    })
}

// Preserve `before` from the committed fixture; first emit seeds it from the current state.
function priorBefore(): Map<string, string> {
  const m = new Map<string, string>()
  if (!existsSync(FIXTURE)) return m
  for (const line of readFileSync(FIXTURE, 'utf8').trimEnd().split('\n').slice(1)) {
    const [theme, word, , before] = line.split(TAB)
    m.set(`${theme}/${word}`, before)
  }
  return m
}

function build(): string {
  const rows = readSource()
  const prior = priorBefore()
  const out = [['theme_key', 'word', 'pos', 'before', 'after', 'note'].join(TAB)]
  for (const r of rows) {
    const key = `${r.theme}/${r.word}`
    const after = clozeFor(r)
    const before = prior.get(key) ?? after
    out.push([r.theme, r.word, r.pos, before, after, NOTES[key] ?? ''].join(TAB))
  }
  return out.join('\n') + '\n'
}

const built = build()
const rows = built.trimEnd().split('\n').slice(1).map((l) => l.split(TAB))
const masked = rows.filter((c) => c[4] !== NONE).length
const changed = rows.filter((c) => c[3] !== c[4])
const regressed = changed.filter((c) => c[3] !== NONE)

console.log(`rows            : ${rows.length}`)
console.log(`masked (after)  : ${masked}`)
console.log(`NULL  (after)   : ${rows.length - masked}`)
console.log(`before → after  : ${changed.length} changed, of which ${regressed.length} regressions`)
for (const c of changed) console.log(`   ${c[0]}/${c[1]}: ${c[3]}  ->  ${c[4]}`)

if (EMIT) {
  writeFileSync(FIXTURE, built, 'utf8')
  console.log(`\nWROTE ${FIXTURE}`)
} else if (existsSync(FIXTURE)) {
  const onDisk = readFileSync(FIXTURE, 'utf8')
  console.log(onDisk === built ? '\nVERIFY: MATCH' : '\nVERIFY: MISMATCH')
  if (onDisk !== built) process.exitCode = 1
} else {
  console.log(`\nNo fixture at ${FIXTURE} — run with --emit to create it.`)
}
