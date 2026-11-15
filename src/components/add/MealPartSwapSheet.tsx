import { Check } from 'lucide-react'
import type { MealPart } from '../../lib/mealText'
import { fmtInt } from '../../lib/format'
import { Sheet } from '../ui/Sheet'

interface Props {
  /** Ursprünglich erkannter Eintrag mit seinen anderen Treffern */
  original: MealPart | null
  /** Gewählter Treffer: -1 = der ursprüngliche, sonst Index in `original.alternatives` */
  selected: number
  onSelect: (choice: number) => void
  onClose: () => void
}

/** „Käse“ war doch Gouda: anderen Treffer mit derselben Menge wählen */
export function MealPartSwapSheet({ original, selected, onSelect, onClose }: Props) {
  if (!original) return null
  const options = [original, ...original.alternatives]
  return (
    <Sheet open={!!original} onClose={onClose} title={`Andere Treffer für „${original.query}“`}>
      <ul className="space-y-1" aria-label="Treffer">
        {options.map((p, i) => {
          const choice = i - 1
          const active = choice === selected
          return (
            <li key={`${i}-${p.name}`}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(choice)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition ${
                  active ? 'bg-brand/10 ring-1 ring-brand/40' : 'hover:bg-surface-2 active:bg-line/60'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.amountLabel}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtInt(p.kcal)} kcal</span>
                <Check className={`size-5 shrink-0 ${active ? 'text-brand' : 'invisible'}`} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 px-1 text-xs text-muted">
        Beim Eintragen merkt sich die App deine Wahl für „{original.query}“ auf diesem Gerät.
      </p>
    </Sheet>
  )
}
