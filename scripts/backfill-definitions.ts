// Run after the M2.5 migration:
//   dotenv -e .env.local -- npx tsx scripts/backfill-definitions.ts
// (or export NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY manually)
//
// Idempotent: only processes rows where definition->>'es' = '' (set by migration).

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const anthropic = new Anthropic()

const DefinitionSchema = z.object({
  definition: z.object({ es: z.string().min(1), fr: z.string().min(1), pos: z.string().min(1) }),
})

const SYSTEM_PROMPT = `You are a vocabulary assistant for a French speaker learning Spanish.
Return ONLY valid JSON with this exact structure:
{"definition": {"es": "...", "fr": "...", "pos": "v."}}

Rules:
- "definition.es": 1–2 sentences in simple Spanish (A2–B1 level). Use vocabulary simpler than or equal to the headword. Note false friends with French written in Spanish, and include register and regional usage (España vs. Latinoamérica) when relevant.
- "definition.fr": 1–2 sentences in French explaining the word's meaning. When relevant, include register, regional differences, and false friends with French.
- "definition.pos": part of speech in standard dictionary notation. Use exactly one of: "v." (verb), "n.m." (masculine noun), "n.f." (feminine noun), "n.m./f." (noun with both genders), "adj." (adjective), "adv." (adverb), "prep." (preposition), "conj." (conjunction), "pron." (pronoun), "interj." (interjection). For pronominal verbs use "v.pron.".`

async function getDefinition(word: string): Promise<{ es: string; fr: string; pos: string }> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Mot espagnol : « ${word} »` }],
  })

  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')

  const parsed = DefinitionSchema.safeParse(JSON.parse(match[0]))
  if (!parsed.success) throw new Error('Schema mismatch: ' + (parsed.error.issues[0]?.message ?? 'unknown'))

  return parsed.data.definition
}

async function main() {
  const { data: rows, error } = await supabase
    .from('words')
    .select('id, word, definition')
    .filter('definition->>es', 'eq', '')

  if (error) {
    console.error('Fetch failed:', error.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('Nothing to backfill.')
    return
  }

  console.log(`Backfilling ${rows.length} word(s)…`)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const newDef = await getDefinition(row.word as string)
      const { error: updateError } = await supabase
        .from('words')
        .update({ definition: newDef })
        .eq('id', row.id)
      if (updateError) throw new Error(updateError.message)
      console.log(`[${i + 1}/${rows.length}] ${row.word} ✓`)
    } catch (e) {
      console.error(`[${i + 1}/${rows.length}] ${row.word} ✗`, e instanceof Error ? e.message : e)
    }
  }

  console.log('Done.')
}

void main()
