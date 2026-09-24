// FR byte-identity fixture generator + verifier (M8 Phase 1a). Captures the FRENCH enrichment
// prompts and the FR fields of data/idioms.json as a committed, byte-level fixture — the proof that
// adding an English path did not move a single byte of the French one.
//
// Usage:
//   npx tsx scripts/dump-prompts.ts            # verify against the committed fixture (writes nothing)
//   npx tsx scripts/dump-prompts.ts --emit     # (re)write the fixture — run ONCE at pre-change HEAD
//
// DELIBERATE, same rule as scripts/dump-chrome.ts: this script imports only the prompt CONSTANTS and
// the idiom DATA — never the locale selector (`systemPromptFor`) that Phase 1a introduces, and never
// the EN prompts. A proof that imports the code under test proves nothing. It reads data/idioms.json
// directly rather than through lib/idioms.ts, so the Zod schema change in 1a cannot influence what is
// captured.
//
// The ONLY edit made before this fixture was captured was adding `export` to the two FR prompt
// declarations in lib/anthropic.ts — a visibility change that cannot alter a string literal. The
// captured bytes are therefore the pre-Phase-1a French prompts exactly as they shipped in v0.12.31.
//
// No env, no network, no credentials, no Anthropic client.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const EMIT = process.argv.includes('--emit')
const FIXTURE_PATH = 'lib/__fixtures__/prompt-golden.txt'

// Discovery prompt counts to capture. The FR discovery prompt interpolates `count`, so several
// values pin the template around the substitution rather than one lucky case.
const DISCOVERY_COUNTS = [1, 10, 12, 16, 18, 60]

const SEP = '\n' + '='.repeat(100) + '\n'

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

type Idiom = {
  id: string
  phrase: string
  literal: string
  meaning: string
  explanation: string
  origin: string[]
}

async function build(): Promise<string> {
  // Imported for their VALUES only. If Phase 1a moves these constants to another module, update the
  // import path — never the bytes.
  const { SYSTEM_PROMPT, discoverySystemPrompt } = await import('../lib/anthropic')

  const parts: string[] = []
  parts.push(`# FR byte-identity golden fixture`)
  parts.push(`# Captured from the FRENCH prompts + the FR fields of data/idioms.json.`)
  parts.push(`# Regenerating this file is a DELIBERATE act — it means the French side changed.`)

  parts.push(`${SEP}## SYSTEM_PROMPT (FR word enrichment)\nsha256: ${sha256(SYSTEM_PROMPT)}\nbytes: ${Buffer.byteLength(SYSTEM_PROMPT, 'utf8')}\n---\n${SYSTEM_PROMPT}`)

  for (const n of DISCOVERY_COUNTS) {
    const p = discoverySystemPrompt(n)
    parts.push(`${SEP}## discoverySystemPrompt(${n}) (FR discovery batch)\nsha256: ${sha256(p)}\nbytes: ${Buffer.byteLength(p, 'utf8')}\n---\n${p}`)
  }

  // data/idioms.json — the FR-only projection. Read straight off disk (NOT via lib/idioms.ts) so the
  // 1a schema change cannot affect what is captured. Fields are emitted in a fixed order, one per
  // line, so a diff points at the exact field that moved. `literal` is included deliberately: entry 1
  // is already English and entry 2 is French, and that inconsistency must survive 1a untouched.
  const raw = readFileSync('data/idioms.json', 'utf8')
  const idioms = JSON.parse(raw) as Idiom[]
  const projection = idioms
    .map((i) =>
      [
        `id:          ${i.id}`,
        `phrase:      ${i.phrase}`,
        `literal:     ${i.literal}`,
        `meaning:     ${i.meaning}`,
        `explanation: ${i.explanation}`,
        `origin:      ${JSON.stringify(i.origin)}`,
      ].join('\n'),
    )
    .join('\n\n')
  parts.push(`${SEP}## data/idioms.json — FR fields (${idioms.length} entries)\nsha256: ${sha256(projection)}\n---\n${projection}`)

  return parts.join('\n') + '\n'
}

async function main() {
  const built = await build()

  console.log(`fixture bytes : ${Buffer.byteLength(built, 'utf8')}`)
  console.log(`fixture sha256: ${sha256(built)}`)

  if (EMIT) {
    writeFileSync(FIXTURE_PATH, built, 'utf8')
    console.log(`\nWROTE ${FIXTURE_PATH}`)
  } else if (existsSync(FIXTURE_PATH)) {
    const onDisk = readFileSync(FIXTURE_PATH, 'utf8')
    const match = onDisk === built
    console.log(`on-disk sha256: ${sha256(onDisk)}`)
    console.log(match ? 'VERIFY: MATCH' : 'VERIFY: MISMATCH')
    if (!match) process.exitCode = 1
  } else {
    console.log(`\nNo fixture at ${FIXTURE_PATH} — run with --emit to create it.`)
  }
}

main()
