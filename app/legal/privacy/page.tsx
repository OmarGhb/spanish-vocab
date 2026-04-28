import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="max-w-[430px] mx-auto p-5 flex flex-col gap-5">
      <div>
        <Link href="/account" className="text-muted text-sm">
          ←
        </Link>
        <h1 className="font-serif text-2xl font-bold text-ink mt-4">
          Politique de confidentialité
        </h1>
      </div>

      <div className="bg-card rounded-card shadow-card p-5 flex flex-col gap-4 text-sm text-ink leading-relaxed">
        <p>
          Cette application est un outil personnel d&apos;apprentissage du vocabulaire espagnol.
        </p>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Données collectées</p>
          <ul className="flex flex-col gap-1 text-sm">
            <li>— Adresse e-mail (pour l&apos;authentification)</li>
            <li>— Mots ajoutés à votre vocabulaire et leur historique de révision</li>
            <li>— Aucune donnée personnelle au-delà de ce qui est nécessaire au fonctionnement de l&apos;application</li>
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Stockage</p>
          <p>
            Vos données sont stockées chez{' '}
            <a href="https://supabase.com" className="text-accent">Supabase</a>.
            {' '}L&apos;authentification utilise Supabase Auth.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Tiers</p>
          <p>
            <a href="https://anthropic.com" className="text-accent">Anthropic</a>{' '}
            reçoit les mots que vous soumettez pour générer définitions et exemples.
            Aucune information personnelle n&apos;est transmise à Anthropic.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Vos droits</p>
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis la page Compte.
            Cette action efface définitivement toutes vos données.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Contact</p>
          <p>
            Pour toute question :{' '}
            <a href="mailto:contact@example.com" className="text-accent">
              contact@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
