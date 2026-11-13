import { useMemo } from 'react'
import { getISOWeek } from 'date-fns'
import { MEAL_TYPES } from '../../types'
import { useAddPlanItems } from '../../hooks/plan'
import { useHousehold } from '../../app/household'
import { fmtDate, fmtWeekday, fromISODate, shiftISO, todayISO } from '../../lib/dates'
import { MEAL_LABELS } from '../../lib/meals'
import { planItemsFromShared, targetWeek, type SharedPlan } from '../../lib/planShare'
import { getRecipe } from '../../lib/recipes'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

/** Einen per Link empfangenen Wochenplan ansehen und in den eigenen Plan übernehmen */
export function SharedPlanSheet({ plan, onClose, onImported }: { plan: SharedPlan | null; onClose: () => void; onImported: (weekStart: string) => void }) {
  const add = useAddPlanItems()
  const toast = useToast()
  const { household } = useHousehold()
  const weekStart = plan ? targetWeek(plan, todayISO()) : null
  const prepared = useMemo(() => (plan && weekStart ? planItemsFromShared(plan, weekStart, getRecipe) : null), [plan, weekStart])
  if (!plan || !weekStart || !prepared) return null

  const { items, skipped } = prepared
  const days = [...new Set(items.map((i) => i.date))].sort()

  return (
    <Sheet
      open
      onClose={onClose}
      title="Geteilter Wochenplan"
      tall
      footer={
        <Button
          block
          size="lg"
          disabled={!items.length || add.isPending}
          onClick={async () => {
            await add.mutateAsync(items)
            toast(`${items.length} Mahlzeiten übernommen`, '🍽️')
            onImported(weekStart)
          }}
        >
          {add.isPending ? 'Wird übernommen …' : household ? 'In den gemeinsamen Plan übernehmen' : 'In meinen Plan übernehmen'}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm">
          {items.length === 1 ? 'Eine Mahlzeit' : `${items.length} Mahlzeiten`} an {days.length === 1 ? 'einem Tag' : `${days.length} Tagen`}. Eingefügt wird
          in <strong>KW {getISOWeek(fromISODate(weekStart))}</strong> ({fmtDate(weekStart)} bis {fmtDate(shiftISO(weekStart, 6))}) – was dort schon
          geplant ist, bleibt erhalten.
        </p>
        {skipped > 0 && (
          <p role="status" className="rounded-2xl bg-surface-2 p-3 text-sm">
            {skipped === 1 ? 'Ein Rezept kennt' : `${skipped} Rezepte kennt`} diese App-Version nicht – {skipped === 1 ? 'es wird' : 'sie werden'} ausgelassen.
          </p>
        )}
        {items.length === 0 ? (
          <p className="text-sm text-muted">Dieser Plan enthält keine Einträge.</p>
        ) : (
          <ul aria-label="Inhalt des geteilten Plans" className="divide-y divide-line/60 rounded-2xl bg-surface-2/60 px-3 text-sm">
            {days.map((day) => (
              <li key={day} className="py-2">
                <p className="font-medium">
                  {fmtWeekday(day)}, {fmtDate(day)}
                </p>
                <ul className="mt-0.5 text-muted">
                  {items
                    .filter((i) => i.date === day)
                    .sort((a, b) => MEAL_TYPES.indexOf(a.meal) - MEAL_TYPES.indexOf(b.meal))
                    .map((i, n) => (
                      <li key={n}>
                        {MEAL_LABELS[i.meal]}: <span className="text-ink">{i.title}</span>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
