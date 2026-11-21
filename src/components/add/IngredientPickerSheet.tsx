import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import type { DishIngredient, Food } from '../../types'
import { searchProducts } from '../../lib/openFoodFacts'
import { searchQuickFoods, type QuickFoodHit } from '../../lib/basicFoods'
import { useFoods } from '../../hooks/data'
import { Sheet } from '../ui/Sheet'
import { Spinner } from '../ui/EmptyState'
import { FoodRow } from './FoodRow'

type Candidate = Pick<Food, 'name' | 'brand' | 'kcal_100' | 'protein_100' | 'carbs_100' | 'fat_100' | 'image_url'> & {
  id?: string
}

/** Zutat für ein eigenes Gericht suchen (eigene Lebensmittel, auf Wunsch die eingebauten Richtwerte, Open Food Facts) */
export function IngredientPickerSheet({
  open,
  onClose,
  onPick,
  basics = false,
}: {
  open: boolean
  onClose: () => void
  onPick: (i: DishIngredient) => void
  /** Auch Grundnahrungsmittel und Alltägliches anbieten – sofort und ohne Internet, mit üblicher Menge */
  basics?: boolean
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const { data: foods = [] } = useFoods()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 450)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const off = useQuery({
    queryKey: ['off-search', debounced],
    queryFn: ({ signal }) => searchProducts(debounced, signal),
    enabled: open && debounced.length >= 2,
    staleTime: 1000 * 60 * 10,
    retry: 1,
    retryDelay: 1500,
  })

  const local = useMemo(() => {
    const q = debounced.toLowerCase()
    return (q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods.slice(0, 15)).slice(0, 15)
  }, [foods, debounced])

  const quick = useMemo(() => (basics && query.trim().length >= 2 ? searchQuickFoods(query.trim(), 8) : []), [basics, query])

  function pickQuick(h: QuickFoodHit) {
    onPick({
      food_id: null,
      name: h.name,
      grams: h.typicalGrams ?? 100,
      kcal_100: h.food.kcal_100,
      protein_100: h.food.protein_100,
      carbs_100: h.food.carbs_100,
      fat_100: h.food.fat_100,
    })
    onClose()
  }

  function pick(c: Candidate) {
    onPick({
      food_id: c.id ?? null,
      name: c.brand ? `${c.name} (${c.brand})` : c.name,
      grams: 100,
      kcal_100: c.kcal_100,
      protein_100: c.protein_100,
      carbs_100: c.carbs_100,
      fat_100: c.fat_100,
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Zutat hinzufügen" tall>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="ingredient-search" className="sr-only">
          Zutat suchen
        </label>
        <input
          id="ingredient-search"
          data-autofocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zutat suchen …"
          className="min-h-12 w-full rounded-2xl bg-surface-2 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      {local.length > 0 && (
        <>
          <h3 className="px-1 pt-4 text-sm font-semibold text-muted">Meine Lebensmittel</h3>
          <ul className="mt-1 space-y-1">
            {local.map((f) => (
              <FoodRow key={f.id} title={f.name} subtitle={f.brand} kcal={f.kcal_100} image={f.image_url} onClick={() => pick(f)} />
            ))}
          </ul>
        </>
      )}
      {quick.length > 0 && (
        <>
          <h3 className="px-1 pt-4 text-sm font-semibold text-muted">Grundnahrungsmittel & Alltägliches</h3>
          <ul className="mt-1 space-y-1" aria-label="Grundnahrungsmittel & Alltägliches">
            {quick.map((h) => (
              <FoodRow key={h.key} title={h.name} subtitle={h.subtitle} kcal={h.kcal} kcalLabel={h.kcalLabel} onClick={() => pickQuick(h)} />
            ))}
          </ul>
        </>
      )}
      {debounced.length >= 2 && (
        <>
          <h3 className="px-1 pt-4 text-sm font-semibold text-muted">Open Food Facts</h3>
          {off.isFetching && <Spinner />}
          {off.error && <p className="p-2 text-sm text-muted">Open Food Facts antwortet gerade nicht – deine eigenen Lebensmittel oben funktionieren weiter.</p>}
          <ul className="mt-1 space-y-1">
            {off.data?.map((p) => (
              <FoodRow key={p.barcode ?? p.name} title={p.name} subtitle={p.brand} kcal={p.kcal_100} image={p.image_url} onClick={() => pick(p)} />
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}
