import Image from 'next/image'
import Button from '@/app/(app)/Button'

// Minimal stub — the « Mot de passe oublié ? » link needs a real destination, but the reset flow
// itself is deferred (backend task, out of scope for this slice). Keep the route so the login link
// doesn't churn in/out; wire the actual reset when that milestone lands.
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center px-[26px] pb-[26px] pt-[52px] w-full max-w-[430px] mx-auto">
      <div className="w-[84px] h-[84px] rounded-full bg-amber-light border border-line grid place-items-center overflow-hidden mb-4">
        <Image src="/paco.png" alt="Paco" width={76} height={76} className="object-contain mt-2" />
      </div>
      <h1 className="font-serif text-[25px] font-bold tracking-[-0.02em] text-ink">Réinitialisation</h1>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-muted max-w-[280px]">
        La réinitialisation du mot de passe arrive bientôt. En attendant, reconnecte-toi avec ton mot
        de passe habituel.
      </p>
      <div className="mt-6">
        <Button variant="text" href="/login">Retour à la connexion</Button>
      </div>
    </main>
  )
}
