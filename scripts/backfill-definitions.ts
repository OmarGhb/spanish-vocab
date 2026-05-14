// Backfills words with missing/malformed definition.es — full re-enrichment via getWordData.
// Updates definition, examples, distractors, lemma, form_annotation. Never touches the word field.
//
// Usage:
//   dotenv -e .env.local -- npx tsx scripts/backfill-definitions.ts [--limit=N]
//
// Run with --limit=1 first, inspect the result, then run without a limit.
// Idempotent: only processes rows still matching the empty-def WHERE clause.

import { createClient } from '@supabase/supabase-js'
import { getWordData } from '../lib/anthropic'

// Inline service-role client — lib/supabase/admin.ts has `import 'server-only'`
// which throws outside Next.js server context.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]!, 10) : undefined

async function processChunk(
  chunk: Array<{ id: string; word: string }>,
  offset: number,
  total: number,
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = []
  const failed: string[] = []

  await Promise.all(
    chunk.map(async (row, i) => {
      const idx = offset + i + 1
      try {
        const data = await getWordData(row.word)
        const { error } = await supabase
          .from('words')
          .update({
            definition: data.definition,
            examples: data.examples,
            distractors: data.distractors,
            lemma: data.lemma,
            form_annotation: data.form_annotation,
          })
          .eq('id', row.id)
        if (error) throw new Error(error.message)
        console.log(`[${idx}/${total}] ${row.word} → ok`)
        succeeded.push(row.word)
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e)
        console.error(`[${idx}/${total}] ${row.word} → FAILED: ${reason}`)
        failed.push(row.word)
      }
    }),
  )

  return { succeeded, failed }
}

async function main() {
  // Broad fetch then filter client-side — Supabase PostgREST doesn't support
  // jsonb_typeof or nested jsonb conditions via the JS client, so we pull all
  // rows and apply the WHERE logic here.
  const { data: allRows, error } = await supabase
    .from('words')
    .select('id, word, definition')
    .limit(limit ?? 100_000)

  if (error) {
    console.error('Fetch failed:', error.message)
    process.exit(1)
  }

  const rows = (allRows ?? []).filter((r) => {
    const def = r.definition as Record<string, unknown> | null
    if (def === null || typeof def !== 'object') return true
    const es = def.es
    return es === null || es === undefined || es === ''
  })

  if (rows.length === 0) {
    console.log('Nothing to backfill — all words have a valid definition.es.')
    return
  }

  console.log(`Backfilling ${rows.length} word(s)…`)

  const CHUNK = 5
  const allSucceeded: string[] = []
  const allFailed: string[] = []

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK) as Array<{ id: string; word: string }>
    const { succeeded, failed } = await processChunk(chunk, i, rows.length)
    allSucceeded.push(...succeeded)
    allFailed.push(...failed)
  }

  console.log(`\nDone. ${allSucceeded.length} succeeded, ${allFailed.length} failed.`)
  if (allFailed.length > 0) {
    console.log(`Failed words: ${allFailed.join(', ')}`)
  }
  console.log('Re-run the diagnostic query — expect 0 rows.')
}

void main()
