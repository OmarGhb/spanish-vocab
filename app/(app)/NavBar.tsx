'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Accueil' },
  { href: '/add', label: 'Ajouter' },
  { href: '/review', label: 'Réviser' },
  { href: '/discover', label: 'Découvrir' },
] as const

export default function NavBar() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-line">
      <div className="flex max-w-[430px] mx-auto">
        {TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 text-center py-3 text-xs ${
              path === href ? 'text-accent font-medium' : 'text-muted'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
