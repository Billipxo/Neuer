import { useEffect, useMemo, useState } from 'react'
import { Pencil, Star } from 'lucide-react'
import type { AmountUnit, Food } from '../../types'
import { nutrientsForFoodAmount } from '../../lib/nutrition'
import { UNIT_LABELS } from '../../lib/units'
import { fmt1 } from '../../lib/format'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { NumberInput } from '../ui/NumberInput'
import { Segmented } from '../ui/Segmented'
import { NutrientGrid } from './NutrientGrid'

/** Lebensmittel als Vorlage – kann ein gespeichertes Food oder ein (noch nicht gespeichertes) OFF-Produkt sein */
export type FoodLike = Omit<Food, 'id' | 'is_favorite' | 'last_used_at' | 'use_count'> & {
  id?: string
  is_favorite?: boolean
  last_used_at?: string | null
  use_count?: number
}

interface Props {
  food: FoodLike | null
  onClose: () => void
  onAdd: (amount: number, unit: AmountUnit) => void
  onToggleFavorite?: () => void
  onEdit?: () => void
  busy?: boolean
  confirmLabel?: string
}

export function availableUnits(f: Pick<Food, 'serving_g' | 'piece_g'>): AmountUnit[] {
  const units: AmountUnit[] = ['g']
  if (f.piece_g) units.push('piece')
  if (f.serving_g) units.push('serving')
  return units
}

export function FoodAmountSheet({ food, onClose, onAdd, onToggleFavorite, onEdit, busy, confirmLabel = 'Hinzufügen' }: Props) {
  const [unit, setUnit] = useState<AmountUnit>('g')
  const [amount, setAmount] = useState<number | null>(100)

  useEffect(() => {
    if (!food) return
    if (food.serving_g) {
      setUnit('serving')
      setAmount(1)
    } else if (food.piece_g) {
      setUnit('piece')
      setAmount(1)
    } else {
      setUnit('g')
      setAmount(100)
    }
  }, [food])

  const n = useMemo(
    () => (food && amount ? nutrientsForFoodAmount({ ...(food as Food) }, amount, unit) : null),
    [food, amount, unit],
  )
  if (!food) return null
  const units = availableUnits(food)

  return (
    <Sheet
      open={!!food}
      onClose={onClose}
      title={food.name}
      footer={
        <Button block size="lg" disabled={!amount || !n || busy} onClick={() => amount && onAdd(amount, unit)}>
          {busy ? 'Speichern …' : confirmLabel}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm text-muted">
            {food.brand ? `${food.brand} · ` : ''}
            {fmt1(food.kcal_100)} kcal pro 100 g
            {food.serving_g ? ` · Portion ${fmt1(food.serving_g)} g` : ''}
            {food.piece_g ? ` · Stück ${fmt1(food.piece_g)} g` : ''}
          </p>
          {onEdit && (
            <Button variant="ghost" size="sm" icon={<Pencil className="size-4" aria-hidden />} onClick={onEdit}>
              Bearbeiten
            </Button>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={!!food.is_favorite}
              aria-label={food.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
            >
              <Star className={`size-5 ${food.is_favorite ? 'fill-carbs text-carbs' : 'text-muted'}`} aria-hidden />
            </button>
          )}
        </div>
        {units.length > 1 && (
          <Segmented<AmountUnit>
            label="Einheit"
            value={unit}
            onChange={(u) => {
              setUnit(u)
              setAmount(u === 'g' ? 100 : 1)
            }}
            options={units.map((u) => ({ value: u, label: UNIT_LABELS[u].many }))}
          />
        )}
        <NumberInput label="Menge" suffix={UNIT_LABELS[unit].many} value={amount} min={0} onChange={setAmount} />
        {unit === 'g' && (
          <div className="flex flex-wrap gap-2" aria-label="Schnellauswahl Gramm">
            {[50, 100, 150, 200, 250].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setAmount(g)}
                className={`min-h-9 rounded-full px-3 text-sm ${amount === g ? 'bg-brand text-brand-ink' : 'bg-surface-2'}`}
              >
                {g} g
              </button>
            ))}
          </div>
        )}
        {n && <NutrientGrid n={n} />}
      </div>
    </Sheet>
  )
}
