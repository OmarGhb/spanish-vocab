// Score users' saved words for cloze maskability (roadmap 8d, §2).
//
// The deck corpus is only half the picture — users' own added words come from `getWordData`, whose
// prompt DOES require the target verbatim, so they should score better than the hand-curated seed.
// That is a hypothesis until measured.
//
// Deliberately offline: it reads a TSV you exported, never the database. No credentials, no network,
// and the export stays on your machine. It uses the same `pickClozeExample` path the app does —
// after 8b and 8d, approximating the code under test has twice produced a wrong number, so this
// calls the real thing.
//
// Export (read-only, in the Supabase SQL editor), saved as TSV with a header row:
//
//   SELECT w.word,
//          coalesce(w.lemma, '')              AS lemma,
//          coalesce(w.definition->>'pos', '') AS pos,
//          coalesce(w.examples->0->>'es', '') AS example_es
//   FROM words w
//   WHERE w.examples IS NOT NULL
//     AND jsonb_array_length(w.examples) > 0
//     AND coalesce(w.examples->0->>'es', '') <> ''
//   ORDER BY w.created_at;
//
// Usage:
//   npx tsx scripts/score-user-examples.ts <export.tsv>
//
// Reports how many rows can produce a cloze today, grouped by failure class. To measure the 8d
// delta, run it once on the v0.12.34 tag and once on main and compare the totals.

import { readFileSync } from 'node:fs'
import { pickClozeExample } from '../lib/review-cloze'
import { normalize } from '../lib/conjugator'

const path = process.argv[2]
if (!path) {
  console.error('Usage: npx tsx scripts/score-user-examples.ts <export.tsv>')
  process.exit(1)
}

type Row = { word: string; lemma: string; pos: string; es: string }

const rows: Row[] = readFileSync(path, 'utf8')
  .trimEnd()
  .split('\n')
  .slice(1)
  .map((l) => {
    const [word, lemma, pos, es] = l.split('\t')
    return { word: (word ?? '').trim(), lemma: (lemma ?? '').trim(), pos: (pos ?? '').trim(), es: (es ?? '').trim() }
  })
  .filter((r) => r.word && r.es)

function maskable(r: Row): boolean {
  return (
    pickClozeExample({
      examples: [{ es: r.es, fr: '' }],
      word: r.word,
      id: r.word,
      lemma: r.lemma || null,
      pos: r.pos || undefined,
      reps: 0,
    }) !== null
  )
}

// Why a row failed, for triage. Mirrors the classes recorded in lib/pool-examples.test.ts.
function failureClass(r: Row): string {
  if (/\s/.test(r.word.trim())) return 'multiword headword'
  const n = normalize(r.word)
  const stem = /(?:ar|er|ir)(?:se)?$/.test(n) ? n.replace(/(?:ar|er|ir)(?:se)?$/, '') : n.slice(0, -1)
  if (stem.length < 3) return 'stem too short'
  if (!normalize(r.es).includes(stem)) return 'headword absent or stem-changed'
  return 'other'
}

const failed = rows.filter((r) => !maskable(r))
const byClass = new Map<string, Row[]>()
for (const r of failed) {
  const k = failureClass(r)
  byClass.set(k, [...(byClass.get(k) ?? []), r])
}

const pct = (n: number) => `${((n / Math.max(rows.length, 1)) * 100).toFixed(1)}%`

console.log(`rows scored       : ${rows.length}`)
console.log(`can produce cloze : ${rows.length - failed.length}  (${pct(rows.length - failed.length)})`)
console.log(`CANNOT            : ${failed.length}  (${pct(failed.length)})`)

if (failed.length) {
  console.log('\nby failure class:')
  for (const [k, v] of [...byClass].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${k.padEnd(32)}${v.length}`)
  }
  console.log('\nfailing rows:')
  for (const r of failed) {
    console.log(`  ${r.word.padEnd(20)}${(r.pos || '—').padEnd(9)}${r.es}`)
  }
  console.log(
    '\nA row here is NOT necessarily broken content — most are the stem-change class that needs a\n' +
      'trusted paradigm (roadmap 8e). A row whose example simply lacks the headword is the 8b class\n' +
      'and is a content defect.',
  )
}
