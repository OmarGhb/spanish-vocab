import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const WordDataSchema = z.object({
  definition: z.object({ es: z.string().min(1), fr: z.string().min(1), pos: z.string().min(1) }),
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
- "examples": 2–3 natural, intermediate-level Spanish sentences, each with a fluent French translation. Each sentence must include enough surrounding context that the target word is the only natural fit for the blank — not a close synonym or related word. Use specific imagery, actions, or situations that rule out semantic neighbours. Avoid generic frames where a related word could substitute (e.g. for "atardecer", "Nos sentamos a ver el atardecer mientras el sol se hundía en el mar" is good — the sinking sun rules out "amanecer"; "Vimos el atardecer" is too weak). The target word must appear verbatim in the Spanish sentence.
- "distractors": exactly 3 Spanish words that are plausible wrong answers in a multiple-choice exercise. They must:
  - Be the same part of speech as the target word.
  - Come from the same semantic field and register.
  - Be words a learner at this level would plausibly confuse with the target.
  - Be distinct from the target word and from each other.
  - Never be random unrelated fillers.`

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
