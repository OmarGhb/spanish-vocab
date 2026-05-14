import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function DiscoverPage() {
  const supabase = await createClient()

  const { count: newCount } = await supabase
    .from('review_cards')
    .select('*', { count: 'exact', head: true })
    .eq('reps', 0)

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6 pb-20">
      <div className="bg-card rounded-card shadow-card p-8 flex flex-col items-center gap-4 text-center w-full">
        <Image src="/paco-feliz.png" alt="Paco" width={90} height={90} className="object-contain" />
        <div>
          <p className="font-serif text-xl font-bold text-ink">Paco est prêt !</p>
          <p className="text-sm text-muted mt-1">
            On génère les fiches et on révise ?
          </p>
          <p className="text-xs text-muted mt-3">
            {newCount ?? 0} nouveau{(newCount ?? 0) !== 1 ? 'x' : ''} mot
            {(newCount ?? 0) !== 1 ? 's' : ''} en attente. Bientôt disponible.
          </p>
        </div>
      </div>
    </div>
  )
}
