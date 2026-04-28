'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CONFIRM_WORD = 'SUPPRIMER'

export default function AccountClient() {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDelete() {
    if (confirmInput !== CONFIRM_WORD) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data: { ok?: boolean; error?: string } = await res.json()

      if (!res.ok) {
        setDeleteError(data.error ?? 'Une erreur est survenue.')
        setDeleting(false)
        return
      }

      // Sign out locally after server deleted the auth record
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setDeleteError('Erreur réseau. Réessayez.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full border border-line rounded-card py-3.5 font-serif text-sm text-ink"
      >
        Se déconnecter
      </button>

      {!showDeleteConfirm ? (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full border border-err/40 rounded-card py-3.5 font-serif text-sm text-err"
        >
          Supprimer mon compte
        </button>
      ) : (
        <div className="flex flex-col gap-3 bg-err/5 border border-err/20 rounded-card p-4">
          <p className="text-sm text-err font-serif">
            Cette action est irréversible. Tapez{' '}
            <span className="font-bold">{CONFIRM_WORD}</span> pour confirmer.
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="w-full border border-err/30 rounded-card px-4 py-3 text-sm bg-card text-ink placeholder:text-muted focus:outline-none focus:border-err"
          />
          {deleteError && <p className="text-xs text-err">{deleteError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false)
                setConfirmInput('')
                setDeleteError(null)
              }}
              className="flex-1 border border-line rounded-card py-3 font-serif text-sm text-ink"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmInput !== CONFIRM_WORD || deleting}
              className="flex-1 bg-err text-white rounded-card py-3 font-serif text-sm disabled:opacity-40 transition-opacity"
            >
              {deleting ? 'Suppression…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
