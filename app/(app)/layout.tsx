import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from './NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <div className="pb-16 max-w-[430px] mx-auto w-full min-h-screen">
        {children}
      </div>
      <NavBar />
    </>
  )
}
