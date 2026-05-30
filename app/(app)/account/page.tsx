import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AccountClient from './AccountClient'
import pkg from '../../../package.json'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email ?? ''

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="p-5 flex flex-col gap-5 flex-1">
        {/* Header */}
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Compte</h1>
        </div>

        {/* Account section */}
        <section className="bg-card rounded-card shadow-card p-5 flex flex-col gap-4">
          <p className="text-xs uppercase tracking-widest text-muted">Mon compte</p>
          <p className="text-sm text-ink font-medium">{email}</p>
          <AccountClient />
        </section>

        {/* Legal section */}
        <section className="bg-card rounded-card shadow-card p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-muted">Légal</p>
          <Link
            href="/legal/privacy"
            className="flex justify-between items-center text-sm text-ink py-1"
          >
            Politique de confidentialité
            <span className="text-muted">→</span>
          </Link>
          <div className="h-px bg-line" />
          <Link
            href="/legal/terms"
            className="flex justify-between items-center text-sm text-ink py-1"
          >
            Conditions d&apos;utilisation
            <span className="text-muted">→</span>
          </Link>
        </section>

        {/* About section */}
        <section className="bg-card rounded-card shadow-card p-5 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted">À propos</p>
          <div className="flex justify-between items-baseline">
            <p className="font-serif text-sm font-bold text-ink">Paco</p>
            <p className="text-xs text-muted">v{pkg.version}</p>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Application personnelle d&apos;apprentissage du vocabulaire espagnol avec répétition espacée.
          </p>
          <p className="text-xs text-muted mt-1">
            Contact :{' '}
            <a href="mailto:contact@example.com" className="text-accent">
              contact@example.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
