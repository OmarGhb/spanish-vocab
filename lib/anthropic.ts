import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const WordDataSchema = z.object({
  definition: z.object({ es: z.string().min(1), fr: z.string().min(1), pos: z.string().min(1) }),
  lemma: z.string().min(1),
  form_annotation: z.string().min(1).nullable(),
  examples: z
    .array(z.object({ es: z.string().min(1), fr: z.string().min(1) }))
    .min(2)
    .max(3),
  distractors: z.array(z.string().min(1)).min(3).max(3),
})

export type WordData = z.infer<typeof WordDataSchema>

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
  "distractors": ["...", "...", "..."]
}

Rules:
- "definition.es": 1–2 sentences in simple Spanish (A2–B1 level). Use vocabulary simpler than or equal to the headword. Note false friends with French written in Spanish (e.g. "embarazada" ≠ embarrassée — significa estar embarazada, es decir, enceinte), and include register (formal, informal, vulgar, literario) and regional usage (España vs. Latinoamérica) when relevant.
- "definition.fr": 1–2 sentences in French explaining the word's meaning. When relevant, include register (formel, familier, vulgaire, littéraire), regional differences (e.g. "bocadillo" = sandwich en Espagne, petite friandise en Amérique latine), and false friends with French (e.g. "embarazada" ≠ embarrassée — ça veut dire enceinte).
- "definition.pos": part of speech in standard dictionary notation. Use exactly one of: "v." (verb), "n.m." (masculine noun), "n.f." (feminine noun), "n.m./f." (noun with both genders), "adj." (adjective), "adv." (adverb), "prep." (preposition), "conj." (conjunction), "pron." (pronoun), "interj." (interjection). For pronominal verbs use "v.pron.".
- "lemma": The canonical dictionary headword for the submitted word. For conjugated verbs return the infinitive; for plural nouns return the singular; for declined adjectives/determiners return the singular masculine. If the word is already in lemma form, return it unchanged. Generate "definition" and "examples" for the lemma, not the inflected form.
- "form_annotation": If the lemma you just returned equals the submitted word, return null. Otherwise return a compact Spanish string in this exact format: "<Lemma capitalized> — <grammar info in Spanish>". Em-dash separator required. Spanish grammar terminology only (no French). No full sentences.
- "examples": 2–3 natural, intermediate-level Spanish sentences, each with a fluent French translation. Each sentence must include enough surrounding context that the target word is the only natural fit for the blank — not a close synonym or related word. Use specific imagery, actions, or situations that rule out semantic neighbours. Avoid generic frames where a related word could substitute (e.g. for "atardecer", "Nos sentamos a ver el atardecer mientras el sol se hundía en el mar" is good — the sinking sun rules out "amanecer"; "Vimos el atardecer" is too weak). The target word must appear verbatim in the Spanish sentence.
- "distractors": exactly 3 Spanish words that are plausible wrong answers in a multiple-choice exercise. They must:
  - Be the same part of speech as the target word.
  - Come from the same semantic field and register.
  - Be words a learner at this level would plausibly confuse with the target.
  - Be distinct from the target word and from each other.
  - Never be random unrelated fillers.`

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
        max_tokens: 1024,
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

  const result = WordDataSchema.safeParse(parsed)
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'schema mismatch'
    throw new Error(`Anthropic returned malformed response: ${msg}`)
  }

  return result.data
}
