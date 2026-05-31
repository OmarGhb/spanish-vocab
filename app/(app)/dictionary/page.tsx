import { createClient } from '@/lib/supabase/server'
import { getDictionaryState } from '@/lib/dictionary'
import UnlockSync from '../UnlockSync'
import DictionaryIndex from './DictionaryIndex'
import LockedScreen from './LockedScreen'

// One route, two faces: the A–Z index when unlocked, the locked screen otherwise.
// The locked pill and the locked Home card both point here. <UnlockSync/> flips the
// sticky flag (server action) if the threshold is reached while this page is open.
export default async function DictionaryPage() {
  const supabase = await createClient()
  const { unlocked, memorizedCount, entries } = await getDictionaryState(supabase)

  return (
    <>
      <UnlockSync />
      {unlocked ? (
        <DictionaryIndex entries={entries} />
      ) : (
        <LockedScreen memorizedCount={memorizedCount} />
      )}
    </>
  )
}
