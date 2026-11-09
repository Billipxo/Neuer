import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { LogEntry, MealType } from '../../types'
import { MEAL_LABELS } from '../../lib/meals'
import { fmtInt } from '../../lib/format'
import { totalsOf } from '../../lib/log'
import { fmtAmount } from '../../lib/units'
import { Card } from '../ui/Card'

const MEAL_EMOJI: Record<MealType, string> = { breakfast: '🥣', lunch: '🥗', dinner: '🍲', snack: '🍎' }

export function MealSection({
  meal,
  date,
  entries,
  onEdit,
}: {
  meal: MealType
  date: string
  entries: LogEntry[]
  onEdit: (e: LogEntry) => void
}) {
  const total = totalsOf(entries)
  return (
    <Card className="p-0">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <span aria-hidden className="text-2xl">
          {MEAL_EMOJI[meal]}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{MEAL_LABELS[meal]}</h3>
          <p className="text-xs text-muted tabular">{entries.length ? `${fmtInt(total.kcal)} kcal` : 'Noch nichts eingetragen'}</p>
        </div>
        <Link
          to={`/hinzufuegen?meal=${meal}&date=${date}`}
          aria-label={`${MEAL_LABELS[meal]}: Lebensmittel hinzufügen`}
          className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand transition active:scale-95"
        >
          <Plus className="size-5" aria-hidden />
        </Link>
      </div>
      {entries.length > 0 && (
        <ul className="border-t border-line/70">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onEdit(e)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-surface-2/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{e.name}</p>
                  <p className="text-xs text-muted">{fmtAmount(Number(e.amount), e.unit)}</p>
                </div>
                <span className="text-sm font-medium tabular">{fmtInt(Number(e.kcal))} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
