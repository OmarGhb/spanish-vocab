// One-off backfill: populate `lemma` for legacy NULL-lemma inflected-add verb rows so the
// M5.3a verb path (paradigm-aware masking + grading + hint) can build a paradigm from the
// infinitive instead of from a conjugated `word`. lemma ONLY — target coordinates stay
// derived at runtime. M3.3+ adds already populate `lemma`, so this is a closed legacy set.
//
// Usage:
//   npx tsx scripts/backfill-verb-lemmas.ts            # dry-run: SELECT + print, no write
//   npx tsx scripts/backfill-verb-lemmas.ts --write     # apply (guarded: only where lemma IS NULL)
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
import { createClient } from '@supabase/supabase-js'

// word (stored, inflected) → infinitive lemma to set.
const MAP: Record<string, string> = {
  volvíamos: 'volver',
  veníamos: 'venir',
  salíamos: 'salir',
  ponía: 'poner',
  dejaba: 'dejar',
  tenía: 'tener',
  saltando: 'saltar',
  tocando: 'tocar',
}

async function main() {
  const write = process.argv.includes('--write')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const words = Object.keys(MAP)
  const { data, error } = await sb.from('words').select('id, word, lemma, definition').in('word', words)
  if (error) throw error
  const rows = data ?? []

  console.log(`Mode: ${write ? 'WRITE' : 'DRY-RUN (no write)'}`)
  console.log(`Found ${rows.length} row(s) for ${words.length} target words.\n`)

  let allNull = true
  for (const r of rows) {
    const pos = (r.definition as { pos?: string })?.pos ?? '(none)'
    const lemma = r.lemma as string | null
    if (lemma !== null) allNull = false
    console.log(
      `  id=${r.id}  word="${r.word}"  lemma=${lemma === null ? 'NULL' : `"${lemma}"`}  pos=${pos}  → would set lemma="${MAP[r.word as string]}"`,
    )
  }

  const missing = words.filter((w) => !rows.some((r) => r.word === w))
  if (missing.length) console.log(`\n  ⚠ words not found in deck: ${missing.join(', ')}`)
  console.log(`\n  all 8 rows lemma = NULL? ${allNull ? 'YES' : 'NO — some already set (those will be SKIPPED by the guard)'}`)

  if (!write) {
    console.log('\nDry-run only. Re-run with --write to apply.')
    return
  }

  let affected = 0
  for (const r of rows) {
    const target = MAP[r.word as string]
    // Guard: by id AND only where lemma IS NULL — never overwrite an already-set lemma.
    const { data: updated, error: upErr } = await sb
      .from('words')
      .update({ lemma: target })
      .eq('id', r.id as string)
      .is('lemma', null)
      .select('id, word, lemma')
    if (upErr) throw upErr
    const n = updated?.length ?? 0
    affected += n
    console.log(`  id=${r.id} word="${r.word}" → ${n === 1 ? `updated lemma="${updated![0].lemma}"` : 'SKIPPED (lemma not NULL)'}`)
  }
  console.log(`\n  rows-affected: ${affected} / ${rows.length}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
