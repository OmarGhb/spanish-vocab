// SERVER-ONLY — never import from a Client Component or any file that can be bundled client-side.
// Uses the service role key which bypasses RLS. Only use for admin operations (e.g., deleteUser).
import { createClient } from '@supabase/supabase-js'

export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
