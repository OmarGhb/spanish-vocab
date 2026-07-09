'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidEmail } from '@/lib/password-policy'
import Field, { RevealLink } from '@/components/form/Field'
import Button from '@/app/(app)/Button'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    // Keep the button always enabled (an email-only gate reads as a dead button on Nuit, and the
    // password can't be validated client-side anyway) — validate on submit via the terracotta path.
    if (!isValidEmail(email) || password.length === 0) {
      setError('Entre ton e-mail et ton mot de passe.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      console.error(authError)
      setError('E-mail ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/')
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
