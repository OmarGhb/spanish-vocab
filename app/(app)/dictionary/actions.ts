'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DICTIONARY_UNLOCK_THRESHOLD, getDictionaryState } from '@/lib/dictionary'

// Mount-triggered (via <UnlockSync/>) flip of the sticky unlock flag once the user has
// ≥ DICTIONARY_UNLOCK_THRESHOLD memorized words, then a redirect to the one-time interstitial.
// Lives in a server action (not RSC render) so a route prefetch can't flip the flag.
// Idempotent: no-op once unlocked or below threshold.
export async function syncDictionaryUnlock(): Promise<void> {
  const supabase = await createClient()
  const { unlocked, memorizedCount } = await getDictionaryState(supabase)
  if (unlocked || memorizedCount < DICTIONARY_UNLOCK_THRESHOLD) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .upsert({ user_id: user.id, dictionary_unlocked: true }, { onConflict: 'user_id' })

  // Single load where false→true: send the user to the celebration. (redirect() throws
  // NEXT_REDIRECT — keep it last, outside any try/catch.)
  redirect('/dictionary/unlocked')
}
