import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import type { CookbookEntry } from '../../lib/cookbookIndex'
import { scaleNutrients } from '../../lib/nutrition'
import { fmt1, fmtInt } from '../../lib/format'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { NumberInput } from '../ui/NumberInput'
import { NutrientGrid } from './NutrientGrid'

/** Rezept aus dem Kochbuch (oder eigenes Rezept) in Portionen eintragen */
export function RecipeServingsSheet({
  recipe,
  onClose,
  onConfirm,
  busy,
  confirmLabel = 'Hinzufügen',
  initialServings,
}: {
  recipe: CookbookEntry | null
  onClose: () => void
  onConfirm: (servings: number) => void
  busy?: boolean
  confirmLabel?: string
  initialServings?: number
}) {
  const [servings, setServings] = useState<number | null>(1)
  useEffect(() => {
    if (recipe) setServings(initialServings ?? 1)
  }, [recipe, initialServings])
  if (!recipe) return null
  const n = scaleNutrients(recipe.nutrition, servings ?? 0)
  return (
    <Sheet
      open={!!recipe}
      onClose={onClose}
      title={recipe.title}
      footer={
        <Button block size="lg" disabled={!servings || busy} onClick={() => servings && onConfirm(servings)}>
          {confirmLabel}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <span>
            {recipe.own ? 'Dein Rezept' : 'Aus dem Kochbuch'} · {fmtInt(recipe.nutrition.kcal)} kcal pro Portion
          </span>
          <Link to={`/rezepte/${recipe.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 font-semibold text-ink hover:bg-surface-2">
            <BookOpen className="size-4" aria-hidden /> Rezept
          </Link>
        </div>
        <NumberInput label="Portionen" suffix="Port." value={servings} min={0} onChange={setServings} />
        <div className="flex gap-2" role="group" aria-label="Schnellauswahl Portionen">
          {[0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setServings(s)}
              aria-pressed={servings === s}
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
