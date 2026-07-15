'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '../../SettingsProvider'
import { resolveChrome, ACCOUNT_CHROME, WORDS_CHROME } from '@/lib/immersion'
import Button from '../../Button'
import Field, { RevealLink } from '@/components/form/Field'
import { canSubmitPasswordChange } from '@/lib/password-policy'

// Current/new/confirm flow. Validity (≥8 + digit, confirm match) comes from the tested helper so
// the primary button's disabled state and the policy copy can't drift. On submit we REAUTHENTICATE
// (signInWithPassword with the current password) before updateUser — a wrong current password
// surfaces as the field error shown in the mockup, never silently changes the password.
export default function PasswordForm({ email }: { email: string }) {
  const router = useRouter()
  const { immersionMode: mode } = useSettings()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [reveal, setReveal] = useState({ current: false, next: false, confirm: false })
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canSubmit = canSubmitPasswordChange({ current, next, confirm }) && !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setCurrentError(null)
    setFormError(null)
    const supabase = createClient()

    // 1) Reauthenticate: verify the CURRENT password (signInWithPassword for the same user).
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current })
    if (signInError) {
      setCurrentError(resolveChrome(ACCOUNT_CHROME.pwdWrongCurrent, mode))
      setSaving(false)
      return
    }

    // 2) Set the new password.
    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    if (updateError) {
      setFormError(resolveChrome(ACCOUNT_CHROME.pwdUpdateFailed, mode))
      setSaving(false)
      return
    }

    router.push('/account')
    router.refresh()
  }

  return (
    <div className="flex-1 px-[22px] pt-5 flex flex-col gap-[18px]">
      <Field
        label={resolveChrome(ACCOUNT_CHROME.pwdCurrent, mode)}
        type={reveal.current ? 'text' : 'password'}
        mono={!reveal.current}
        value={current}
        onChange={(v) => {
          setCurrent(v)
          if (currentError) setCurrentError(null)
        }}
        placeholder={resolveChrome(ACCOUNT_CHROME.pwdCurrentPh, mode)}
        error={currentError}
        trailing={<RevealLink shown={reveal.current} onClick={() => setReveal((r) => ({ ...r, current: !r.current }))} />}
      />
      <Field
        label={resolveChrome(ACCOUNT_CHROME.pwdNew, mode)}
        type={reveal.next ? 'text' : 'password'}
        mono={!reveal.next}
        value={next}
        onChange={setNext}
        placeholder={resolveChrome(ACCOUNT_CHROME.pwdNewPh, mode)}
        help={resolveChrome(ACCOUNT_CHROME.pwdPolicy, mode)}
        trailing={<RevealLink shown={reveal.next} onClick={() => setReveal((r) => ({ ...r, next: !r.next }))} />}
      />
      <Field
        label={resolveChrome(ACCOUNT_CHROME.pwdConfirm, mode)}
        type={reveal.confirm ? 'text' : 'password'}
        mono={!reveal.confirm}
        value={confirm}
        onChange={setConfirm}
        placeholder={resolveChrome(ACCOUNT_CHROME.pwdConfirmPh, mode)}
        trailing={<RevealLink shown={reveal.confirm} onClick={() => setReveal((r) => ({ ...r, confirm: !r.confirm }))} />}
      />
      {formError && <p className="font-sans text-[12.5px] text-err">{formError}</p>}
      <div className="mt-1.5 flex flex-col gap-2.5">
        <Button variant="primary" full disabled={!canSubmit} onClick={handleSubmit}>
          {saving ? resolveChrome(ACCOUNT_CHROME.pwdUpdating, mode) : resolveChrome(ACCOUNT_CHROME.pwdUpdate, mode)}
        </Button>
        <div className="flex justify-center">
          <Button variant="text" href="/account">
            {resolveChrome(WORDS_CHROME.undo, mode)}
          </Button>
        </div>
      </div>
    </div>
  )
}
