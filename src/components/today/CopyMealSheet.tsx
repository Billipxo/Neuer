import { useEffect, useState } from 'react'
import type { LogEntry, MealType } from '../../types'
import { MEAL_TYPES } from '../../types'
import { MEAL_LABELS } from '../../lib/meals'
import { copyEntries, totalsOf } from '../../lib/log'
import { relativeDayLabel, shiftISO, todayISO } from '../../lib/dates'
import { fmtInt } from '../../lib/format'
import { useAddLogEntries } from '../../hooks/data'
import { Sheet } from '../ui/Sheet'
import { Segmented } from '../ui/Segmented'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

/** Alle Einträge einer Mahlzeit auf einen anderen Tag bzw. eine andere Mahlzeit kopieren */
export function CopyMealSheet({ source, onClose }: { source: { meal: MealType; date: string; entries: LogEntry[] } | null; onClose: () => void }) {
  const today = todayISO()
  const [date, setDate] = useState(today)
  const [meal, setMeal] = useState<MealType>('breakfast')
  const add = useAddLogEntries()
  const toast = useToast()

  useEffect(() => {
    if (!source) return
    setMeal(source.meal)
    setDate(source.date === today ? shiftISO(today, 1) : today)
  }, [source, today])

  if (!source) return null
  return (
    <Sheet
      open={!!source}
      onClose={onClose}
      title={`${MEAL_LABELS[source.meal]} kopieren`}
      footer={
        <Button
          block
          size="lg"
          disabled={!date || add.isPending}
          onClick={async () => {
            await add.mutateAsync(copyEntries(source.entries, date, meal))
            toast(`${source.entries.length} Einträge kopiert (${relativeDayLabel(date, today)})`, '📋')
            onClose()
          }}
        >
          Kopieren
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {source.entries.length} Einträge · {fmtInt(totalsOf(source.entries).kcal)} kcal
        </p>
        <Segmented
          label="Zieltag"
          value={[today, shiftISO(today, 1)].includes(date) ? date : 'custom'}
          onChange={(v) => v !== 'custom' && setDate(v)}
          options={[
            { value: today, label: 'Heute' },
            { value: shiftISO(today, 1), label: 'Morgen' },
            { value: 'custom', label: 'Anderer Tag' },
          ]}
        />
        <Field label="Datum" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <p className="mb-1.5 text-sm font-medium">Mahlzeit</p>
          <Segmented<MealType>
            label="Ziel-Mahlzeit"
            value={meal}
            onChange={setMeal}
            options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m].replace('essen', '') }))}
          />
        </div>
      </div>
    </Sheet>
  )
}
