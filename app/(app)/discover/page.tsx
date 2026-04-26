import { createClient } from '@/lib/supabase/server'

export default async function DiscoverPage() {
  const supabase = await createClient()

  const { count: newCount } = await supabase
    .from('review_cards')
    .select('*', { count: 'exact', head: true })
    .eq('reps', 0)

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6">
      <div className="bg-card rounded-card shadow-card p-8 text-center w-full">
        <p className="font-serif text-xl text-ink mb-2">Mode Découverte</p>
        <p className="text-sm text-muted">
          {newCount ?? 0} nouveau{(newCount ?? 0) !== 1 ? 'x' : ''} mot
          {(newCount ?? 0) !== 1 ? 's' : ''} en attente.
        </p>
        <p className="text-xs text-muted mt-4">Bientôt disponible.</p>
      </div>
    </div>
  )
}
