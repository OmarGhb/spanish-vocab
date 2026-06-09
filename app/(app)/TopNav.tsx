'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { House, Library, Plus, Book, Compass, UserRound, BookA, Lock } from 'lucide-react'
import { useFocusMode } from './FocusMode'
import { SELECTION_ACTIVE } from './selection'

// Five always-on pills + a flag-gated Dictionnaire pill (rendered after the map below).
// Accueil also exists as the top-left home circle (both link to /); Compte (the avatar)
// stays a corner button, never a pill — see the header below.
const PILLS = [
  { href: '/',         label: 'Accueil',   Icon: House    },
  { href: '/words',    label: 'Mes mots',  Icon: Library  },
  { href: '/add',      label: 'Ajouter',   Icon: Plus     },
  { href: '/review',   label: 'Réviser',   Icon: Book     },
  { href: '/discover', label: 'Découvrir', Icon: Compass  },
] as const

export default function TopNav({ dictionaryUnlocked }: { dictionaryUnlocked: boolean }) {
  const path = usePathname()
  const { focus } = useFocusMode()
  const activeRef = useRef<HTMLAnchorElement>(null)
  // The locked pill never shows active styling; only the unlocked pill lights on /dictionary*.
  const dictActive = dictionaryUnlocked && (path === '/dictionary' || path.startsWith('/dictionary/'))

  // If the active pill is off-screen in the scroll row, bring it into view on mount.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [path])

  // Full-focus screens (e.g. an active /review session) suppress the nav entirely.
  if (focus) return null

  return (
    <header
      className="sticky top-0 z-30 bg-page"
      style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
    >
      {/* Row 1 — home circle (far left) · centered Paco lockup (→ /) · account avatar (far right).
          Equal-width flanking circles let the lockup center cleanly. */}
      <div className="px-5 flex items-center gap-2.5">
        <Link
          href="/"
          aria-label="Accueil"
          className="w-9 h-9 rounded-full bg-tint text-accent flex items-center justify-center shrink-0"
        >
          <House size={20} strokeWidth={1.8} />
        </Link>
        <Link href="/" className="flex-1 flex items-center justify-center gap-2 min-w-0">
          {/* Nav avatar (Animando). SWAP POINT (M5.5a): replace with the 32px head-shoulders
              Animando crop (@1×/2×/3×) once that asset lands — paco.png is already Animando, so
              this is asset-gated only; do not block on it. */}
          <Image src="/paco.png" alt="" width={40} height={40} className="object-contain shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-2xl font-bold text-ink leading-none tracking-[-0.03em]">Paco</span>
            <span className="text-[8px] font-bold tracking-[0.16em] uppercase text-accent mt-1">
              APRENDE · RECUERDA · HABLA
            </span>
          </span>
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
      <div className="mt-3 px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
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
              className={`flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-serif font-bold whitespace-nowrap shrink-0 border ${
                active ? `border-transparent ${SELECTION_ACTIVE}` : 'bg-card text-ink border-accent/60'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? undefined : 'text-accent/60'} />
              {label}
            </Link>
          )
        })}

        {/* Dictionnaire — flag-gated. Both states link to /dictionary (which renders the
            locked screen when still locked). Locked = dashed border + lock glyph, never active. */}
        {dictionaryUnlocked ? (
          <Link
            href="/dictionary"
            ref={dictActive ? activeRef : undefined}
            aria-current={dictActive ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-serif font-bold whitespace-nowrap shrink-0 border ${
              dictActive ? `border-transparent ${SELECTION_ACTIVE}` : 'bg-card text-ink border-accent/60'
            }`}
          >
            <BookA size={16} strokeWidth={dictActive ? 2.2 : 1.8} className={dictActive ? undefined : 'text-accent/60'} />
            Dictionnaire
          </Link>
        ) : (
          <Link
            href="/dictionary"
            aria-label="Dictionnaire (verrouillé)"
            className="flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-serif font-bold whitespace-nowrap shrink-0 border border-dashed border-tinted-border bg-card text-faint opacity-85"
          >
            <Lock size={16} strokeWidth={1.8} className="text-faint" />
            Dictionnaire
          </Link>
        )}
      </div>
    </header>
  )
}
