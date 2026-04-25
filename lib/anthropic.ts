import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const WordDataSchema = z.object({
  definition: z.string().min(1),
  examples: z
    .array(
      z.object({
        es: z.string().min(1),
        fr: z.string().min(1),
      })
    )
    .min(2)
    .max(3),
})

export type WordData = z.infer<typeof WordDataSchema>

const SYSTEM_PROMPT = `You are a vocabulary teaching assistant for a French speaker learning intermediate Spanish.

Return ONLY valid JSON — no markdown, no code blocks, no explanation. Match this exact structure:
{
  "definition": "...",
  "examples": [
    { "es": "...", "fr": "..." },
    { "es": "...", "fr": "..." }
  ]
}

Rules:
- "definition": 1–2 sentences in French explaining the word's meaning. When relevant, include:
  - Register: formal, informal, vulgar, literary.
  - Regional differences: Spain vs. Latin America (e.g. "bocadillo" = sandwich en Espagne, petite friandise en Amérique latine).
  - False friends with French (e.g. "embarazada" ≠ embarrassée — ça veut dire enceinte).
- "examples": 2–3 natural, intermediate-level Spanish sentences, each with a fluent French translation. Real everyday usage, not textbook fillers.`

export async function getWordData(word: string): Promise<WordData> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Mot espagnol : « ${word} »` }],
  })

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

  if (!result.data.definition.trim()) {
    throw new Error('Definition was empty')
  }

  return result.data
}
