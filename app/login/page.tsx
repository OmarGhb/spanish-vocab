'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      console.error(authError)
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm bg-card p-8 rounded-card shadow-card"
      >
        <h1 className="font-serif text-2xl text-ink">Paco</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border border-line rounded-lg px-3 py-2.5 text-base bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border border-line rounded-lg px-3 py-2.5 text-base bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent"
        />
        {error && <p className="text-err text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
