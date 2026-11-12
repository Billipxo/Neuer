import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { LogEntry, MealType } from '../../types'
import { MEAL_TYPES } from '../../types'
import { MEAL_LABELS } from '../../lib/meals'
import { rescaleEntry } from '../../lib/log'
import { fmt1, fmtInt } from '../../lib/format'
import { UNIT_LABELS } from '../../lib/units'
import { useDeleteLogEntry, useUpdateLogEntry } from '../../hooks/data'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { NumberInput } from '../ui/NumberInput'
import { Segmented } from '../ui/Segmented'
import { useToast } from '../ui/Toast'

/** Eintrag bearbeiten (Menge, Mahlzeit) oder löschen */
export function EntrySheet({ entry, onClose }: { entry: LogEntry | null; onClose: () => void }) {
  const [form, setForm] = useState<{ id: string; amount: number | null; meal: MealType } | null>(null)
  const update = useUpdateLogEntry()
  const del = useDeleteLogEntry()
  const toast = useToast()

  // Formular sofort mit dem Eintrag befüllen – ohne die Verzögerung eines Effekts, damit das Feld nie kurz leer ist
  if (entry && form?.id !== entry.id) setForm({ id: entry.id, amount: Number(entry.amount), meal: entry.meal })

  if (!entry || !form || form.id !== entry.id) return null
  const { amount, meal } = form
  const setAmount = (v: number | null) => setForm((f) => (f ? { ...f, amount: v } : f))
  const setMeal = (m: MealType) => setForm((f) => (f ? { ...f, meal: m } : f))
  const preview = amount && amount > 0 ? rescaleEntry({ ...entry, amount: Number(entry.amount) }, amount) : null

  return (
    <Sheet
      open={!!entry}
      onClose={onClose}
      title={entry.name}
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={async () => {
              await del.mutateAsync(entry.id)
              toast('Eintrag gelöscht')
              onClose()
            }}
          >
            Löschen
          </Button>
          <Button
            className="flex-1"
            disabled={!preview || update.isPending}
            onClick={async () => {
              if (!preview) return
              await update.mutateAsync({ id: entry.id, patch: { ...preview, meal } })
              toast('Gespeichert')
              onClose()
            }}
          >
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <NumberInput
          label="Menge"
          suffix={UNIT_LABELS[entry.unit].many}
          value={amount}
          min={0}
          onChange={setAmount}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium">Mahlzeit</p>
          <Segmented<MealType>
            label="Mahlzeit"
            value={meal}
            onChange={setMeal}
            options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m].replace('essen', '') }))}
          />
        </div>
        {preview && (
          <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-2 p-3 text-center text-sm">
            <div>
              <dt className="text-xs text-muted">kcal</dt>
              <dd className="font-semibold tabular">{fmtInt(preview.kcal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Eiweiß</dt>
              <dd className="font-semibold tabular">{fmt1(preview.protein)} g</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Kohlenh.</dt>
              <dd className="font-semibold tabular">{fmt1(preview.carbs)} g</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Fett</dt>
              <dd className="font-semibold tabular">{fmt1(preview.fat)} g</dd>
            </div>
          </dl>
        )}
      </div>
    </Sheet>
  )
}
