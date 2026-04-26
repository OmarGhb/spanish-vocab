import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type WordRow = { id: string; word: string; definition: string }

function statusLabel(reps: number, due: string): string {
  if (reps === 0) return 'Nouvelle'
  const daysUntil = Math.ceil((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysUntil <= 0) return 'À réviser'
  if (daysUntil === 1) return 'Demain'
  return `Dans ${daysUntil}j`
}

function labelClass(label: string): string {
  if (label === 'Nouvelle') return 'bg-tint text-accent'
  if (label === 'À réviser') return 'bg-err/10 text-err'
  return 'border border-line text-muted'
}

export default async function HomePage() {
  const supabase = await createClient()

  const [{ count: wordCount }, { count: dueCount }, { data: cards }] = await Promise.all([
    supabase.from('words').select('*', { count: 'exact', head: true }),
    supabase
      .from('review_cards')
      .select('*', { count: 'exact', head: true })
      .lte('due', new Date().toISOString()),
    supabase
      .from('review_cards')
      .select('reps, due, words(id, word, definition)')
      .order('due', { ascending: true })
      .limit(50),
  ])

  const entries = (cards ?? []).map((c) => {
    const w = c.words as unknown as WordRow
    return {
      id: w.id,
      word: w.word,
      definition: w.definition,
      label: statusLabel(c.reps as number, c.due as string),
    }
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-ink">Vocabulario</h1>
        <p className="text-sm text-muted mt-1">es → fr</p>
        <p className="text-xs text-muted mt-0.5">{wordCount ?? 0} mots enregistrés</p>
      </div>

      {/* Due banner */}
      {(dueCount ?? 0) > 0 ? (
        <Link
          href="/review"
          className="bg-err/10 border border-err/20 rounded-card px-5 py-4 block"
        >
          <p className="text-xs text-err uppercase tracking-wide mb-1">Révision disponible</p>
          <p className="font-serif text-xl text-err">
            {dueCount} mot{(dueCount ?? 0) !== 1 ? 's' : ''} à revoir
          </p>
        </Link>
      ) : (
        <div className="bg-ok/10 border border-ok/20 rounded-card px-5 py-4">
          <p className="text-xs text-ok uppercase tracking-wide mb-1">À jour</p>
          <p className="font-serif text-base text-ok">Aucune révision en attente.</p>
        </div>
      )}

      {/* Word list */}
      {entries.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted mb-3">Mes mots</p>
          <ul className="flex flex-col gap-2">
            {entries.map((e) => {
              const badge = labelClass(e.label)
              return (
                <li key={e.id} className="bg-card rounded-card shadow-card px-4 py-3">
                  <div className="flex justify-between items-start gap-3">
                    <p className="font-serif text-sm font-medium text-ink">{e.word}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${badge}`}>
                      {e.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">{e.definition}</p>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="bg-card rounded-card shadow-card p-6 text-center">
          <p className="text-sm text-muted mb-3">
            Aucun mot encore — commencez par en ajouter un.
          </p>
          <Link href="/add" className="text-sm text-accent">
            Ajouter un mot →
          </Link>
        </div>
      )}
    </div>
  )
}
