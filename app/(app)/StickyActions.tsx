'use client'

import type React from 'react'

type Props = { children: React.ReactNode }

export default function StickyActions({ children }: Props) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-[39] bg-page border-t border-line">
      <div
        className="max-w-[430px] mx-auto p-4 flex gap-3"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
    </div>
  )
}
