import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UnlockInterstitial from './UnlockInterstitial'

// The celebration. Guarded so it only renders once the flag is actually set; a direct
// visit before unlock bounces to /dictionary (which shows the locked screen).
export default async function DictionaryUnlockedPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('dictionary_unlocked')
    .maybeSingle()

  if (profile?.dictionary_unlocked !== true) redirect('/dictionary')

  return <UnlockInterstitial />
}
