'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// Lets an in-flow screen (e.g. an active /review session) suppress the shared TopNav for
// full-focus, without a route group or a fixed overlay (an overlay would block the soft
// keyboard from scrolling the answer field into view). TopNav consumes `focus`; the active
// screen flips it via setFocus while mounted.
type FocusModeValue = { focus: boolean; setFocus: (v: boolean) => void }

const FocusModeContext = createContext<FocusModeValue>({ focus: false, setFocus: () => {} })

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState(false)
  const value = useMemo(() => ({ focus, setFocus }), [focus])
  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>
}

export function useFocusMode(): FocusModeValue {
  return useContext(FocusModeContext)
}
