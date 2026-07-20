import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { selectDistractors, isSpanishInfinitive, deCapitalize, type DistractorCandidate } from './distractors'
import { normalizeSearch } from './word-search'

const client = new Anthropic()

// The model returns an over-generated distractor POOL with a short gloss per candidate + a short
// target gloss; the server filters it to exactly 3 words (synonym-free, mutually distinct, and — for a
// verb-infinitive target — infinitive-only) via selectDistractors. The public WordData keeps
// `distractors: string[]`. When the submitted word is a CONJUGATED VERB the model ALSO returns
// `lemma_distractor_pool` (infinitives for the lemma); getWordData filters it into `lemmaDistractors`
// so the add flow's "accept the lemma" path stores form-coherent (infinitive) distractors instead of
// reusing the conjugated ones generated for the typed surface (Piece 1, form-coherence bug).
const DistractorPoolSchema = z.object({
  target_gloss: z.string().min(1),
  candidates: z.array(z.object({ word: z.string().min(1), fr: z.string().min(1) })).min(6),
})

const RawWordDataSchema = z.object({
  definition: z.object({ es: z.string().min(1), fr: z.string().min(1), pos: z.string().min(1) }),
  lemma: z.string().min(1),
  form_annotation: z.string().min(1).nullable(),
  examples: z
    .array(z.object({ es: z.string().min(1), fr: z.string().min(1) }))
    .min(2)
    .max(3),
  distractor_pool: DistractorPoolSchema,
  // Present only for a conjugated-verb submission (lemma ≠ typed, verb pos) — infinitive candidates
  // for the lemma. Optional/nullable: the common case (infinitive or non-verb) omits it.
  lemma_distractor_pool: DistractorPoolSchema.nullable().optional(),
})

type RawWordData = z.infer<typeof RawWordDataSchema>
export type WordData = Omit<RawWordData, 'distractor_pool' | 'lemma_distractor_pool'> & {
  distractors: string[]
  // Set only when the submission was a conjugated verb; the add flow uses it if the user stores the lemma.
  lemmaDistractors?: string[]
}

const SYSTEM_PROMPT = `You are a vocabulary teaching assistant for a French speaker learning intermediate Spanish.

Return ONLY valid JSON — no markdown, no code blocks, no explanation. Match this exact structure:
{
  "definition": { "es": "...", "fr": "...", "pos": "v." },
  "lemma": "...",
  "form_annotation": "Comer — 3ª pers. plural, pretérito perfecto simple",
  "examples": [
    { "es": "...", "fr": "..." },
    { "es": "...", "fr": "..." }
  ],
  "distractor_pool": {
    "target_gloss": "voiture",
    "candidates": [
      { "word": "camión", "fr": "camion" },
      { "word": "autobús", "fr": "bus" },
      { "word": "moto", "fr": "moto" },
      { "word": "bicicleta", "fr": "vélo" },
      { "word": "tren", "fr": "train" },
      { "word": "furgoneta", "fr": "camionnette" }
    ]
  }
}

Rules:
- "definition.es": 1–2 sentences in simple Spanish (A2–B1 level). Use vocabulary simpler than or equal to the headword. Note false friends with French written in Spanish (e.g. "embarazada" ≠ embarrassée — significa estar embarazada, es decir, enceinte), and include register (formal, informal, vulgar, literario) and regional usage (España vs. Latinoamérica) when relevant.
- "definition.fr": 1–2 sentences in French explaining the word's meaning. When relevant, include register (formel, familier, vulgaire, littéraire), regional differences (e.g. "bocadillo" = sandwich en Espagne, petite friandise en Amérique latine), and false friends with French (e.g. "embarazada" ≠ embarrassée — ça veut dire enceinte).
- "definition.pos": part of speech in standard dictionary notation. Use exactly one of: "v." (verb), "n.m." (masculine noun), "n.f." (feminine noun), "n.m./f." (noun with both genders), "adj." (adjective), "adv." (adverb), "prep." (preposition), "conj." (conjunction), "pron." (pronoun), "interj." (interjection). For pronominal verbs use "v.pron.".
- "lemma": The canonical dictionary headword for the submitted word. For conjugated verbs return the infinitive; for plural nouns return the singular; for declined adjectives/determiners return the singular masculine. If the word is already in lemma form, return it unchanged. Generate "definition" and "examples" for the lemma, not the inflected form.
- "form_annotation": If the lemma you just returned equals the submitted word, return null. Otherwise return a compact Spanish string in this exact format: "<Lemma capitalized> — <grammar info in Spanish>". Em-dash separator required. Spanish grammar terminology only (no French). No full sentences.
- "examples": 2–3 natural, intermediate-level Spanish sentences, each with a fluent French translation. Each sentence must include enough surrounding context that the target word is the only natural fit for the blank — not a close synonym or related word. Use specific imagery, actions, or situations that rule out semantic neighbours. Avoid generic frames where a related word could substitute (e.g. for "atardecer", "Nos sentamos a ver el atardecer mientras el sol se hundía en el mar" is good — the sinking sun rules out "amanecer"; "Vimos el atardecer" is too weak). The target word must appear verbatim in the Spanish sentence.
- "distractor_pool": raw material for a multiple-choice exercise — the app filters it down to 3 wrong answers, so give it room to choose:
  - "target_gloss": a SHORT French gloss of the target word (1–3 words, dictionary-style, no leading article on its own). Used to detect and drop synonyms.
  - "candidates": exactly 6 Spanish words usable as WRONG answers, each { "word", "fr" } where "fr" is a SHORT 1–3 word French gloss. Each candidate MUST:
    - Be the same part of speech as the target word.
    - Be a DISTINCT member of a related category — a co-hyponym or clearly different thing that is wrong-but-plausible (e.g. for "coche": camión, autobús, moto, bicicleta, tren, furgoneta — all vehicles, none meaning "car").
    - NEVER be a true synonym of the target, and never a word that is interchangeable with it in an ordinary sentence (e.g. for "feliz" do NOT use contento / alegre / satisfecho — they all mean "happy"; use distinct adjectives like triste, cansado, enfadado, nervioso, aburrido, tranquilo).
    - Include at least one option that is clearly semantically DISTANT from the target, not only near-neighbours.
    - Be distinct from the target word and from each other.
    - VERB FORM — match the SUBMITTED word's exact grammatical form, whatever it is. If the submitted word is a CONJUGATED form, EVERY candidate must be in that SAME tense and person (submitted "sujetaron" → "soltaron", "lanzaron", "empujaron" — all preterite 3rd-person plural; NEVER the infinitives "soltar"/"lanzar"). If the submitted word is an INFINITIVE, every candidate must be an infinitive (submitted "sujetar" → "soltar", "lanzar", "empujar"). Never mix forms, and never fall back to infinitives for a conjugated target.
- "lemma_distractor_pool" (a SEPARATE set from "distractor_pool" above — it must NOT change the main pool's form): OMIT this field entirely UNLESS the submitted word is a CONJUGATED VERB form — i.e. "lemma" differs from the submitted word AND the pos is a verb. When present, it mirrors "distractor_pool"'s structure (a "target_gloss" for the LEMMA + 6 "candidates"), but its candidates are 6 INFINITIVE verbs — wrong answers for the LEMMA only (used if the learner stores the infinitive instead of the typed form). The main "distractor_pool" STILL matches the submitted word's form, not the infinitive.`

