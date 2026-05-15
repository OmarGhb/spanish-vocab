// Backfills words missing audio_urls.es_ES — synthesizes via Google Cloud TTS Neural2 and
// uploads to the `word-audio` Supabase Storage bucket.
//
// Usage:
//   npx tsx scripts/backfill-audio.ts [--limit=N]
//
// Run with --limit=1 first, inspect the result, then run without a limit.
// Idempotent: only processes rows still missing audio.
//
// Note: lib/tts.ts and lib/supabase/admin.ts both carry `import 'server-only'`
// which throws outside the Next.js server context. The TTS client setup and
// upload helper are duplicated here (~15 lines) intentionally.

import { loadEnvConfig } from '@next/env'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

// Inline service-role Supabase client — bypasses RLS, mirrors backfill-definitions.ts pattern.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Inline TTS client setup (duplicated from lib/tts.ts — see note above).
const VOICE = 'es-ES-Neural2-F'
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
if (!rawKey) {
  console.error('M4.3: GOOGLE_SERVICE_ACCOUNT_KEY env var is not configured')
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

async function upload(buf: Buffer, word: string): Promise<string | null> {
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

type WordRow = { id: string; word: string; audio_urls: unknown }

const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]!, 10) : undefined

async function main() {
  const { data: allRows, error } = await supabase.from('words').select('id, word, audio_urls')
  if (error) {
    console.error('Fetch failed:', error.message)
    process.exit(1)
  }

  const rows = (allRows as WordRow[]).filter((r) => {
    if (!r.audio_urls || typeof r.audio_urls !== 'object') return true
    return !((r.audio_urls as Record<string, unknown>).es_ES)
  })

  const batch = limit !== undefined ? rows.slice(0, limit) : rows
  const total = batch.length

  if (total === 0) {
    console.log('Nothing to backfill — all words already have audio_urls.es_ES.')
    return
  }

  console.log(`Backfilling ${total} word(s)…`)

  let succeeded = 0
  let failed = 0
  let skipped = 0

  const CHUNK = 3
  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK)
    await Promise.all(
      chunk.map(async (row, j) => {
        const idx = i + j + 1
        // Double-check: row may have been updated since initial fetch.
        if (row.audio_urls && typeof row.audio_urls === 'object' && (row.audio_urls as Record<string, unknown>).es_ES) {
          console.log(`[${idx}/${total}] ${row.word} — skipped`)
          skipped++
          return
        }
        const buf = await synthesize(row.word)
        if (!buf) {
          console.error(`[${idx}/${total}] ${row.word} — failed (synth)`)
          failed++
          return
        }
        const url = await upload(buf, row.word)
        if (!url) {
          console.error(`[${idx}/${total}] ${row.word} — failed (upload)`)
          failed++
          return
        }
        const { error: updateError } = await supabase
          .from('words')
          .update({ audio_urls: { es_ES: url } })
          .eq('id', row.id)
        if (updateError) {
          console.error(`[${idx}/${total}] ${row.word} — failed (update): ${updateError.message}`)
          failed++
          return
        }
        console.log(`[${idx}/${total}] ${row.word} — ok`)
        succeeded++
      }),
    )
  }

  console.log(`\nDone. ${total} total — ${succeeded} succeeded, ${failed} failed, ${skipped} skipped.`)
}

void main()
