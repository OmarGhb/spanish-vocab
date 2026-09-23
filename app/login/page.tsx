'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidEmail } from '@/lib/password-policy'
import { loginErrorKind, resendResult, type ResendResult } from '@/lib/auth-errors'
import Field, { RevealLink } from '@/components/form/Field'
import Button from '@/app/(app)/Button'

// Login is intentionally monolingual FR (pre-auth: no SettingsProvider / immersion mode). Strings the
// product owner supplied ES for are authored as {fr, es} pairs so login is ready if it ever goes
// bilingual; only `.fr` is rendered today. Incidental strings stay FR-only (no invented Spanish).
const COPY = {
  fillFields: { fr: 'Entre ton e-mail et ton mot de passe.' },
  badCredentials: { fr: 'E-mail ou mot de passe incorrect.' },
  resending: { fr: 'Envoi…' },
  // FR authored, ES pending (login is FR-only, so unused today; needs an ES only if login goes bilingual).
  resendError: { fr: "Impossible d'envoyer l'e-mail. Réessaie plus tard." },
  unverified: {
    fr: "Ton adresse e-mail n'est pas encore vérifiée. Regarde ta boîte de réception pour confirmer ton compte.",
    es: 'Tu correo aún no está verificado. Revisa tu bandeja de entrada para confirmar tu cuenta.',
  },
  resendButton: { fr: "Renvoyer l'e-mail de vérification", es: 'Reenviar el correo de verificación' },
  resendSent: { fr: 'E-mail envoyé ! Regarde ta boîte de réception.', es: '¡Correo enviado! Revisa tu bandeja de entrada.' },
  resendRateLimited: { fr: 'Trop de demandes. Réessaie dans quelques minutes.', es: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' },
} as const

// First-run gate (Login). Rebuilt onto the canonical auth foundation (Field/Button + [data-theme]
// tokens) — a small warm Paco presence, not a hero takeover. Any auth failure collapses to one
// non-committal terracotta message on the password field (never reveal which field was wrong).
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // When sign-in fails specifically because the email isn't confirmed, show a distinct message + a
  // "resend verification email" action instead of the generic credentials error.
  const [unverified, setUnverified] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | ResendResult>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    // Reset the per-attempt states before validating/submitting.
    setError(null)
    setUnverified(false)
    setResendStatus('idle')
    // Keep the button always enabled (an email-only gate reads as a dead button on Nuit, and the
    // password can't be validated client-side anyway) — validate on submit via the terracotta path.
    if (!isValidEmail(email) || password.length === 0) {
      setError(COPY.fillFields.fr)
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      console.error(authError)
      // Branch on the stable auth-js `code` (never the message): only the unconfirmed-email case gets
      // the distinct message; genuine bad creds AND anything else keep the non-committal generic line.
      if (loginErrorKind(authError.code) === 'unverified') {
        setUnverified(true)
      } else {
        setError(COPY.badCredentials.fr)
      }
      setLoading(false)
      return
    }

    router.push('/')
  }

  // Resend the signup confirmation email. Reachable only when Supabase "Confirm email" is ON — with
  // it off, signInWithPassword never returns `email_not_confirmed`, so the panel that hosts this
  // button never renders. Rate-limited by Supabase → its own message; other failures → a generic
  // retry line.
  async function handleResend() {
    if (resendStatus === 'sending') return
    setResendStatus('sending')
    const supabase = createClient()
    // No `emailRedirectTo`: the "Confirm signup" template builds the link itself as
    // {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding — the
    // token_hash form, because the default {{ .ConfirmationURL }} uses the implicit flow (hash
    // fragment) that @supabase/ssr's PKCE client can't consume (same bug the invite flow hit).
    // emailRedirectTo only feeds {{ .RedirectTo }}, which that template doesn't reference, so
    // passing one here would be an inert second destination competing with the real one.
    const { error: resendError } = await supabase.auth.resend({ email, type: 'signup' })
    if (resendError) console.error(resendError)
    setResendStatus(resendResult(resendError?.code ?? null))
  }

  return (
    <main className="flex min-h-screen flex-col px-[26px] pb-[26px] pt-[52px] w-full max-w-[430px] mx-auto">
      {/* Warm Paco presence — a door, not a hero. */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-[84px] h-[84px] rounded-full bg-amber-light border border-line grid place-items-center overflow-hidden">
          <Image src="/paco.png" alt="Paco" width={76} height={76} className="object-contain mt-2" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">Te revoilà !</h1>
          <p className="mt-2 font-sans text-[13.5px] text-muted">Reprends là où Paco t’attend.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="E-mail"
          type="email"
          value={email}
          onChange={setEmail}
          labelAsPlaceholder
        />
        <Field
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          labelAsPlaceholder
          mono
          error={error}
          trailing={<RevealLink shown={showPassword} onClick={() => setShowPassword((s) => !s)} />}
        />
        <div className="flex justify-end -mt-1">
          <Button variant="text" href="/forgot-password">Mot de passe oublié ?</Button>
        </div>

        {/* Unverified-email path: distinct message + resend action (not the generic field error). */}
        {unverified && (
          <div className="rounded-card border border-tinted-border bg-surface-alt px-4 py-3">
            <p className="font-sans text-[13px] leading-relaxed text-ink">{COPY.unverified.fr}</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus === 'sending'}
              className="mt-2.5 font-sans text-[13px] font-semibold text-accent underline underline-offset-2 disabled:opacity-60"
            >
              {resendStatus === 'sending' ? COPY.resending.fr : COPY.resendButton.fr}
            </button>
            {resendStatus === 'sent' && (
              <p className="mt-2 font-sans text-[12.5px] text-ok">{COPY.resendSent.fr}</p>
            )}
            {resendStatus === 'rate_limited' && (
              <p className="mt-2 font-sans text-[12.5px] text-err">{COPY.resendRateLimited.fr}</p>
            )}
            {resendStatus === 'error' && (
              <p className="mt-2 font-sans text-[12.5px] text-err">{COPY.resendError.fr}</p>
            )}
          </div>
        )}

        <div className="mt-1">
          <Button type="submit" variant="primary" full disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </div>
      </form>

      <div className="flex-1" />
      <div className="flex items-center justify-center gap-1.5 pt-[22px]">
        <span className="font-sans text-[13.5px] text-muted">Pas encore de compte ?</span>
        <Button variant="text" href="/signup">Créer un compte</Button>
      </div>
    </main>
  )
}
