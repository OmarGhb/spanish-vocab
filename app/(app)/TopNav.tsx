'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Library, Plus, BookOpen, Compass, UserRound } from 'lucide-react'

// Four pills only. Accueil (the wordmark) and Compte (the avatar) are the corner
// buttons, never pills — see the two-row header below.
const PILLS = [
  { href: '/words',    label: 'Mes mots',  Icon: Library  },
  { href: '/add',      label: 'Ajouter',   Icon: Plus     },
  { href: '/review',   label: 'Réviser',   Icon: BookOpen },
  { href: '/discover', label: 'Découvrir', Icon: Compass  },
] as const

export default function TopNav() {
  const path = usePathname()
  const activeRef = useRef<HTMLAnchorElement>(null)

  // If the active pill is off-screen in the scroll row, bring it into view on mount.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [path])

  return (
    <header
      className="sticky top-0 z-30 bg-page"
      style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
    >
      {/* Row 1 — Paco wordmark (Home) + account avatar */}
      <div className="px-5 flex items-center justify-between">
        <Link href="/" aria-label="Accueil" className="flex items-center gap-2">
          <Image src="/paco.png" alt="" width={32} height={32} className="object-contain shrink-0" />
          <span className="font-serif text-2xl font-bold text-ink leading-none tracking-[-0.03em]">Paco</span>
        </Link>
        <Link
          href="/account"
          aria-label="Compte"
          className="w-9 h-9 rounded-full bg-tint text-accent flex items-center justify-center shrink-0"
        >
          <UserRound size={20} strokeWidth={1.8} />
        </Link>
      </div>

      {/* Row 2 — horizontally-scrollable pill row */}
      <div className="mt-3 px-5 pb-3 flex gap-2 overflow-x-auto">
        {PILLS.map(({ href, label, Icon }) => {
          // `href + '/'` guard lights the parent pill on child routes (e.g. /words/[id])
          // without false positives; childless routes degrade to exact match.
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              ref={active ? activeRef : undefined}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-serif font-semibold whitespace-nowrap shrink-0 border ${
                active ? 'bg-accent text-white border-transparent' : 'bg-card text-ink border-line'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </div>
    </header>
  )
}
