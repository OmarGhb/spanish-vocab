import { createClient } from '@/lib/supabase/server'
import { getWordData } from '@/lib/anthropic'
import { checkSpelling } from '@/lib/wordlist'
import { getAudioForWord } from '@/lib/tts'
import { oneEmbed } from '@/lib/word-status'
import { correctProcliticReflexive } from '@/lib/reflexive'

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
    .select('id, word, definition, examples, distractors, audio_urls, review_cards(id, due, state, stability)')
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
    // to-one embed (UNIQUE word_id) → object; tolerate both shapes via oneEmbed.
    review_cards:
      | { id: string; due: string; state: number; stability: number }
      | Array<{ id: string; due: string; state: number; stability: number }>
      | null
  }

  const row = existing as ExistingRow | null

  if (row) {
    const card = oneEmbed(row.review_cards)
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
      // FSRS card fields so the ④ duplicate-screen WordRow renders the real pill + gauge.
      ...(card ? { cardState: card.state, cardStability: card.stability } : {}),
    })
  }

  // Spellcheck — only runs on deck miss so existing entries are never blocked.
  // Token-aware: multi-word phrases pass iff every token is a known form (the
  // wordlist is single-token, so a whole-string lookup always failed on phrases).
  const spell = checkSpelling(word)
  if (!spell.ok) {
    if (spell.candidates.length > 0) {
      return Response.json({ error: 'SPELLCHECK_CANDIDATES', candidates: spell.candidates }, { status: 422 })
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

  // Reflexive-clitic hygiene (v0.6.5): "ti acuestas" passes the per-token spellcheck ("ti" is a
  // real word) but is a malformed proclitic. When enrichment flags a reflexive form, correct the
  // leading clitic against the person so the offered/stored headword is "te acuestas", not the typo.
  // Deterministic + verb-agnostic (no conjugator). If the input-word audio was generated for the
  // typo, regenerate it for the corrected surface (rare path — common adds skip this).
  const corrected = correctProcliticReflexive(word, wordData.lemma, wordData.form_annotation)
  if (corrected !== word) {
    wordAudio = await getAudioForWord(corrected)
  }

  // If Anthropic identified a different lemma, check whether it is already in
  // the deck and generate lemma audio — both in parallel.
  let lemma: string | undefined
  let lemma_status: 'available' | 'already_in_deck' | undefined
  let lemma_word_id: string | undefined
  let lemma_audio_urls: { es_ES: string } | null = null
  // Pure review_cards data for the in-deck interstitial status line ("revu N fois · prochaine
  // révision dans X jours"). Optional — only set when the lemma is already in the deck.
  let lemma_reps: number | undefined
  let lemma_due: string | undefined

  if (wordData.lemma.toLowerCase() !== corrected.toLowerCase()) {
    lemma = wordData.lemma
    const [lemmaRowResult, lemmaAudio] = await Promise.all([
      supabase
        .from('words')
        .select('id, review_cards(reps, due)')
        .ilike('word', wordData.lemma)
        .or('origin.eq.manual,discovery_status.eq.promoted')
        .limit(1)
        .maybeSingle(),
      getAudioForWord(wordData.lemma),
    ])
    lemma_status = lemmaRowResult.data ? 'already_in_deck' : 'available'
    if (lemmaRowResult.data) {
      lemma_word_id = lemmaRowResult.data.id
      // UNIQUE(review_cards.word_id) → to-one embed; oneEmbed tolerates both shapes (M5.1 lesson).
      const lemmaCard = oneEmbed(
        (lemmaRowResult.data as { review_cards: { reps: number; due: string } | Array<{ reps: number; due: string }> | null }).review_cards,
      )
      if (lemmaCard) {
        lemma_reps = lemmaCard.reps
        lemma_due = lemmaCard.due
      }
    }
    lemma_audio_urls = lemmaAudio
  }

  return Response.json({
    word: corrected,
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
      ...(lemma_reps !== undefined && { lemma_reps }),
      ...(lemma_due !== undefined && { lemma_due }),
    }),
  })
}
