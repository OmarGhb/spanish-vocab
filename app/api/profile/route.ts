import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MIN_CARDS_PER_SESSION, MAX_CARDS_PER_SESSION } from '@/lib/session-cap'

// Persist the user's Profil/Préférences live controls on the profiles row (M5.5i). Partial:
// the client sends only the field that changed, fire-and-forget. Upsert because the profiles
// row may not exist yet (created lazily, like the dictionary-unlock flag + drill prefs).
const ProfileSchema = z
  .object({
    cards_per_session: z.number().int().min(MIN_CARDS_PER_SESSION).max(MAX_CARDS_PER_SESSION).optional(),
    autoplay_audio: z.boolean().optional(),
    playback_speed: z.enum(['lent', 'normal', 'rapide']).optional(),
    theme: z.enum(['sepia', 'ardoise', 'indigo', 'nuit', 'fiesta', 'olive', 'prune', 'aubergine']).optional(),
    // The two language axes (M8 Phase 0). `source_locale` is deliberately pinned to 'fr' even though
    // the column's CHECK already admits 'en': English is not selectable until the Phase 1
    // discovery_pool EN backfill has shipped, so the API stays closed while the schema is ready.
    source_locale: z.enum(['fr']).optional(),
    gloss_policy: z.enum(['visible', 'tap', 'hidden']).optional(),
    // DEPRECATED — dual-written by SettingsProvider for rollback safety during the apply-on-deploy
    // window. Dropped at Phase 2 close along with the column.
    immersion_mode: z.enum(['fr_es', 'immersion', 'totale']).optional(),
    onboarding_completed: z.boolean().optional(),
    display_name: z.string().trim().min(1).max(40).nullable().optional(),
    level: z.enum(['a1', 'a2', 'b1', 'b2']).optional(),
  })
  // Reject an empty body so a no-op write can't silently "succeed".
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update.' })

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = ProfileSchema.safeParse(body)
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

  // RLS own-row (insert/update). onConflict user_id so an existing profile is updated in place,
  // preserving the other columns (dictionary_unlocked, drill prefs) the spread doesn't touch.
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })

  if (error) {
    console.error('[profile] upsert error:', error)
    return Response.json({ error: 'Failed to save settings.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
