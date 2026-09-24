// Dev-only enrichment probe (M8 Phase 1a). Runs getWordData for a single word in a chosen source
// locale and prints the parsed result, so the English prompt can be eyeballed for register, gloss
// style and distractor quality WITHOUT exposing the EN path to any user.
//
// It is a tsx script, never imported by the app, not a route, and has no auth surface — the same
// shape as scripts/backfill-*.ts. The API pins profiles.source_locale to 'fr' until Phase 2, so this
// is the only way to exercise the EN path today.
//
// Usage:
//   npx tsx scripts/try-enrich.ts --word casa
//   npx tsx scripts/try-enrich.ts --word fregar --locale en
//
// Costs one Anthropic call per invocation. Reads ANTHROPIC_API_KEY from .env.local via @next/env.

import { loadEnvConfig } from '@next/env'
import { getWordData } from '../lib/anthropic'
import { isSourceLocale, type SourceLocale } from '../lib/immersion'

loadEnvConfig(process.cwd())

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const word = arg('--word')?.trim()
  if (!word) {
    console.error('Usage: npx tsx scripts/try-enrich.ts --word <spanish word> [--locale fr|en]')
    process.exit(1)
  }

  const rawLocale = arg('--locale') ?? 'fr'
  if (!isSourceLocale(rawLocale)) {
    console.error(`Unknown locale "${rawLocale}". Expected one of: fr, en`)
    process.exit(1)
  }
  const locale: SourceLocale = rawLocale

  console.log(`word   : ${word}`)
  console.log(`locale : ${locale}\n`)

  const started = Date.now()
  const data = await getWordData(word, locale)
  console.log(JSON.stringify(data, null, 2))
  console.log(`\n(${Date.now() - started} ms)`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
