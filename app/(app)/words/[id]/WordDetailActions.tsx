'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, RotateCcw, Trash2 } from 'lucide-react'
import { useDeferredDelete } from '../../DeferredDelete'

// Detail-page ⋮ overflow menu (board §06). The low-frequency Relearn + Delete moved
// off the bottom bar into a top-right popover.
//   • "Remettre à réviser" — normal item; hits /api/words/reset-schedule (reschedule
//     only, no history wipe) → no confirm modal. The status pill flips to À réviser on
//     refresh, which IS the confirmation.
//   • "Supprimer" — destructive item; routes back to /words through the deferred-delete
//     primitive (the undo toast carries over — the provider is layout-level).
export default function WordDetailActions({ wordId, word }: { wordId: string; word: string }) {
  const router = useRouter()
  const { scheduleDelete } = useDeferredDelete()
  const [open, setOpen] = useState(false)
  const [relearning, setRelearning] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close on outside pointer-down or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleDelete() {
    setOpen(false)
    scheduleDelete({ ids: [wordId], labels: [word] })
    router.push('/words')
  }

  async function handleRelearn() {
    if (relearning) return
    setRelearning(true)
    try {
      const res = await fetch('/api/words/reset-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setRelearning(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`press-icon grid place-items-center w-[38px] h-[38px] rounded-full border ${
          open ? 'border-accent bg-amber-tint text-amber-deep' : 'border-line bg-card text-muted'
        }`}
      >
        <MoreVertical size={20} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-30 w-56 overflow-hidden rounded-card border border-line bg-card shadow-menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleRelearn}
            disabled={relearning}
            className="press-row w-full flex items-center gap-3 px-4 py-3.5 text-left text-[14.5px] text-ink disabled:opacity-60"
          >
            <RotateCcw size={18} className="text-muted shrink-0" />
            Remettre à réviser
          </button>
          <div className="h-px bg-border-soft" />
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className="press-row w-full flex items-center gap-3 px-4 py-3.5 text-left text-[14.5px] font-semibold text-err"
          >
            <Trash2 size={17} className="text-err shrink-0" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  )
}
