// discovery_pool EN re-gloss generator (the SCRIPT ships in M8 Phase 1a; the RUN is Phase 1b).
//
// Reads the active pool rows, asks Claude for an English gloss + an English translation of each
// row's existing Spanish example, and writes a reviewable TSV. It NEVER writes to Supabase and never
// emits a migration from unreviewed output: the TSV is an input to human review, and only the
// approved file becomes the committed data migration.
//
// Usage:
//   npx tsx scripts/regloss-pool.ts --dry-run     # ONE row; prints resolved model + usage + projection
//   npx tsx scripts/regloss-pool.ts --run         # the full run → scripts/out/*.tsv
//   npx tsx scripts/regloss-pool.ts --emit        # approved TSV → the data migration (1b close)
//
// Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service-role bypasses RLS for the read)
// and ANTHROPIC_API_KEY. Mirrors scripts/dump-discovery-pool.ts; no credentials are ever logged or
// written into an output file.

import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { z } from 'zod'

loadEnvConfig(process.cwd())

// Verified against platform.claude.com/docs/en/about-claude/models/overview.md (2026-09-24):
// `claude-opus-5` is LEGACY; `claude-opus-5-5` is the current Opus, at $4 / $20 per MTok.
// This corpus is reviewed once and committed forever, so it gets the current flagship rather than
// the model the live enrichment route uses.
const MODEL = 'claude-opus-5-5'
const PRICE_IN_PER_MTOK = 4
const PRICE_OUT_PER_MTOK = 20

const CHUNK = 24
const OUT_DIR = 'scripts/out'
const POOL_TSV = `${OUT_DIR}/discovery-pool-en.tsv`
const IDIOMS_TSV = `${OUT_DIR}/idioms-en.tsv`
const MIGRATION_PATH = 'supabase/migrations/20260924000100_pool_en_gloss_data.sql'
const IDIOMS_PATH = 'data/idioms.json'

const TAB = '\t'
const HEADER = ['theme_key', 'word', 'pos', 'fr', 'en', 'example_es', 'example_en', 'flag', 'note'].join(TAB)

const DRY_RUN = process.argv.includes('--dry-run')
const RUN = process.argv.includes('--run')
const EMIT = process.argv.includes('--emit')
// Generates ONLY the idioms file. Exists because --run regenerates all ~672 pool rows and would
// overwrite a TSV that is mid-review; this mode never opens POOL_TSV for writing, by construction.
const IDIOMS_ONLY = process.argv.includes('--idioms-only')

const FLAGS = ['', 'sense', 'idiom', 'false-friend', 'error'] as const
const RowOut = z.object({
  word: z.string().min(1),
  en: z.string().min(1),
  example_en: z.string().min(1),
  flag: z.enum(FLAGS).default(''),
  note: z.string().default(''),
})
const BatchOut = z.array(RowOut)

// The idiom pass has its own shape AND its own flag set. `fact` is idiom-specific: an idiom
// explanation asserts where the expression came from, and an origin claim is a different kind of
// doubt from an ambiguous sense — it needs verifying, not deciding. The first run (v0.12.33)
// invented `check` and `fact` because this prompt said only "same rules as the vocabulary pass"
// and the response was parsed as a loose Record, so nothing rejected them. Enumerated here and
// parsed through Zod so a future run is reproducible; `check` folds into `fact`.
const IDIOM_FLAGS = ['', 'sense', 'idiom', 'false-friend', 'fact', 'error'] as const
const IdiomOut = z.object({
  id: z.string().min(1),
  literal_en: z.string().min(1),
  meaning_en: z.string().min(1),
  explanation_en: z.string().min(1),
  flag: z.enum(IDIOM_FLAGS).default(''),
  note: z.string().default(''),
})
const IdiomBatchOut = z.array(IdiomOut)

const SYSTEM = `You are a bilingual lexicographer preparing an English gloss set for a Spanish vocabulary app.

For each row you receive (a Spanish headword, its part of speech, its existing French gloss, and one Spanish example sentence), return ONE JSON object. Return ONLY a valid JSON array, no markdown, no commentary.

{ "word": "<the headword, echoed exactly>", "en": "...", "example_en": "...", "flag": "", "note": "" }

Rules:
- "en": a short English gloss (1-4 words), dictionary style. NO article - write "market", never "the market". For verbs use the English infinitive with "to" (write "to cook", not "cook"); repeat it on each side of a split sense ("to scrub / to wash up"). Where Spanish has one word and English splits it, give both separated by " / " (escalera -> "stairs / ladder").
- "example_en": a fluent, natural English translation of the Spanish example. Translate the SPANISH, not the French. Keep the register of the original; do not add or drop information.
- The French gloss is CONTEXT ONLY - it tells you which sense is meant. Never translate French into English; always work from the Spanish.
- "flag": leave "" when the row is unambiguous. Otherwise exactly one of:
    "sense"        - the Spanish word covers senses English splits, or the intended sense is genuinely unclear
    "idiom"        - the headword or example is idiomatic and a literal gloss would mislead
    "false-friend" - the obvious English cognate is wrong, or a reviewer might assume one
- "note": one short sentence, ONLY when flag is non-empty, explaining what a reviewer must decide.
- Echo "word" byte-for-byte, including accents. Return exactly one object per input row, in order.`

