'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteToastMessage } from '@/lib/delete-toast'
import { resolveChrome, WORDS_CHROME, type ImmersionMode } from '@/lib/immersion'

// Deferred delete + undo, shaped to take a SET of ids (1 in M5.4b; M5.4c passes N).
// Lives at the (app)-layout level — as a sibling of FocusModeProvider — so the
// undo toast + timer SURVIVE a /words/[id] → /words navigation (the detail-page
// delete routes back to the list and the user must still see + undo the toast).
//
// State model: the provider owns `hiddenIds` (ids in the undo window, plus
// already-committed ids). /words renders from its server `items` minus
// `hiddenIds`, so optimistic removal + undo + the deterministic re-sort all fall
// out of one Set — no list↔provider callbacks, no local list copy.

const UNDO_WINDOW_MS = 5000

// The provider sits ABOVE SettingsProvider (layout nesting), so it can't read useSettings — the
// caller (WordList / WordDetailActions, both under SettingsProvider) passes the mode in. Defaults
// to fr_es so an omitting caller stays French.
type Pending = { ids: string[]; labels: string[]; mode?: ImmersionMode }

type DeferredDeleteValue = {
  hiddenIds: Set<string>
  scheduleDelete: (args: Pending) => void
}

const DeferredDeleteContext = createContext<DeferredDeleteValue>({
  hiddenIds: new Set(),
  scheduleDelete: () => {},
})

export function DeferredDeleteProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [pending, setPending] = useState<Pending | null>(null)
  const timerRef = useRef<number | null>(null)
  const pendingRef = useRef<Pending | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Fire the real DB deletes for a batch. Committed ids stay hidden; a failed
  // delete un-hides that id (the word reappears = the accepted safe failure).
  const commit = useCallback(
    (batch: Pending) => {
      batch.ids.forEach((id) => {
        void fetch(`/api/words/${id}`, { method: 'DELETE' })
          .then((res) => {
            if (!res.ok) throw new Error(`status ${res.status}`)
          })
          .catch((err) => {
            console.error('[deferred-delete] commit failed:', err)
            setHiddenIds((prev) => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          })
      })
      router.refresh()
    },
    [router],
  )

  const scheduleDelete = useCallback(
    (args: Pending) => {
      // Flush any in-flight pending immediately so no deletion is lost.
      clearTimer()
      if (pendingRef.current) commit(pendingRef.current)

      pendingRef.current = args
      setPending(args)
      setHiddenIds((prev) => {
        const next = new Set(prev)
        args.ids.forEach((id) => next.add(id))
        return next
      })

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        const batch = pendingRef.current
        pendingRef.current = null
        setPending(null)
        if (batch) commit(batch)
      }, UNDO_WINDOW_MS)
    },
    [clearTimer, commit],
  )

  const undo = useCallback(() => {
    clearTimer()
    const batch = pendingRef.current
    pendingRef.current = null
    setPending(null)
    if (batch) {
      setHiddenIds((prev) => {
        const next = new Set(prev)
        batch.ids.forEach((id) => next.delete(id))
        return next
      })
    }
  }, [clearTimer])

  // On provider unmount (leaving the authed area): clear the timer WITHOUT
  // committing — the word survives (accepted safe failure).
  useEffect(() => () => clearTimer(), [clearTimer])

  const value = useMemo(() => ({ hiddenIds, scheduleDelete }), [hiddenIds, scheduleDelete])

  return (
    <DeferredDeleteContext.Provider value={value}>
      {children}
      {pending && (
        <div className="fixed bottom-24 inset-x-0 z-40 px-4 pointer-events-none">
          {/* Dark undo toast (board §06): ink surface, amber-light trash, ivory copy,
              amber-mid "Annuler", + a 3px amber countdown rule shrinking over the window.
              Keyed on the labels so a replacement toast restarts the countdown. */}
          <div
            key={pending.labels.join('|')}
            className="relative max-w-[430px] mx-auto overflow-hidden rounded-card px-4 py-3.5 shadow-menu pointer-events-auto flex items-center gap-3.5 bg-ink select-none"
          >
            <Trash2 size={16} className="text-amber-light shrink-0" />
            <p className="text-[14.5px] font-serif text-ivory flex-1">{deleteToastMessage(pending.labels, pending.mode)}</p>
            <button
              type="button"
              onClick={undo}
              className="text-[13.5px] font-bold text-amber-mid underline underline-offset-[3px] shrink-0"
            >
              {resolveChrome(WORDS_CHROME.undo, pending.mode ?? 'fr_es')}
            </button>
            <span
              aria-hidden
              className="toast-countdown absolute left-0 bottom-0 h-[3px] w-full bg-accent"
              style={{ animationDuration: `${UNDO_WINDOW_MS}ms` }}
            />
          </div>
        </div>
      )}
    </DeferredDeleteContext.Provider>
  )
}

export function useDeferredDelete(): DeferredDeleteValue {
  return useContext(DeferredDeleteContext)
}
