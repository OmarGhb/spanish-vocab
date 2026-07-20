'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// While Home is in the "preparing" state (words kept-but-not-yet-enriched, e.g. straight out of
// onboarding), refresh the server-rendered Home every few seconds until the words are promoted and
// Home re-renders as ready — so they "appear here in a moment" without a manual refresh. Also fires
// ONE catch-up enrichment POST on mount (the endpoint is concurrency-safe / idempotent) in case the
// discovery bilan trigger was missed or a 'kept' row was stranded. Bounded so it never polls forever;
// after the cap it stops and a manual refresh still works. Unmounts (clearing the interval) as soon
// as Home is no longer preparing, since it's only rendered in that state.
const INTERVAL_MS = 4000
const MAX_ATTEMPTS = 60 // ~4 min at 4s — comfortably covers a large onboarding batch's enrichment

export default function PreparingPoller() {
  const router = useRouter()
  const attempts = useRef(0)

  useEffect(() => {
    void fetch('/api/discovery/enrich', { method: 'POST' }).catch(() => {})

    const id = setInterval(() => {
      attempts.current += 1
      if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(id)
        return
      }
      router.refresh()
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [router])

  return null
}
