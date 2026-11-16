import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { TrainingExercise } from '../../types'
import { exercise as catalogExercise, type Exercise, type Muscle } from '../../data/exercises'
import { MUSCLE_LABELS, searchExercises } from '../../lib/trainingLog'
import { Sheet } from '../ui/Sheet'
import { Chip } from '../ui/Segmented'

const MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[]

/** Übung fürs Trainingstagebuch auswählen: zuletzt trainierte, Suche, Muskelgruppen oder eine eigene Übung */
export function ExercisePickerSheet({
  open,
  recent,
  onClose,
  onPick,
}: {
  open: boolean
  /** Zuletzt trainierte Übungen (aus dem Tagebuch) */
  recent: Pick<TrainingExercise, 'key' | 'name'>[]
  onClose: () => void
  /** Übung aus dem Katalog oder eigene (dann ex = null) */
  onPick: (ex: Exercise | null, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const results = useMemo(() => searchExercises(query, muscle), [query, muscle])
  const q = query.trim()
  const exact = results.some((e) => e.name.toLowerCase() === q.toLowerCase())

  function pick(ex: Exercise | null, name: string) {
    onPick(ex, name)
    setQuery('')
    setMuscle(null)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Übung hinzufügen" tall>
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="exercise-search" className="sr-only">
            Übung suchen
          </label>
          <input
            id="exercise-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="z. B. Bankdrücken, Kniebeugen, Plank"
            className="min-h-12 w-full rounded-2xl bg-surface-2 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {q && !exact && (
          <button
            type="button"
            onClick={() => pick(null, q)}
            className="flex min-h-12 w-full items-center gap-2 rounded-2xl bg-brand-soft px-3 text-left font-medium text-brand transition active:scale-[0.99]"
          >
            <Plus className="size-4 shrink-0" aria-hidden /> „{q}“ als eigene Übung
          </button>
        )}

        {!q && recent.length > 0 && (
          <section aria-label="Zuletzt trainiert">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Zuletzt trainiert</h3>
            <ul className="mt-1 flex flex-wrap gap-2">
              {recent.map((r) => (
                <li key={`${r.key ?? ''}-${r.name}`}>
                  <Chip onClick={() => pick((r.key && catalogExercise(r.key)) || null, r.name)}>{r.name}</Chip>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Muskelgruppe">
          <Chip active={muscle === null} onClick={() => setMuscle(null)}>
            Alle
          </Chip>
          {MUSCLES.map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
              {MUSCLE_LABELS[m]}
            </Chip>
          ))}
        </div>

        <ul className="divide-y divide-line/70" aria-label="Suchergebnisse">
          {results.map((e) => (
            <li key={e.key}>
              <button type="button" onClick={() => pick(e, e.name)} className="flex min-h-12 w-full flex-col justify-center py-2 text-left">
                <span className="font-medium">{e.name}</span>
                <span className="text-xs text-muted">{e.muscles.map((m) => MUSCLE_LABELS[m]).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 && <p className="px-1 text-sm text-muted">Keine Übung gefunden – oben als eigene Übung hinzufügen.</p>}
      </div>
    </Sheet>
  )
}
