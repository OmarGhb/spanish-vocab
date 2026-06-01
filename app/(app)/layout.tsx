import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopNav from './TopNav'
import { FocusModeProvider } from './FocusMode'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Cheap single-row read for the nav pill state (NOT the expensive memorized scan).
  const { data: profile } = await supabase
    .from('profiles')
    .select('dictionary_unlocked')
    .maybeSingle()

  return (
    <FocusModeProvider>
      <div className="w-full max-w-[430px] mx-auto min-h-screen flex flex-col">
        <TopNav dictionaryUnlocked={profile?.dictionary_unlocked === true} />
        {children}
      </div>
    </FocusModeProvider>
  )
}