// ── Discovery batch generation (M5.1) ────────────────────────────────────────
// Compact, partial entries for a swipe deck — NOT full enrichment. A kept word is
// fully enriched later via getWordData. `word` is the bare dictionary headword
// (no article); `gender` is explicit (null for non-nouns / invariable words).
const DiscoveryEntrySchema = z.object({
  word: z.string().min(1),
  fr: z.string().min(1),
  pos: z.string().min(1),
  gender: z.enum(['m', 'f']).nullable(),
  // Coarse frequency band (M8) — drives the pool's level→band read ordering. Classified at
  // generation because the pool is seeded once; defaulting to 'core' would make the ordering inert.
  band: z.enum(['core', 'extended']),
  example: z.object({ es: z.string().min(1), fr: z.string().min(1) }),
})

export type DiscoveryEntry = z.infer<typeof DiscoveryEntrySchema>

const DiscoveryBatchSchema = z.array(DiscoveryEntrySchema)

function discoverySystemPrompt(count: number): string {
  return `You are a vocabulary teaching assistant building a discovery deck for a French speaker learning A2–B1 Spanish.

Return ONLY a valid JSON array — no markdown, no code blocks, no explanation. Each element matches this exact structure:
{
  "word": "mercado",
  "fr": "le marché",
  "pos": "n.m.",
  "gender": "m",
  "band": "core",
  "example": { "es": "...", "fr": "..." }
}

Rules:
- Produce up to ${count} entries for the given theme, ordered from most to least common.
- "word": the canonical dictionary headword in Spanish — bare, lower-case, NO article (write "mercado", never "el mercado"), singular for nouns, infinitive for verbs. Useful, everyday A2–B1 vocabulary for the theme.
- "fr": a short French gloss (1–4 words), the kind you'd see in a bilingual dictionary. For nouns include the French article (e.g. "le marché", "la casa" → "la maison").
- "pos": part of speech in standard notation. Use exactly one of: "v." (verb), "v.pron." (pronominal verb), "n.m." (masculine noun), "n.f." (feminine noun), "adj.", "adv.", "prep.", "conj.", "pron.", "interj.".
- "gender": "m" or "f" for nouns; null for anything that is not a gendered noun.
- "band": coarse frequency tier. "core" = high-frequency A2 essentials a beginner meets first; "extended" = less common or more B1-level words for the theme. Bias toward "core" for the most common words and "extended" for the rest.
- "example": one natural A2–B1 Spanish sentence using the word verbatim, with a fluent French translation.
- Do not include any word from the EXCLUDE list (case-insensitive), nor obvious inflections of those words.`
}