const IDIOM_SYSTEM = `You are a bilingual lexicographer preparing English content for a Spanish idiom card.

For each idiom you receive (a Spanish phrase, plus its existing French literal/meaning/explanation), return ONE JSON object. Return ONLY a valid JSON array, no markdown, no commentary.

{ "id": "<echoed exactly>", "literal_en": "...", "meaning_en": "...", "explanation_en": "...", "flag": "", "note": "" }

Rules:
- "literal_en": a word-for-word English rendering of the SPANISH phrase. It should sound odd in English - that is the point of a literal gloss.
- "meaning_en": what the idiom actually means, in idiomatic English. Give a natural English equivalent where one exists.
- "explanation_en": 2-3 sentences on usage, tone and origin, written for an English speaker. Work from the Spanish and the French explanation together, but write fresh English prose - do not translate the French sentence by sentence.
- "flag": leave "" when the entry is unambiguous and every claim is safe. Otherwise exactly one of:
    "idiom"        - no English equivalent exists and the reviewer must choose a paraphrase
    "fact"         - the explanation asserts an origin, etymology or regional claim a reviewer should verify
    "sense"        - the phrase carries senses English splits, or the intended reading is unclear
    "false-friend" - a word in the phrase has an English cognate that misleads
  Use no other value.
- "note": one short sentence, ONLY when flag is non-empty, saying what the reviewer must decide or verify.
- Echo "id" byte-for-byte.`

type PoolRow = {
  id: string
  theme_key: string
  word: string
  pos: string
  fr: string
  example: { es: string; fr?: string }
}

type IdiomRow = {
  id: string
  phrase: string
  literal: string
  meaning: string
  explanation: string
}

// TSV is chosen precisely because glosses are full of commas and slashes ("loyer / location"). Tabs
// and newlines are the only characters that could break a row, and no gloss legitimately holds one.
function tsvCell(s: string): string {
  return String(s ?? '').replace(/[\t\n\r]+/g, ' ').trim()
}

function supa() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function fetchRows(): Promise<PoolRow[]> {
  const { data, error } = await supa()
    .from('discovery_pool')
    .select('id, theme_key, word, pos, fr, example')
    .eq('status', 'active')
    .order('theme_key')
    .order('word')
  if (error) throw error
  return (data ?? []) as PoolRow[]
}

const client = new Anthropic()

async function ask(system: string, payload: unknown) {
  const message = await client.messages
    .stream({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    })
    .finalMessage()

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('no JSON array in response')
  return { raw: JSON.parse(match[0]) as unknown, usage: message.usage, model: message.model }
}

async function askChunk(rows: PoolRow[]) {
  const payload = rows.map((r) => ({ word: r.word, pos: r.pos, fr: r.fr, example_es: r.example.es }))
  const { raw, usage, model } = await ask(SYSTEM, payload)
  return { parsed: BatchOut.parse(raw), usage, model }
}

async function dryRun() {
  const rows = await fetchRows()
  console.log(`pool rows (active): ${rows.length}`)
  if (rows.length === 0) throw new Error('no rows to re-gloss')

  console.log(`\nrequested model: ${MODEL}`)
  const { parsed, usage, model } = await askChunk(rows.slice(0, 1))

  // The RESOLVED model, echoed by the API - not the string we asked for. A silent substitution would
  // put a different model's prose into a corpus that is committed forever, so this aborts instead.
  console.log(`resolved model : ${model}`)
  if (model !== MODEL) {
    throw new Error(`model mismatch: asked for ${MODEL}, served ${model} - aborting`)
  }

  console.log(`input tokens   : ${usage.input_tokens}`)
  console.log(`output tokens  : ${usage.output_tokens}`)
  console.log(`\nsample row:\n${JSON.stringify(parsed[0], null, 2)}`)

  // Project the full run from the measured single-row cost, scaled by chunk shape.
  const chunks = Math.ceil(rows.length / CHUNK)
  const inPerChunk = usage.input_tokens + (CHUNK - 1) * 60
  const outPerChunk = usage.output_tokens * CHUNK
  const cost =
    (chunks * inPerChunk * PRICE_IN_PER_MTOK) / 1e6 + (chunks * outPerChunk * PRICE_OUT_PER_MTOK) / 1e6
  console.log(
    `\nprojected full run: ${chunks} chunks of ${CHUNK} · ~$${cost.toFixed(2)} ` +
      `(at $${PRICE_IN_PER_MTOK}/$${PRICE_OUT_PER_MTOK} per MTok)`,
  )
  console.log('\nDRY RUN - nothing written. Re-run with --run to generate the review TSV.')
}

