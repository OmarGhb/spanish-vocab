import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 p-8 bg-page text-center">
      <Image src="/paco-sad.png" alt="Paco triste" width={160} height={160} className="object-contain" />
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-bold text-ink">Paco n&apos;a pas trouvé ce mot.</h1>
        <p className="text-sm text-muted">Cette page n&apos;existe pas ou a été supprimée.</p>
      </div>
      <Link href="/" className="text-sm text-accent">
        ← Retour à l&apos;accueil
      </Link>
    </div>
  )
}
