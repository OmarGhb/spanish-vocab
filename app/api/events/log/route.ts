import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const EventSchema = z.object({
  event_type: z.enum([
    'lemma_suggestion_shown',
    'lemma_suggestion_accepted',
    'lemma_collision_shown',
    'lemma_collision_open_existing',
    'lemma_collision_add_anyway',
  ]),
  input_word: z.string().min(1),
  lemma: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = EventSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid body' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase.from('add_events').insert({
      user_id: user.id,
      event_type: parsed.data.event_type,
      input_word: parsed.data.input_word,
      lemma: parsed.data.lemma,
    })
    if (error) {
      console.error('Event log error:', error)
      return Response.json({ error: 'Internal error' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (e) {
    console.error('Event log error:', e)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