async function runIdioms() {
  mkdirSync(OUT_DIR, { recursive: true })
  const idioms = JSON.parse(readFileSync('data/idioms.json', 'utf8')) as IdiomRow[]
  const payload = idioms.map((i) => ({
    id: i.id,
    phrase: i.phrase,
    literal_fr: i.literal,
    meaning_fr: i.meaning,
    explanation_fr: i.explanation,
  }))
  const { raw, usage, model } = await ask(IDIOM_SYSTEM, payload)
  if (model !== MODEL) throw new Error(`model mismatch: asked for ${MODEL}, served ${model} - aborting`)
  const parsed = IdiomBatchOut.parse(raw)
  const out = [['id', 'phrase', 'literal_en', 'meaning_en', 'explanation_en', 'flag', 'note'].join(TAB)]
  for (const g of parsed) {
    const src = idioms.find((i) => i.id === g.id)
    if (!src) continue
    out.push(
      [src.id, src.phrase, g.literal_en, g.meaning_en, g.explanation_en, g.flag, g.note]
        .map(tsvCell)
        .join(TAB),
    )
  }
  writeFileSync(IDIOMS_TSV, out.join('\n') + '\n', 'utf8')
  const cost = (usage.input_tokens * PRICE_IN_PER_MTOK) / 1e6 + (usage.output_tokens * PRICE_OUT_PER_MTOK) / 1e6
  console.log(`resolved model: ${model}`)
  console.log(`tokens        : ${usage.input_tokens} in / ${usage.output_tokens} out`)
  console.log(`cost          : $${cost.toFixed(4)}`)
  console.log(`WROTE ${IDIOMS_TSV} (${out.length - 1} rows)`)
}

async function fullRun() {
  const rows = await fetchRows()
  const out: string[] = [HEADER]
  let spentIn = 0
  let spentOut = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const n = Math.floor(i / CHUNK) + 1
    const total = Math.ceil(rows.length / CHUNK)
    let result: Awaited<ReturnType<typeof askChunk>> | null = null

    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      try {
        result = await askChunk(chunk)
      } catch (e) {
        console.warn(`  chunk ${n} attempt ${attempt + 1} failed: ${e instanceof Error ? e.message : e}`)
      }
    }

    if (!result) {
      // Never drop rows silently - emit them flagged so the reviewer sees the hole.
      for (const r of chunk) {
        out.push(
          [r.theme_key, r.word, r.pos, r.fr, '', r.example.es, '', 'error', 'generation failed twice']
            .map(tsvCell)
            .join(TAB),
        )
      }
      console.warn(`  chunk ${n}/${total} FAILED - ${chunk.length} rows flagged`)
      continue
    }

    spentIn += result.usage.input_tokens
    spentOut += result.usage.output_tokens
    for (const g of result.parsed) {
      const src = chunk.find((c) => c.word === g.word) ?? chunk.find((c) => c.word.toLowerCase() === g.word.toLowerCase())
      if (!src) {
        console.warn(`  unmatched echo in chunk ${n}: ${JSON.stringify(g.word)}`)
        continue
      }
      out.push(
        [src.theme_key, src.word, src.pos, src.fr, g.en, src.example.es, g.example_en, g.flag, g.note]
          .map(tsvCell)
          .join(TAB),
      )
    }
    console.log(`  chunk ${n}/${total} ok`)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(POOL_TSV, out.join('\n') + '\n', 'utf8')
  await runIdioms()

  const cost = (spentIn * PRICE_IN_PER_MTOK) / 1e6 + (spentOut * PRICE_OUT_PER_MTOK) / 1e6
  console.log(`\nWROTE ${POOL_TSV} (${out.length - 1} rows)`)
  console.log(`tokens: ${spentIn} in / ${spentOut} out · actual cost ~$${cost.toFixed(2)}`)
  console.log(`\nNOT a migration. Review + edit the TSV, then re-run with --emit.`)
}

