import { useEffect, useState } from 'react'
import type { LogEntry, MealType } from '../../types'
import { MEAL_LABELS } from '../../lib/meals'
import { dishIngredientsFromEntries, suggestDishName } from '../../lib/dishes'
import { totalsOf } from '../../lib/log'
import { fmtInt } from '../../lib/format'
import { fmtAmount } from '../../lib/units'
import { useDishes, useSaveDish } from '../../hooks/data'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { useToast } from '../ui/Toast'

/** Die Einträge einer Mahlzeit als wiederverwendbares Gericht speichern */
export function SaveMealAsDishSheet({ source, onClose }: { source: { meal: MealType; entries: LogEntry[] } | null; onClose: () => void }) {
  const { data: dishes = [] } = useDishes()
  const save = useSaveDish()
  const toast = useToast()
  const [name, setName] = useState('')

  useEffect(() => {
    if (source) setName(suggestDishName(source.meal, dishes.map((d) => d.name)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  if (!source) return null
  const total = totalsOf(source.entries)
  return (
    <Sheet
      open={!!source}
      onClose={onClose}
      title="Als Gericht speichern"
      footer={
        <Button
          block
          size="lg"
          disabled={!name.trim() || save.isPending}
          onClick={async () => {
            await save.mutateAsync({
              name: name.trim(),
              servings: 1,
              ingredients: dishIngredientsFromEntries(source.entries),
              is_favorite: false,
              last_used_at: null,
            })
            toast('Gericht gespeichert – beim Hinzufügen unter „Gerichte“', '🍽️')
            onClose()
          }}
        >
          Gericht speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Dein {MEAL_LABELS[source.meal]} mit {source.entries.length} Einträgen ({fmtInt(total.kcal)} kcal) lässt sich danach mit einem Tipp
          wieder eintragen.
        </p>
        <Field label="Name des Gerichts" value={name} onChange={(e) => setName(e.target.value)} />
        <ul className="divide-y divide-line/70 rounded-2xl bg-surface-2/60 px-3 text-sm">
          {source.entries.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0 truncate">{e.name}</span>
              <span className="shrink-0 text-muted tabular">
                {fmtAmount(Number(e.amount), e.unit)} · {fmtInt(Number(e.kcal))} kcal
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}
