import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type WordRow = { id: string; word: string; definition: { es: string; fr: string } }

function statusLabel(reps: number, due: string): string {
  if (reps === 0) return 'Nouvelle'
  const daysUntil = Math.ceil((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysUntil <= 0) return 'À réviser'
  if (daysUntil === 1) return 'Demain'
  return `Dans ${daysUntil}j`
}

export default async function HomePage() {
  const supabase = await createClient()

  const [{ count: wordCount }, { count: dueCount }, { count: newCount }, { data: cards }] =
    await Promise.all([
      supabase.from('words').select('*', { count: 'exact', head: true }),
      supabase
        .from('review_cards')
        .select('*', { count: 'exact', head: true })
        .lte('due', new Date().toISOString()),
      supabase
        .from('review_cards')
        .select('*', { count: 'exact', head: true })
        .eq('reps', 0),
      supabase
        .from('review_cards')
        .select('reps, due, words(id, word, definition)')
        .order('due', { ascending: true })
        .limit(50),
    ])

  const entries = (cards ?? []).map((c) => {
    const w = c.words as unknown as WordRow
    const reps = c.reps as number
    const label = statusLabel(reps, c.due as string)
    return { id: w.id, word: w.word, definition: w.definition, label, reps }
  })

  return (
    <div className="flex flex-col min-h-screen pb-16">
      {/* Scrollable content */}
      <div className="flex-1 p-5 flex flex-col gap-5">
        {/* Header */}
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif text-2xl font-bold text-ink">Paco</h1>
            <span className="text-sm text-muted">es → fr</span>
          </div>
          <p className="text-sm text-muted mt-1">{wordCount ?? 0} mots enregistrés</p>
        </div>

        {/* Due banner */}
        {(dueCount ?? 0) > 0 ? (
          <Link
            href="/review"
            className="bg-err/10 border border-err/30 rounded-card px-5 py-4 flex justify-between items-center"
          >
            <div>
              <p className="text-xs text-err uppercase tracking-wide font-semibold mb-1">
                Révision disponible
              </p>
              <p className="font-serif text-xl text-err">
                {dueCount} mot{(dueCount ?? 0) !== 1 ? 's' : ''} à revoir
              </p>
            </div>
            <span className="text-err text-xl">→</span>
          </Link>
        ) : (
          <div className="bg-ok/10 border border-ok/20 rounded-card px-5 py-4">
            <p className="text-xs text-ok uppercase tracking-wide font-semibold mb-1">À jour</p>
            <p className="font-serif text-base text-ok">Aucune révision en attente.</p>
          </div>
        )}

        {/* Word list */}
        {entries.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {entries.map((e) => {
              const isOverdue = e.label === 'À réviser'
              return (
                <li key={e.id} className="bg-card rounded-card shadow-card px-4 py-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-bold text-ink">{e.word}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{e.definition.es}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isOverdue ? 'text-err' : 'text-muted'}`}>
                        {e.label}
                      </p>
                      {e.reps > 0 && (
                        <p className="text-[10px] text-muted mt-0.5">
                          {e.reps} révision{e.reps > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="bg-card rounded-card shadow-card p-6 text-center">
            <p className="text-sm text-muted">
              Aucun mot encore — commencez par en ajouter un.
            </p>
          </div>
        )}
      </div>

      {/* Pinned bottom actions */}
      <div className="p-4 flex flex-col gap-2 border-t border-line bg-page">
        <div className="flex gap-3">
          {(dueCount ?? 0) > 0 && (
            <Link
              href="/review"
              className="flex-[2] border border-line rounded-card py-3.5 text-sm text-center font-serif text-ink"
            >
              Réviser ({dueCount})
            </Link>
          )}
          <Link
            href="/add"
            className={`${(dueCount ?? 0) > 0 ? 'flex-[3]' : 'flex-1'} bg-accent text-white rounded-card py-3.5 text-sm text-center font-serif`}
          >
            + Ajouter un mot
          </Link>
        </div>
        <Link href="/discover" className="text-sm text-center text-muted py-1 font-serif">
          Découvrir {newCount ?? 0} mot{(newCount ?? 0) !== 1 ? 's' : ''} →
        </Link>
      </div>
    </div>
  )
}
