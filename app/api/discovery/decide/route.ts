import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const DecideSchema = z.object({
  wordId: z.string().uuid(),
  decision: z.enum(['kept', 'known']),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = DecideSchema.safeParse(body)
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

  // Only flip a row that is still 'pending' (RLS scopes to the user). If the request
  // fails for any reason the row stays 'pending' and reappears on resume — no silent loss.
  const { error } = await supabase
    .from('words')
    .update({ discovery_status: parsed.data.decision })
    .eq('id', parsed.data.wordId)
    .eq('origin', 'discovery')
    .eq('discovery_status', 'pending')

  if (error) {
    console.error('[discovery/decide] update error:', error)
    return Response.json({ error: 'Failed to record decision.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