function emit() {
  if (!existsSync(POOL_TSV)) throw new Error(`no reviewed file at ${POOL_TSV} - run --run first`)
  const lines = readFileSync(POOL_TSV, 'utf8').trimEnd().split('\n').slice(1)
  const values: string[] = []
  let skipped = 0

  for (const line of lines) {
    const cols = line.split(TAB)
    const [theme_key, word, , , en, , example_en, flag] = cols
    if (flag === 'error' || !en || !example_en) {
      skipped++
      continue
    }
    const q = (s: string) => `'${s.replace(/'/g, "''")}'`
    values.push(`  (${q(theme_key)},${q(word)},${q(en)},${q(example_en)})`)
  }

  const sql = `-- M8 Phase 1b - EN glosses for the shared discovery pool (DATA ONLY).
-- Generated by scripts/regloss-pool.ts --emit from the HUMAN-REVIEWED ${POOL_TSV}.
-- No schema change: the \`en\` column exists from 20260924000000_pool_en_gloss.sql.
--
-- Idempotent and keyed on (theme_key, lower(word)) - the same key as the seed's unique index, so a
-- replay writes identical values and a row absent from the DB matches nothing (a no-op, not an
-- error). The seed (20260824000000) is ON CONFLICT ... DO NOTHING on all 10 of its INSERTs, so
-- replaying it can never overwrite what this migration writes, in any order.
--
-- ${values.length} rows written, ${skipped} skipped (flagged error or incomplete).

UPDATE discovery_pool AS p
SET en      = v.en,
    example = jsonb_set(p.example, '{en}', to_jsonb(v.example_en), true)
FROM (VALUES
${values.join(',\n')}
) AS v(theme_key, word, en, example_en)
WHERE p.theme_key = v.theme_key AND lower(p.word) = lower(v.word);

NOTIFY pgrst, 'reload schema';

-- Verification (expect 0):
--   SELECT count(*) FROM discovery_pool
--   WHERE status = 'active' AND (en IS NULL OR example->>'en' IS NULL);
`
  writeFileSync(MIGRATION_PATH, sql, 'utf8')
  console.log(`WROTE ${MIGRATION_PATH} (${values.length} rows, ${skipped} skipped)`)

  emitIdioms()
}

// Merge the reviewed idiom TSV into data/idioms.json as three ADDITIVE keys per entry.
//
// Deliberately a surgical TEXT insertion, not JSON.parse → JSON.stringify. The file stores
// `"origin": ["universal"]` inline; re-serializing with indent 2 would explode every origin array
// onto its own lines and rewrite all 10 entries. The FR fields are pinned byte-for-byte by
// lib/__fixtures__/prompt-golden.txt, so a reformat would fail the build — and would be wrong
// regardless. Each entry gains exactly three lines, inserted before its "origin" key.
function emitIdioms() {
  if (!existsSync(IDIOMS_TSV)) {
    console.log(`(no ${IDIOMS_TSV} — skipping the idiom merge)`)
    return
  }
  const rows = readFileSync(IDIOMS_TSV, 'utf8').trimEnd().split('\n').slice(1)
  let json = readFileSync(IDIOMS_PATH, 'utf8')
  let merged = 0

  for (const line of rows) {
    const [id, , literal_en, meaning_en, explanation_en] = line.split(TAB)
    if (!id || !literal_en || !meaning_en || !explanation_en) continue

    // Locate this entry's "origin" line: the first one after the entry's own "id" key.
    const idAt = json.indexOf(`"id": ${JSON.stringify(id)}`)
    if (idAt === -1) {
      console.warn(`  idiom not found in ${IDIOMS_PATH}: ${id}`)
      continue
    }
    const originAt = json.indexOf('    "origin":', idAt)
    if (originAt === -1) {
      console.warn(`  no origin key after idiom: ${id}`)
      continue
    }
    if (json.slice(idAt, originAt).includes('"literal_en"')) continue // already merged — idempotent

    const block =
      `    "literal_en": ${JSON.stringify(literal_en)},\n` +
      `    "meaning_en": ${JSON.stringify(meaning_en)},\n` +
      `    "explanation_en": ${JSON.stringify(explanation_en)},\n`
    json = json.slice(0, originAt) + block + json.slice(originAt)
    merged++
  }

  writeFileSync(IDIOMS_PATH, json, 'utf8')
  console.log(`WROTE ${IDIOMS_PATH} (${merged} idioms merged, FR fields untouched)`)
}

async function main() {
  if (DRY_RUN) return dryRun()
  if (IDIOMS_ONLY) return runIdioms()
  if (RUN) return fullRun()
  if (EMIT) return emit()
  console.log(
    'No mode given. One of:\n' +
      '  --dry-run     one row; prints resolved model + usage + projected cost (start here)\n' +
      '  --run         the full re-gloss -> scripts/out/discovery-pool-en.tsv\n' +
      '  --idioms-only just the 10 idioms -> scripts/out/idioms-en.tsv (never touches the pool TSV)\n' +
      '  --emit      approved TSV -> the committed data migration',
  )
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
