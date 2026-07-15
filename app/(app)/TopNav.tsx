'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { House, Library, Plus, Book, Compass, UserRound, BookA, Lock } from 'lucide-react'
import { useFocusMode } from './FocusMode'
import { useSettings } from './SettingsProvider'
import { resolveChrome, NAV_CHROME } from '@/lib/immersion'
import { SELECTION_ACTIVE } from './selection'

// "Header allégé" (Accueil v2) — the single global app header, mounted once by app/(app)/layout.tsx.
// Row 1: Paco lockup (→ /) on the left + profile avatar (→ /account) on the right (the old top-left
// home-circle is retired — the lockup is now the / link). Home-only greeting. Row 2: the
// horizontally-scrollable PILL menu (unchanged format + items: Accueil · Mes mots · Ajouter · Réviser
// · Découvrir + flag-gated Dictionnaire); Conjugaison stays a Home rail card, not a nav pill.
const PILLS = [
  { href: '/',         chrome: NAV_CHROME.home,     Icon: House    },
  { href: '/words',    chrome: NAV_CHROME.myWords,  Icon: Library  },
  { href: '/add',      chrome: NAV_CHROME.add,      Icon: Plus     },
  { href: '/review',   chrome: NAV_CHROME.review,   Icon: Book     },
  { href: '/discover', chrome: NAV_CHROME.discover, Icon: Compass  },
] as const

// Exact match for '/', prefix-aware for the rest (lights the parent pill on child routes).
function routeActive(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/')
}

const PILL_BASE =
  'flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-serif font-bold whitespace-nowrap shrink-0 border'

export default function TopNav({
  dictionaryUnlocked,
  displayName,
}: {
  dictionaryUnlocked: boolean
  displayName?: string | null
}) {
  const path = usePathname()
  const { focus } = useFocusMode()
  const { immersionMode } = useSettings()
  const activeRef = useRef<HTMLAnchorElement>(null)
  // The locked pill never shows active styling; only the unlocked pill lights on /dictionary*.
  const dictActive = dictionaryUnlocked && (path === '/dictionary' || path.startsWith('/dictionary/'))
  // Account avatar lights amber on the Profil surface (nav-icon accent, not a card fill).
  const accountActive = path === '/account' || path.startsWith('/account/')

  // Bring the active pill into view on route change (it can start off-screen in the scroll row).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [path])

  // Full-focus screens (e.g. an active /review session) suppress the header entirely.
  if (focus) return null

  return (
    <header
      className="sticky top-0 z-30 bg-page px-5"
      style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
    >
      {/* Row 1 — Paco lockup (→ /) · profile avatar (→ /account). */}
      <div className="flex items-center justify-between gap-2.5">
        <Link href="/" className="press-row flex items-center gap-[11px] min-w-0">
          {/* Circle-cropped Animando lockup (object-cover top-center per the handoff). */}
          <span className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <Image src="/paco.png" alt="" width={40} height={40} className="w-10 h-10 object-cover object-top" />
          </span>
          <span className="flex flex-col leading-none min-w-0">
            <span className="font-serif text-[22px] font-bold text-ink leading-none">Paco</span>
            <span className="text-[8px] font-bold tracking-[0.16em] uppercase text-accent mt-1">
              APRENDE · RECUERDA · HABLA
            </span>
          </span>
        </Link>
        <Link
          href="/account"
          aria-label={resolveChrome(NAV_CHROME.account, immersionMode)}
          aria-current={accountActive ? 'page' : undefined}
          className={`w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ${
            accountActive ? 'press-pill-amber bg-accent text-ivory shadow-amber-sm' : 'press-icon bg-tint text-accent'
          }`}
        >
          <UserRound size={19} strokeWidth={1.8} />
        </Link>
      </div>

      {/* Greeting — Home only. "¡Hola, {prénom}!" (Spanish greeting, French name). The name is the
          shared email-derived placeholder (lib/display-name.ts) until M6 onboarding stores a real one. */}
      {path === '/' && displayName && (
        <h1 className="mt-3.5 font-serif text-[26px] font-bold text-ink tracking-[-0.01em]">
          ¡Hola, {displayName}!
        </h1>
      )}

      {/* Row 2 — horizontally-scrollable pill menu. */}
      <div className="mt-3 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {PILLS.map(({ href, chrome, Icon }) => {
          const active = routeActive(path, href)
          return (
            <Link
              key={href}
              href={href}
              ref={active ? activeRef : undefined}
              aria-current={active ? 'page' : undefined}
              className={`${PILL_BASE} ${
                active ? `press-pill-amber border-transparent ${SELECTION_ACTIVE}` : 'press-pill bg-card text-ink border-accent/60'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? undefined : 'text-accent/60'} />
              {resolveChrome(chrome, immersionMode)}
            </Link>
          )
        })}

        {/* Dictionnaire — flag-gated. Both states link to /dictionary (locked screen renders there).
            Locked = dashed border + lock glyph, never active. */}
        {dictionaryUnlocked ? (
          <Link
            href="/dictionary"
            ref={dictActive ? activeRef : undefined}
            aria-current={dictActive ? 'page' : undefined}
            className={`${PILL_BASE} ${
              dictActive ? `press-pill-amber border-transparent ${SELECTION_ACTIVE}` : 'press-pill bg-card text-ink border-accent/60'
            }`}
          >
            <BookA size={16} strokeWidth={dictActive ? 2.2 : 1.8} className={dictActive ? undefined : 'text-accent/60'} />
            {resolveChrome(NAV_CHROME.dictionary, immersionMode)}
          </Link>
        ) : (
          <Link
            href="/dictionary"
            aria-label={resolveChrome(NAV_CHROME.dictionaryLocked, immersionMode)}
            className={`${PILL_BASE} press-pill border-dashed border-tinted-border bg-card text-faint opacity-85`}
          >
            <Lock size={16} strokeWidth={1.8} className="text-faint" />
            {resolveChrome(NAV_CHROME.dictionary, immersionMode)}
          </Link>
        )}
      </div>
    </header>
  )
}
