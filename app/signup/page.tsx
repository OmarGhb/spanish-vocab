'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidEmail, isValidPassword, PASSWORD_POLICY_TEXT } from '@/lib/password-policy'
import Field, { RevealLink } from '@/components/form/Field'
import Button from '@/app/(app)/Button'

// First-run gate (Inscription). Mirrors Login's restraint + a confirm field. The password rule and
// its on-screen helper both come from lib/password-policy.ts so they can't drift.
//
// TWO outcomes, because email confirmation is a dashboard toggle that can be flipped either way
// (v0.12.31 re-enabled it; it was off through the testing phase) — the page must be correct under
// both without a code change:
//   session present → confirmation is OFF, signUp logged them straight in → /onboarding (M6.2a);
//                     the (app) layout gate would send them there anyway, but routing directly
//                     avoids a Home flash.
//   session null    → confirmation is ON, the account exists but is unverified and there is NO
//                     session. Routing to /onboarding here would be bounced to /login by middleware
//                     with no explanation, so we hold the user on a "check your inbox" state instead.
//                     They return via the emailed link → /auth/confirm?type=signup → /onboarding.
//
// NOTE (v0.12.31): open signup is OFF in the dashboard (invite-only, v0.12.28), so in normal
// operation this page fails at signUp with the existing error copy. The inbox state is the correct
// behavior for the day signups reopen — built now so the toggle is the only remaining step.
export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Set when signUp succeeds WITHOUT a session (confirmation on) — swaps the form for the
  // inbox state. Holds the address so the panel can name it back to the user.
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null)

  const confirmMismatch = confirm.length > 0 && confirm !== password
  const canSubmit =
    isValidEmail(email) && isValidPassword(password) && confirm === password && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      console.error(authError)
      setError(
        authError.message.toLowerCase().includes('registered')
          ? 'Un compte existe déjà avec cet e-mail.'
          : 'La création du compte a échoué. Réessaie.'
      )
      setLoading(false)
      return
    }

    // No session ⇒ Supabase sent a confirmation email and is waiting for the click.
    if (!data.session) {
      setAwaitingConfirm(email)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  // Inbox state — the account exists but is unverified, so there is nothing to log into yet. Same
  // shell as /auth/error (mascot + centered copy), deliberately NOT a form: the only next action is
  // in their email client. No resend button here — /login owns that flow (it already handles the
  // rate limit), and duplicating it would mean two places to keep correct.
  if (awaitingConfirm) {
    return (
      <main className="flex min-h-screen flex-col px-[26px] pb-[26px] pt-[52px] w-full max-w-[430px] mx-auto">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-[84px] h-[84px] rounded-full bg-amber-light border border-line grid place-items-center overflow-hidden">
            <Image src="/paco.png" alt="Paco" width={76} height={76} className="object-contain mt-2" />
          </div>
          <div className="text-center">
            <h1 className="font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">
              Vérifie ta boîte de réception
            </h1>
            <p className="mt-2 font-sans text-[13.5px] text-muted leading-relaxed">
              On a envoyé un lien de confirmation à{' '}
              <span className="font-semibold text-ink break-all">{awaitingConfirm}</span>. Clique
              dessus pour activer ton compte — puis Paco t’attend.
            </p>
            <p className="mt-3 font-sans text-[12.5px] text-faint leading-relaxed">
              Rien reçu&nbsp;? Regarde dans les indésirables. Tu peux aussi renvoyer l’e-mail depuis
              l’écran de connexion.
            </p>
          </div>
        </div>

        <div className="flex-1" />
        <div className="flex items-center justify-center gap-1.5 pt-[22px]">
          <span className="font-sans text-[13.5px] text-muted">C’est fait&nbsp;?</span>
          <Button variant="text" href="/login">Se connecter</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col px-[26px] pb-[26px] pt-[52px] w-full max-w-[430px] mx-auto">
      <div className="flex flex-col items-center gap-4 mb-[30px]">
        <div className="w-[84px] h-[84px] rounded-full bg-amber-light border border-line grid place-items-center overflow-hidden">
          <Image src="/paco.png" alt="Paco" width={76} height={76} className="object-contain mt-2" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">¡Hola&nbsp;! On se lance ?</h1>
          <p className="mt-2 font-sans text-[13.5px] text-muted">Crée ton compte — c’est gratuit.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="E-mail"
          type="email"
          value={email}
          onChange={setEmail}
          labelAsPlaceholder
          error={error}
        />
        <Field
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          labelAsPlaceholder
          mono
          help={PASSWORD_POLICY_TEXT}
          trailing={<RevealLink shown={showPassword} onClick={() => setShowPassword((s) => !s)} />}
        />
        <Field
          label="Confirmer le mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={confirm}
          onChange={setConfirm}
          labelAsPlaceholder
          mono
          error={confirmMismatch ? 'Les mots de passe ne correspondent pas.' : null}
        />
        <div className="mt-1.5">
          <Button type="submit" variant="primary" full disabled={!canSubmit}>
            {loading ? 'Création…' : 'Créer un compte'}
          </Button>
        </div>
      </form>

      <div className="flex-1" />
      <div className="flex items-center justify-center gap-1.5 pt-[22px]">
        <span className="font-sans text-[13.5px] text-muted">Déjà un compte ?</span>
        <Button variant="text" href="/login">Se connecter</Button>
      </div>
    </main>
  )
}
