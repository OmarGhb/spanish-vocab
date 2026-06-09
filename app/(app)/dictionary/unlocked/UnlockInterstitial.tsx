'use client'

import { useRouter } from 'next/navigation'
import UnlockTakeover from '../UnlockTakeover'

// Safety-net face of the unlock celebration: the shared takeover, reached when the
// review-end path was missed (the user bailed before the bilan). router.replace so
// browser-back doesn't land back on the celebration. UnlockTakeover flips the sticky
// flag on its own mount.
export default function UnlockInterstitial({ memorizedCount }: { memorizedCount: number }) {
  const router = useRouter()
  return (
    <UnlockTakeover
      memorizedCount={memorizedCount}
      onPrimary={() => router.replace('/dictionary')}
      onDismiss={() => router.replace('/')}
    />
  )
}
