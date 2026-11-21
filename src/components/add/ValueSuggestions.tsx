import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import type { Food } from '../../types'
import { suggestFoods } from '../../lib/basicFoods'
import { searchProducts } from '../../lib/openFoodFacts'
import { fmtInt } from '../../lib/format'

/** Werte, die sich in ein eigenes Lebensmittel übernehmen lassen (pro 100 g, dazu bekannte Mengen) */
export type SuggestedValues = Pick<Food, 'kcal_100' | 'protein_100' | 'carbs_100' | 'fat_100'> &
  Partial<Pick<Food, 'serving_g' | 'piece_g' | 'tbsp_g' | 'tsp_g'>>

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/**
 * Passende Nährwerte zum eingetippten Namen: sofort aus Grundnahrungsmitteln und Alltäglichem, dazu Produkte aus
 * Open Food Facts. Ein Tipp übernimmt die Werte – danach lässt sich alles anpassen.
 */
export function ValueSuggestions({ name, onPick }: { name: string; onPick: (values: SuggestedValues, from: string) => void }) {
  const q = name.trim()
  const debounced = useDebounced(q, 500)
  const quick = suggestFoods(q, 4)
  const off = useQuery({
    queryKey: ['off-search', debounced],
    queryFn: ({ signal }) => searchProducts(debounced, signal),
    enabled: debounced.length >= 3,
    staleTime: 1000 * 60 * 10,
    retry: 1,
    retryDelay: 1500,
  })
  const products = (off.data ?? []).slice(0, 3)
  if (q.length < 2) return null

  return (
    <section aria-label="Werte vorschlagen" className="rounded-2xl bg-surface-2/60 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="size-4 text-brand" aria-hidden /> Werte vorschlagen
      </p>
      <p className="mt-0.5 text-xs text-muted">Tippe auf einen Treffer – die Nährwerte werden übernommen und lassen sich danach anpassen.</p>
      <ul className="mt-2 space-y-1">
        {quick.map((h) => (
          <li key={h.key}>
            <button
              type="button"
              onClick={() =>
                onPick(
                  {
                    kcal_100: h.food.kcal_100,
                    protein_100: h.food.protein_100,
                    carbs_100: h.food.carbs_100,
                    fat_100: h.food.fat_100,
                    serving_g: h.food.serving_g,
                    piece_g: h.food.piece_g,
                    tbsp_g: h.food.tbsp_g,
                    tsp_g: h.food.tsp_g,
                  },
                  h.name,
                )
              }
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-left text-sm hover:bg-surface"
            >
              <span className="min-w-0 truncate">{h.name}</span>
              <span className="shrink-0 text-xs text-muted tabular">{fmtInt(h.food.kcal_100)} kcal/100 g · Richtwert</span>
            </button>
          </li>
        ))}
        {products.map((p) => (
          <li key={p.barcode ?? `${p.name}-${p.brand}`}>
            <button
              type="button"
              onClick={() => onPick(p, p.brand ? `${p.name} (${p.brand})` : p.name)}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-left text-sm hover:bg-surface"
            >
              <span className="min-w-0 truncate">
                {p.name}
                {p.brand && <span className="text-muted"> · {p.brand}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted tabular">{fmtInt(p.kcal_100)} kcal/100 g</span>
            </button>
          </li>
        ))}
      </ul>
      {off.isFetching && <p className="mt-1 px-2 text-xs text-muted">Suche bei Open Food Facts …</p>}
      {!off.isFetching && quick.length === 0 && products.length === 0 && debounced === q && (
        <p className="mt-1 px-2 text-xs text-muted">Nichts Passendes gefunden – trag die Werte von der Packung ein.</p>
      )}
    </section>
  )
}
