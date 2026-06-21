'use client'

import { useState } from 'react'
import { Stepper } from '@/components/form/Controls'

// "Cartes par session" stepper. cards_per_session is NOT in the SettingsProvider context (nothing
// client-side live-consumes it — /review reads it server-side), so this owns its local state and
// persists directly to /api/profile. Fire-and-forget: the optimistic value is what shows; a failed
// write self-heals on the next load (and the next /review still uses whatever is stored).
export default function SessionSizeStepper({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(initialValue)

  function handleChange(next: number) {
    if (next === value) return
    setValue(next)
    void fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards_per_session: next }),
    }).catch(() => {})
  }

  return <Stepper value={value} onChange={handleChange} />
}
