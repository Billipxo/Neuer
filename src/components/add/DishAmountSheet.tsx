import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import type { Dish } from '../../types'
import { dishPerServing, scaleNutrients } from '../../lib/nutrition'
import { fmt1 } from '../../lib/format'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { NumberInput } from '../ui/NumberInput'
import { NutrientGrid } from './NutrientGrid'

export function DishAmountSheet({
  dish,
  onClose,
  onAdd,
  busy,
  confirmLabel = 'Hinzufügen',
}: {
  dish: Dish | null
  onClose: () => void
  onAdd: (servings: number) => void
  busy?: boolean
  confirmLabel?: string
}) {
  const [servings, setServings] = useState<number | null>(1)
  useEffect(() => {
    if (dish) setServings(1)
  }, [dish])
  if (!dish) return null
  const n = scaleNutrients(dishPerServing(dish), servings ?? 0)
  return (
    <Sheet
      open={!!dish}
      onClose={onClose}
      title={dish.name}
      footer={
        <Button block size="lg" disabled={!servings || busy} onClick={() => servings && onAdd(servings)}>
          {confirmLabel}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <span>
            {dish.ingredients.length} Zutaten · ergibt {fmt1(dish.servings)} Portion{dish.servings === 1 ? '' : 'en'}
          </span>
          <Link to={`/gerichte/${dish.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 font-semibold text-ink hover:bg-surface-2">
            <Pencil className="size-4" aria-hidden /> Bearbeiten
          </Link>
        </div>
        <NumberInput label="Portionen" suffix="Port." value={servings} min={0} onChange={setServings} />
        <div className="flex gap-2">
          {[0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setServings(s)}
              className={`min-h-9 rounded-full px-3 text-sm ${servings === s ? 'bg-brand text-brand-ink' : 'bg-surface-2'}`}
            >
              {fmt1(s)}
            </button>
          ))}
        </div>
        <NutrientGrid n={n} />
      </div>
    </Sheet>
  )
}
