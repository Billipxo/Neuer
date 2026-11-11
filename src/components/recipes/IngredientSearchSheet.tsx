import { useEffect, useMemo, useState } from 'react'
import { PlusCircle, ScanSearch, Search } from 'lucide-react'
import type { RecipeIngredient } from '../../types'
import { INGREDIENT_LIST } from '../../data/ingredients'
import { ingredientFromTable, searchIngredients, unitOptions } from '../../lib/variants'
import { unitGrams } from '../../lib/recipeNutrition'
import { fmtInt } from '../../lib/format'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { FoodRow } from '../add/FoodRow'

/** Zutat aus der Nährwerttabelle des Kochbuchs wählen – oder eine eigene anlegen */
export function IngredientSearchSheet({
  open,
  onClose,
  title = 'Zutat hinzufügen',
  onPick,
  onCustom,
  onFoods,
}: {
  open: boolean
  onClose: () => void
  title?: string
  onPick: (ing: RecipeIngredient) => void
  /** Eigene Zutat mit Nährwerten anlegen */
  onCustom: () => void
  /** In den eigenen Lebensmitteln und bei Open Food Facts suchen */
  onFoods: () => void
}) {
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (open) setQuery('')
  }, [open])
  const results = useMemo(() => searchIngredients(query), [query])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      tall
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={<PlusCircle className="size-4" aria-hidden />} onClick={onCustom}>
            Eigene Zutat
          </Button>
          <Button variant="secondary" icon={<ScanSearch className="size-4" aria-hidden />} onClick={onFoods}>
            Produkt suchen
          </Button>
        </div>
      }
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="recipe-ingredient-search" className="sr-only">
          Zutat suchen
        </label>
        <input
          id="recipe-ingredient-search"
          data-autofocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zutat suchen, z. B. Kochsahne"
          className="min-h-12 w-full rounded-2xl bg-surface-2 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1" aria-label="Treffer">
          {results.map((i) => {
            const unit = unitOptions({ name: i.name })[0]
            const g = unit === 'g' ? null : unitGrams(i, unit)
            return (
              <FoodRow
                key={i.name}
                title={i.name}
                subtitle={g ? `1 ${unit} ≈ ${fmtInt(g)} g` : i.base !== i.name ? i.base : null}
                kcal={i.kcal}
                onClick={() => onPick(ingredientFromTable(i))}
              />
            )
          })}
        </ul>
      )}
      {query.trim() && results.length === 0 && (
        <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          „{query.trim()}“ steht nicht in der Nährwerttabelle. Lege die Zutat mit den Werten von der Packung an oder suche das Produkt bei
          Open Food Facts.
        </p>
      )}
      {!query.trim() && (
        <p className="mt-4 text-sm text-muted">
          Die Nährwerttabelle des Kochbuchs kennt {INGREDIENT_LIST.length} Zutaten. Alles andere kannst du als eigene Zutat mit den
          Werten von der Packung anlegen.
        </p>
      )}
    </Sheet>
  )
}
