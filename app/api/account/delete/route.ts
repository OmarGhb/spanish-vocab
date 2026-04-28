import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { error } = await adminSupabase.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('[account/delete] deleteUser failed:', error.message)
    return Response.json({ error: 'Erreur lors de la suppression du compte.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
