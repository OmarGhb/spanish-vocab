import Image from 'next/image'
import Button from '@/app/(app)/Button'

// Invite-error surface: an expired/invalid/already-used invite link lands here (from
// app/auth/confirm/route.ts). Static, FR / Paco tone, same visual shell as login/signup.
export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col px-[26px] pb-[26px] pt-[52px] w-full max-w-[430px] mx-auto">
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-[84px] h-[84px] rounded-full bg-amber-light border border-line grid place-items-center overflow-hidden">
          <Image src="/paco.png" alt="Paco" width={76} height={76} className="object-contain mt-2" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">Oups&nbsp;!</h1>
          <p className="mt-2 font-sans text-[13.5px] text-muted leading-relaxed">
            Ce lien d’invitation est invalide ou expiré. Demande une nouvelle invitation à Omar pour
            rejoindre Paco.
          </p>
        </div>
      </div>

      <div className="flex-1" />
      <div className="flex items-center justify-center gap-1.5 pt-[22px]">
        <span className="font-sans text-[13.5px] text-muted">Déjà inscrit&nbsp;?</span>
        <Button variant="text" href="/login">Se connecter</Button>
      </div>
    </main>
  )
}
