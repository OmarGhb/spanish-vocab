import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopNav from './TopNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen flex flex-col">
      <TopNav />
      {children}
    </div>
  )
}
