import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Persist the user's drill preferences (tense selection + person scope) on the profiles row, so the
// Setup screen pre-fills them next session. Fire-and-forget from the client on "Commencer" — the
// drill starts from the in-memory selection regardless of whether this write lands. Upsert because
// the profiles row may not exist yet (it is created lazily, like the dictionary-unlock flag).
const PrefsSchema = z.object({
  tenses: z
    .array(z.enum(['presente', 'preterito', 'imperfecto', 'futuro', 'condicional', 'subjPresente']))
    .min(1),
  personScope: z.enum(['singular', 'all']),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = PrefsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // RLS own-row (insert/update). onConflict user_id so an existing profile is updated in place
  // (preserving dictionary_unlocked, which is untouched here).
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      drill_tenses: parsed.data.tenses,
      drill_person_scope: parsed.data.personScope,
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    console.error('[drill/prefs] upsert error:', error)
    return Response.json({ error: 'Failed to save preferences.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
