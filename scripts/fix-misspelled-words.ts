// One-off: corrects known misspelled/script-contaminated headwords and regenerates their audio from
// the CORRECTED spelling (a code fix alone can't repair already-stored MP3s — they were synthesized
// from the bad text). Also scans all discovery rows for any remaining non-Latin words.
//
// Usage:
//   npx tsx scripts/fix-misspelled-words.ts            # dry run (reports, writes nothing)
//   npx tsx scripts/fix-misspelled-words.ts --apply    # apply corrections + regenerate audio
//
// Note: lib/tts.ts and lib/supabase/admin.ts carry `import 'server-only'` (throws outside Next.js),
// so the TTS client + upload helper are duplicated here, mirroring scripts/backfill-audio.ts.

import { loadEnvConfig } from '@next/env'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const apply = process.argv.includes('--apply')

// Rows to correct, targeted by id (avoids re-matching accent-sensitive strings). See the misspelling
// audit: "incréible" (acute on é, should be í) and "bebер" (trailing Cyrillic homoglyphs of "er").
const FIXES: Array<{ id: string; from: string; to: string }> = [
  { id: '7c01e006-e118-4c3f-978f-8173bd3435af', from: 'incréible', to: 'increíble' },
  // bebер — Latin "beb" + Cyrillic е(U+0435) р(U+0440); correct to pure-Latin "beber".
  { id: '', from: 'bebер', to: 'beber' }, // id resolved at runtime (below) — kept lookup-safe
]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const VOICE = 'es-ES-Neural2-F'
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
if (!rawKey) {
  console.error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not configured')
  process.exit(1)
}
const credentials = JSON.parse(rawKey) as Record<string, unknown>
const ttsClient = new TextToSpeechClient({ credentials })

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

// Same script guard the runtime discovery path uses (lib/latin-script.ts), inlined for the script.
const LATIN_ONLY = /^[\p{Script=Latin}\p{M}\s'’-]+$/u
const isLatinScript = (w: string) => LATIN_ONLY.test(w.trim())

async function synthesize(text: string): Promise<Buffer | null> {
  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'es-ES', name: VOICE },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
    })
    if (!response.audioContent) return null
    return Buffer.from(response.audioContent as Uint8Array)
  } catch (e) {
    console.error('[tts] synthesize failed:', e)
    return null
  }
}

async function uploadAudio(buf: Buffer, word: string): Promise<string | null> {
  const filename = `${slugify(word)}__${VOICE}.mp3`
  try {
    const { error } = await supabase.storage
      .from('word-audio')
      .upload(filename, buf, { contentType: 'audio/mpeg', upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('word-audio').getPublicUrl(filename)
    return data.publicUrl
  } catch (e) {
    console.error('[storage] upload failed:', e)
    return null
  }
}

async function fixRow(id: string, to: string): Promise<boolean> {
  const buf = await synthesize(to) // regenerate from the CORRECTED spelling
  if (!buf) return false
  const url = await uploadAudio(buf, to)
  if (!url) return false
  const { error } = await supabase
    .from('words')
    .update({ word: to, audio_urls: { es_ES: url } })
    .eq('id', id)
  if (error) {
    console.error(`update failed for ${id}: ${error.message}`)
    return false
  }
  return true
}

async function main() {
  console.log(apply ? '=== APPLY ===' : '=== DRY RUN (pass --apply to write) ===')

  // 1. Targeted corrections.
  for (const fix of FIXES) {
    let id = fix.id
    if (!id) {
      // Resolve by exact word match (the Cyrillic row can't be typed as a literal id here).
      const { data } = await supabase.from('words').select('id, word').eq('word', fix.from).limit(1).maybeSingle()
      if (!data) {
        console.log(`- ${fix.from} → ${fix.to}: not found (already fixed?) — skipping`)
        continue
      }
      id = data.id as string
    }
    if (!apply) {
      console.log(`- would fix ${fix.from} → ${fix.to} (id ${id}) + regenerate audio`)
      continue
    }
    const ok = await fixRow(id, fix.to)
    console.log(`- ${fix.from} → ${fix.to}: ${ok ? 'ok' : 'FAILED'}`)
  }

  // 2. Scan all discovery rows for any remaining non-Latin words (pending can still promote later).
  const { data: discoveryRows, error } = await supabase
    .from('words')
    .select('id, word, discovery_status')
    .eq('origin', 'discovery')
  if (error) {
    console.error('discovery scan failed:', error.message)
    return
  }
  const contaminated = (discoveryRows ?? []).filter((r) => !isLatinScript(r.word as string))
  if (contaminated.length === 0) {
    console.log('\nDiscovery scan: no remaining non-Latin words.')
  } else {
    console.log(`\nDiscovery scan: ${contaminated.length} non-Latin word(s) still present:`)
    for (const r of contaminated) {
      console.log(`  - ${JSON.stringify(r.word)} (id ${r.id}, status ${r.discovery_status}) — review manually`)
    }
  }
}

void main()
