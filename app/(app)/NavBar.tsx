'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, BookOpen, Compass, UserRound } from 'lucide-react'

const TABS = [
  { href: '/',         label: 'Accueil',   Icon: Home       },
  { href: '/add',      label: 'Ajouter',   Icon: Plus       },
  { href: '/review',   label: 'Réviser',   Icon: BookOpen   },
  { href: '/discover', label: 'Découvrir', Icon: Compass    },
  { href: '/account',  label: 'Compte',    Icon: UserRound  },
] as const

export default function NavBar() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Bar styling lives on the inner column so the NavBar matches the app's
          max-w-[430px] content column (full-width on a phone; centered on a wider
          window) instead of being the one element that spans the full viewport. */}
      <div className="flex max-w-[430px] mx-auto bg-card border-t border-line">
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
