import { createClient } from '@/lib/supabase/server'
import { getWordData } from '@/lib/anthropic'
import { contains, fuzzyMatch } from '@/lib/wordlist'
import { getAudioForWord } from '@/lib/tts'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const word =
    body !== null && typeof body === 'object' && 'word' in body && typeof body.word === 'string'
      ? (body.word as string).trim()
      : ''

  if (!word) {
    return Response.json({ error: 'Word cannot be empty.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // Check deck first — ilike without wildcards = exact case-insensitive match.
  // RLS scopes query to the authenticated user automatically.
  const { data: existing } = await supabase
    .from('words')
    .select('id, word, definition, examples, distractors, audio_urls, review_cards(id, due)')
    .ilike('word', word)
    // Don't match partial discovery rows (pending/kept/known) — they have no review card
    // and would compute a bogus deck status. Only real collection words are duplicates.
    .or('origin.eq.manual,discovery_status.eq.promoted')
    .limit(1)
    .maybeSingle()

  type ExistingRow = {
    id: string
    word: string
    definition: { es: string; fr: string; pos?: string }
    examples: Array<{ es: string; fr: string }>
    distractors: string[]
    audio_urls: { es_ES: string } | null
    review_cards: Array<{ id: string; due: string }>
  }

  const row = existing as ExistingRow | null

  if (row) {
    const card = row.review_cards[0]
    const dueDate = card?.due
    const status = dueDate && new Date(dueDate) <= new Date() ? 'due_now' : 'due_later'

    return Response.json({
      word: row.word,
      definition: row.definition,
      examples: row.examples,
      distractors: row.distractors,
      audio_urls: row.audio_urls,
      status,
      wordId: row.id,
      dueDate,
    })
  }

  // Spellcheck — only runs on deck miss so existing entries are never blocked.
  if (!contains(word)) {
    const candidates = fuzzyMatch(word, 5)
    if (candidates.length > 0) {
      return Response.json({ error: 'SPELLCHECK_CANDIDATES', candidates }, { status: 422 })
    }
    return Response.json({ error: 'SPELLCHECK_UNKNOWN' }, { status: 422 })
  }

  // Not in deck — call Anthropic and generate audio in parallel.
  let wordData: Awaited<ReturnType<typeof getWordData>>
  let wordAudio: { es_ES: string } | null
  try {
    ;[wordData, wordAudio] = await Promise.all([
      getWordData(word, request.signal),
      getAudioForWord(word),
    ])
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Anthropic call failed.' },
      { status: 500 }
    )
  }

  // If Anthropic identified a different lemma, check whether it is already in
  // the deck and generate lemma audio — both in parallel.
  let lemma: string | undefined
  let lemma_status: 'available' | 'already_in_deck' | undefined
  let lemma_word_id: string | undefined
  let lemma_audio_urls: { es_ES: string } | null = null

  if (wordData.lemma.toLowerCase() !== word.toLowerCase()) {
    lemma = wordData.lemma
    const [lemmaRowResult, lemmaAudio] = await Promise.all([
      supabase
        .from('words')
        .select('id')
        .ilike('word', wordData.lemma)
        .or('origin.eq.manual,discovery_status.eq.promoted')
        .limit(1)
        .maybeSingle(),
      getAudioForWord(wordData.lemma),
    ])
    lemma_status = lemmaRowResult.data ? 'already_in_deck' : 'available'
    if (lemmaRowResult.data) lemma_word_id = lemmaRowResult.data.id
    lemma_audio_urls = lemmaAudio
  }

  return Response.json({
    word,
    definition: wordData.definition,
    examples: wordData.examples,
    distractors: wordData.distractors,
    form_annotation: wordData.form_annotation,
    audio_urls: wordAudio,
    status: 'new',
    ...(lemma !== undefined && {
      lemma,
      lemma_status,
      lemma_audio_urls,
      ...(lemma_word_id !== undefined && { lemma_word_id }),
    }),
  })
}
