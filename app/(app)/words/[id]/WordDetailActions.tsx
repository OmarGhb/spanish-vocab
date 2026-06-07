'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Trash2 } from 'lucide-react'
import StickyActions from '../../StickyActions'
import { useDeferredDelete } from '../../DeferredDelete'

// Detail-page actions. Delete routes back to /words via the deferred-delete
// primitive (the undo toast carries over — the provider is layout-level). Relearn
// hits /api/words/reset-schedule, which ONLY sets the card due now (no history
// wipe) — so per the rule, no confirm modal, just a button with consequence copy.
// A New / already-due card is a graceful no-op server-side.
export default function WordDetailActions({ wordId, word }: { wordId: string; word: string }) {
  const router = useRouter()
  const { scheduleDelete } = useDeferredDelete()
  const [relearning, setRelearning] = useState(false)
  const [relearned, setRelearned] = useState(false)

  function handleDelete() {
    scheduleDelete({ ids: [wordId], labels: [word] })
    router.push('/words')
  }

  async function handleRelearn() {
    if (relearning || relearned) return
    setRelearning(true)
    try {
      const res = await fetch('/api/words/reset-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId }),
      })
      if (res.ok) {
        setRelearned(true)
        router.refresh()
      }
    } finally {
      setRelearning(false)
    }
  }

  return (
    <>
      <StickyActions>
        <button
          type="button"
          onClick={handleRelearn}
          disabled={relearning || relearned}
          className="flex-1 flex items-center justify-center gap-2 rounded-card border border-line bg-card px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60"
        >
          <RotateCcw size={16} />
          {relearned ? 'Ajouté aux révisions' : 'Remettre à réviser'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center justify-center gap-2 rounded-card border border-err bg-card px-4 py-3 text-sm font-semibold text-err"
        >
          <Trash2 size={16} />
          Supprimer
        </button>
      </StickyActions>
      {relearned && (
        <p className="text-xs text-muted text-center" aria-live="polite">
          « {word} » réapparaîtra dans ta prochaine session de révision.
        </p>
      )}
    </>
  )
}
