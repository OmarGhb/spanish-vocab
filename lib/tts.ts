import 'server-only'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { adminSupabase } from '@/lib/supabase/admin'

export const VOICE = 'es-ES-Neural2-F'

const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
if (!rawKey) {
  throw new Error('M4.3: GOOGLE_SERVICE_ACCOUNT_KEY env var is not configured')
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

export async function synthesizeSpanish(text: string): Promise<Buffer | null> {
  if (!text.trim()) return null
  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'es-ES', name: VOICE },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
    })
    if (!response.audioContent) return null
    return Buffer.from(response.audioContent as Uint8Array)
  } catch (e) {
    console.error('[tts] synthesizeSpanish failed:', e)
    return null
  }
}

export async function uploadAudio(buf: Buffer, word: string): Promise<string | null> {
  const filename = `${slugify(word)}__${VOICE}.mp3`
  try {
    const { error } = await adminSupabase.storage
      .from('word-audio')
      .upload(filename, buf, { contentType: 'audio/mpeg', upsert: true })
    if (error) throw error
    const { data } = adminSupabase.storage.from('word-audio').getPublicUrl(filename)
    return data.publicUrl
  } catch (e) {
    console.error('[tts] uploadAudio failed:', e)
    return null
  }
}

export async function getAudioForWord(text: string): Promise<{ es_ES: string } | null> {
  const buf = await synthesizeSpanish(text)
  if (!buf) return null
  const url = await uploadAudio(buf, text)
  if (!url) return null
  return { es_ES: url }
}
