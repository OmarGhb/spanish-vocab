'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Trash2, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '../SettingsProvider'
import { resolveChrome, ACCOUNT_CHROME, WORDS_CHROME } from '@/lib/immersion'
import Button from '../Button'
import Field from '@/components/form/Field'

// Se déconnecter + Supprimer mon compte — rendered as full-width buttons below the Compte card
// (secondary + destructive). Delete opens a type-to-confirm bottom sheet; the warning copy names
// the user's TOTAL collection size (not the memorized subset). Deletion runs server-side via the
// privileged route (auth.admin.deleteUser → full FK cascade), then signs out locally.
export default function AccountActions({ totalWords }: { totalWords: number }) {
  const router = useRouter()
  const { immersionMode: mode } = useSettings()
  // The confirm word is mode-aware so the ES instruction + the gate compare against the same token.
  const CONFIRM_WORD = resolveChrome(ACCOUNT_CHROME.confirmToken, mode)
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
        setDeleteError(data.error ?? resolveChrome(ACCOUNT_CHROME.errorOccurred, mode))
        setDeleting(false)
        return
      }
      // Auth record deleted server-side — sign out locally and leave for the logged-out screen.
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setDeleteError(resolveChrome(ACCOUNT_CHROME.networkError, mode))
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="px-4 pt-3.5 flex flex-col gap-2.5">
        <Button variant="secondary" full onClick={handleSignOut}>
          <LogOut size={17} strokeWidth={1.9} />
          {resolveChrome(ACCOUNT_CHROME.signOut, mode)}
        </Button>
        <Button variant="destructive" full onClick={() => setSheetOpen(true)}>
          <Trash2 size={17} strokeWidth={1.9} />
          {resolveChrome(ACCOUNT_CHROME.deleteAccount, mode)}
        </Button>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-scrim"
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
                {resolveChrome(ACCOUNT_CHROME.deleteTitle, mode)}
              </h2>
            </div>
            <p className="font-sans text-[13.5px] leading-[1.6] text-muted mb-[18px]">
              {mode === 'fr_es' ? (
                <>
                  Cette action est <b className="text-terra-ink">définitive</b>. Tes{' '}
                  <b className="text-ink">{totalWords.toLocaleString('fr-FR')} mots</b>, ton historique de
                  révisions et tes progrès seront supprimés. Paco ne pourra pas les récupérer.
                </>
              ) : (
                <>
                  Esta acción es <b className="text-terra-ink">definitiva</b>. Tus{' '}
                  <b className="text-ink">{totalWords.toLocaleString('es-ES')} palabras</b>, tu historial de
                  repasos y tu progreso se eliminarán. Paco no podrá recuperarlos.
                </>
              )}
            </p>
            <Field
              label={resolveChrome(ACCOUNT_CHROME.typeToConfirm, mode)}
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
                {deleting ? resolveChrome(ACCOUNT_CHROME.deleting, mode) : resolveChrome(ACCOUNT_CHROME.deletePermanently, mode)}
              </Button>
              <Button variant="secondary" full onClick={closeSheet} disabled={deleting}>
                {resolveChrome(WORDS_CHROME.undo, mode)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
