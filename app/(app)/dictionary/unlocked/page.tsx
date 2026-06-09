import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DICTIONARY_UNLOCK_THRESHOLD, getDictionaryState } from '@/lib/dictionary'
import UnlockInterstitial from './UnlockInterstitial'

// The safety-net celebration page (reached via syncDictionaryUnlock's redirect when the
// review-end takeover was missed). Render when the unlock is owed OR already flipped — the
// flag is now flipped by the interstitial's own client mount (flip-on-show), so on the
// first arrival the flag is still false but the count has crossed; a stray visit before
// either is true bounces to /dictionary (the locked screen). memorizedCount drives the
// Fraunces milestone number from the same source as the home/dictionary count.
export default async function DictionaryUnlockedPage() {
  const supabase = await createClient()
  const { unlocked, memorizedCount } = await getDictionaryState(supabase)

  if (!unlocked && memorizedCount < DICTIONARY_UNLOCK_THRESHOLD) redirect('/dictionary')

  return <UnlockInterstitial memorizedCount={memorizedCount} />
}
