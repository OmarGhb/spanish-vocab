'use client'

import { useEffect, useRef } from 'react'
import { syncDictionaryUnlock } from './dictionary/actions'

// Fires the unlock check once on mount (app load / dictionary access). The flip + redirect
// live in the server action; this only triggers it from a real client mount — never a prefetch.
export default function UnlockSync() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    void syncDictionaryUnlock().catch(() => {})
  }, [])
  return null
}
