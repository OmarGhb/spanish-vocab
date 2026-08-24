'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidPassword, PASSWORD_POLICY_TEXT } from '@/lib/password-policy'
import Field, { RevealLink } from '@/components/form/Field'
import Button from '@/app/(app)/Button'

// Invite set-password landing. Reached only after app/auth/confirm/route.ts verifyOtp's the invite token
// and sets the session cookie. FR / Paco tone (pre-app chrome boundary), same visual system as login/signup.
//
// Requires an active session: we check on mount and NEVER call updateUser without one. A direct visit with
// no session (expired/invalid, or the token already consumed) shows the "demande une nouvelle invitation"
// state instead of a form.
export default function SetPasswordPage() {
  const router = useRouter()
  // 'checking' → verifying the session exists; 'ready' → show the form; 'no-session' → invalid/expired.
  const [phase, setPhase] = useState<'checking' | 'ready' | 'no-session'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error }) => {
      setPhase(!error && data.user ? 'ready' : 'no-session')
    })
  }, [])

  const confirmMismatch = confirm.length > 0 && confirm !== password
  const canSubmit = isValidPassword(password) && confirm === password && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.updateUser({ password })

    if (authError) {
      console.error(authError)
      setError('La mise à jour du mot de passe a échoué. Réessaie.')
      setLoading(false)
      return
    }

    // No profiles row yet → the (app) layout routes the invitee into /onboarding. Redirect to `/` so the
    // onboarding gate stays the single source of truth.
    router.push('/')
  }

  return (
    <main className="flex min-h-screen flex-col px-[26px] pb-[26px] pt-[52px] w-full max-w-[430px] mx-auto">
      <div className="flex flex-col items-center gap-4 mb-[30px]">
        <div className="w-[84px] h-[84px] rounded-full bg-amber-light border border-line grid place-items-center overflow-hidden">
          <Image src="/paco.png" alt="Paco" width={76} height={76} className="object-contain mt-2" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">Bienvenue&nbsp;!</h1>
          <p className="mt-2 font-sans text-[13.5px] text-muted">
            {phase === 'no-session'
              ? 'Ton lien d’invitation n’est plus valide.'
              : 'Choisis un mot de passe pour finir ton inscription.'}
          </p>
        </div>
      </div>

      {phase === 'no-session' ? (
        <div className="rounded-card border border-tinted-border bg-surface-alt px-4 py-3.5">
          <p className="font-sans text-[13px] leading-relaxed text-ink">
            Ce lien d’invitation est invalide ou expiré. Demande une nouvelle invitation à Omar.
          </p>
          <div className="mt-2.5">
            <Button variant="text" href="/login">Retour à la connexion</Button>
          </div>
        </div>
      ) : phase === 'checking' ? (
        <p className="text-center font-sans text-[13.5px] text-muted">Un instant…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            labelAsPlaceholder
            mono
            help={PASSWORD_POLICY_TEXT}
            error={error}
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
              {loading ? 'Enregistrement…' : 'Définir mon mot de passe'}
            </Button>
          </div>
        </form>
      )}
    </main>
  )
}
