import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="max-w-[430px] mx-auto p-5 flex flex-col gap-5">
      <div>
        <Link href="/account" className="text-muted text-sm">
          ←
        </Link>
        <h1 className="font-serif text-2xl font-bold text-ink mt-4">
          Conditions d&apos;utilisation
        </h1>
      </div>

      <div className="bg-card rounded-card shadow-card p-5 flex flex-col gap-4 text-sm text-ink leading-relaxed">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Utilisation</p>
          <p>
            Cette application est fournie à titre personnel et éducatif.
            Aucune garantie n&apos;est fournie quant à l&apos;exactitude des définitions,
            exemples ou traductions générés.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Compte</p>
          <p>
            Vous êtes responsable de la confidentialité de votre mot de passe.
            Vous pouvez supprimer votre compte à tout moment.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Limitation de responsabilité</p>
          <p>
            L&apos;application est fournie &quot;telle quelle&quot;.
            L&apos;auteur n&apos;est pas responsable des erreurs de contenu pédagogique.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Modifications</p>
          <p>
            Ces conditions peuvent évoluer. Toute modification sera publiée sur cette page.
          </p>
        </div>
      </div>
    </div>
  )
}
