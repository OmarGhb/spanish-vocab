'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Trash2, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '../Button'
import Field from '@/components/form/Field'

const CONFIRM_WORD = 'SUPPRIMER'

// Se déconnecter + Supprimer mon compte — rendered as full-width buttons below the Compte card
// (secondary + destructive). Delete opens a type-to-confirm bottom sheet; the warning copy names
// the user's TOTAL collection size (not the memorized subset). Deletion runs server-side via the
// privileged route (auth.admin.deleteUser → full FK cascade), then signs out locally.
export default function AccountActions({ totalWords }: { totalWords: number }) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function closeSheet() {
    if (deleting) return
    setSheetOpen(false)
    setConfirmText('')
    setDeleteError(null)
  }

  async function handleDelete() {
    if (confirmText !== CONFIRM_WORD) return
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
      // Auth record deleted server-side — sign out locally and leave for the logged-out screen.
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setDeleteError('Erreur réseau. Réessayez.')
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="px-4 pt-3.5 flex flex-col gap-2.5">
        <Button variant="secondary" full onClick={handleSignOut}>
          <LogOut size={17} strokeWidth={1.9} />
          Se déconnecter
        </Button>
        <Button variant="destructive" full onClick={() => setSheetOpen(true)}>
          <Trash2 size={17} strokeWidth={1.9} />
          Supprimer mon compte
        </Button>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(36,22,8,0.42)]"
          onClick={closeSheet}
        >
          <div
            className="w-full max-w-[430px] mx-auto bg-card rounded-t-[24px] border border-line border-b-0 px-[22px] pt-6 pb-[26px] shadow-[0_-10px_40px_rgba(61,43,26,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-line mx-auto mb-[18px]" />
            <div className="flex items-center gap-[11px] mb-3">
              <div className="w-10 h-10 rounded-full bg-err-bg border border-terra-border grid place-items-center text-err shrink-0">
                <TriangleAlert size={20} strokeWidth={1.9} />
              </div>
              <h2 className="font-serif text-[23px] font-bold tracking-[-0.01em] text-ink">
                Supprimer ton compte&nbsp;?
              </h2>
            </div>
            <p className="font-sans text-[13.5px] leading-[1.6] text-muted mb-[18px]">
              Cette action est <b className="text-terra-ink">définitive</b>. Tes{' '}
              <b className="text-ink">{totalWords.toLocaleString('fr-FR')} mots</b>, ton historique de
              révisions et tes progrès seront supprimés. Paco ne pourra pas les récupérer.
            </p>
            <Field
              label="Tape SUPPRIMER pour confirmer"
              value={confirmText}
              onChange={setConfirmText}
              placeholder={CONFIRM_WORD}
              mono
              error={deleteError}
            />
            <div className="mt-[18px] flex flex-col gap-2.5">
              <Button
                variant="destructive"
                full
                disabled={confirmText !== CONFIRM_WORD || deleting}
                onClick={handleDelete}
              >
                <Trash2 size={17} strokeWidth={1.9} />
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
              <Button variant="secondary" full onClick={closeSheet} disabled={deleting}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