export async function getDiscoveryBatch(
  topicEs: string,
  count: number,
  exclude: string[],
  signal?: AbortSignal,
): Promise<DiscoveryEntry[]> {
  const excludeBlock = exclude.length
    ? `\n\nEXCLUDE (do not propose these): ${exclude.join(', ')}`
    : ''

  const message = await client.messages
    .stream(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: discoverySystemPrompt(count),
        messages: [{ role: 'user', content: `Thème : « ${topicEs} »${excludeBlock}` }],
      },
      { signal },
    )
    .finalMessage()

  const rawText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const match = rawText.match(/\[[\s\S]*\]/)
  if (!match) {
    throw new Error('Anthropic returned malformed response: no JSON array found')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('Anthropic returned malformed response: invalid JSON')
  }

  const result = DiscoveryBatchSchema.safeParse(parsed)
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'schema mismatch'
    throw new Error(`Anthropic returned malformed response: ${msg}`)
  }

  return result.data
}

export async function getWordData(word: string, signal?: AbortSignal): Promise<WordData> {
  const message = await client.messages
    .stream(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1536,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Mot espagnol : « ${word} »` }],
      },
      { signal },
    )
    .finalMessage()

  const rawText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const match = rawText.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('Anthropic returned malformed response: no JSON object found')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('Anthropic returned malformed response: invalid JSON')
  }

  const result = RawWordDataSchema.safeParse(parsed)
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'schema mismatch'
    throw new Error(`Anthropic returned malformed response: ${msg}`)
  }

  // Filter the over-generated pool to exactly 3 synonym-free, mutually-distinct distractor words.
  const { distractor_pool, lemma_distractor_pool, ...rest } = result.data
  const isVerb = rest.definition.pos.startsWith('v.')
  // Verb targets get a FORM gate on the main distractor pool: an infinitive-stored verb (word ===
  // lemma) requires infinitive distractors; an inflected verb (word ≠ lemma) rejects infinitives (the
  // wrong-form class — we don't produce the exact conjugated form here, that's the conjugate-transform).
  // Non-verbs are unconstrained.
  const isInfinitiveVerb = isVerb && normalizeSearch(word) === normalizeSearch(rest.lemma)
  const isInflectedVerb = isVerb && !isInfinitiveVerb
  const target: DistractorCandidate = { word, fr: distractor_pool.target_gloss }
  // deCapitalize so an LLM-capitalized option ("Soltar") doesn't render capitalized among lowercase
  // ones. isSpanishInfinitive (below) is case-insensitive, so this doesn't affect the form log.
  const distractors = selectDistractors(target, distractor_pool.candidates, 3, {
    requireInfinitive: isInfinitiveVerb,
    rejectInfinitive: isInflectedVerb,
  }).map(deCapitalize)
  if (distractors.length < 3) {
    // ≥6 candidates were requested; <3 unique non-target words means a duplicative/malformed pool.
    throw new Error('Anthropic returned malformed response: insufficient distractor candidates')
  }
  // FORM-SHORTFALL SIGNAL — distinctive + greppable ("[distractor-form-shortfall]"): the filter had to
  // backfill the exact wrong form it's meant to eliminate (model returned too few right-form
  // candidates). If this fires often, the prompt fix isn't holding / escalate to the conjugate-transform.
  if (isInfinitiveVerb || isInflectedVerb) {
    const wrongForm = (w: string) => isSpanishInfinitive(w) !== isInfinitiveVerb
    const badInFinal = distractors.filter(wrongForm).length
    if (badInFinal > 0) {
      const total = distractor_pool.candidates.length
      const rejected = distractor_pool.candidates.filter((c) => wrongForm(c.word)).length
      console.warn(
        `[distractor-form-shortfall] "${word}" (${isInfinitiveVerb ? 'infinitive' : 'inflected'} target): ` +
          `${badInFinal}/3 final distractors are wrong-form; ${rejected}/${total} candidates were wrong-form`,
      )
    }
  }

  // Conjugated-verb submission → also filter the lemma's INFINITIVE pool so the add flow's "store the
  // lemma" path gets form-coherent distractors (Piece 1) instead of reusing the conjugated set above.
  let lemmaDistractors: string[] | undefined
  if (lemma_distractor_pool && isVerb) {
    const lemmaTarget: DistractorCandidate = { word: rest.lemma, fr: lemma_distractor_pool.target_gloss }
    const filtered = selectDistractors(lemmaTarget, lemma_distractor_pool.candidates, 3, {
      requireInfinitive: true,
    }).map(deCapitalize)
    if (filtered.length === 3) lemmaDistractors = filtered
    else console.warn(`[enrich] lemma distractor shortfall for "${rest.lemma}" — falling back to surface set`)
  }

  return { ...rest, distractors, ...(lemmaDistractors ? { lemmaDistractors } : {}) }
}
