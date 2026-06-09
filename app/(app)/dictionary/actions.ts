'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DICTIONARY_UNLOCK_THRESHOLD, getDictionaryState } from '@/lib/dictionary'

export type UnlockEvaluation = { shouldCelebrate: boolean; memorizedCount: number }

// READ-ONLY: never writes. Returns whether the dictionary unlock celebration is owed
// (flag still unset AND ≥ threshold memorized) plus the live memorized count for the
// takeover's milestone number. The flag flip is deliberately NOT here — it happens on
// takeover-show (markDictionaryUnlocked) so the flag stays an honest "has-been-shown"
// once-guard; flipping before the ceremony renders would let a user lose the celebration
// (and suppress the safety-net) by quitting between the read and the show.
export async function evaluateDictionaryUnlock(): Promise<UnlockEvaluation> {
  const supabase = await createClient()
  const { unlocked, memorizedCount } = await getDictionaryState(supabase)
  return {
    shouldCelebrate: !unlocked && memorizedCount >= DICTIONARY_UNLOCK_THRESHOLD,
    memorizedCount,
  }
}

// Flips the sticky unlock flag. Triggered from a CLIENT MOUNT of the celebration itself
// (the <UnlockTakeover/> at review-end, or the safety-net interstitial), so the flag means
// "the ceremony has actually been shown". Idempotent; never a side effect of an RSC render
// (the M5.2b prefetch-flip lesson). No redirect.
export async function markDictionaryUnlocked(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .upsert({ user_id: user.id, dictionary_unlocked: true }, { onConflict: 'user_id' })
}

// Safety-net fallback (via <UnlockSync/> on Home / dictionary mount): if the review-end
// takeover hasn't already shown (flag still unset) and the user has crossed the threshold,
// send them to the one-time interstitial — which flips the flag on its own mount. This only
// fires when the primary review-end path was missed (the user bailed before the bilan).
// Read-only here: the flip lives with the ceremony, not with this redirect.
export async function syncDictionaryUnlock(): Promise<void> {
  const { shouldCelebrate } = await evaluateDictionaryUnlock()
  if (!shouldCelebrate) return
  // redirect() throws NEXT_REDIRECT — keep it last, outside any try/catch.
  redirect('/dictionary/unlocked')
}
