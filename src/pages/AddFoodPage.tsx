import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, ScanBarcode, Search, UtensilsCrossed, WifiOff } from 'lucide-react'
import type { AmountUnit, Dish, Food, MealType } from '../types'
import { MEAL_TYPES } from '../types'
import { MEAL_LABELS } from '../lib/meals'
import { todayISO } from '../lib/dates'
import { amountToGrams, dishPerServing, nutrientsForFoodAmount, roundNutrients, scaleNutrients } from '../lib/nutrition'
import { detectVeggies } from '../lib/veggies'
import { getProductByBarcode, searchProducts, type OffProduct } from '../lib/openFoodFacts'
import {
  offToFood,
  useAddLogEntries,
  useDishes,
  useEnsureFood,
  useFoods,
  useSaveDish,
  useToggleFavoriteFood,
  useTouchFood,
} from '../hooks/data'
import { PageHeader } from '../components/layout/PageHeader'
import { Segmented, Chip } from '../components/ui/Segmented'
import { Button } from '../components/ui/Button'
import { EmptyState, Spinner } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { FoodRow } from '../components/add/FoodRow'
import { FoodAmountSheet, type FoodLike } from '../components/add/FoodAmountSheet'
import { CustomFoodSheet } from '../components/add/CustomFoodSheet'
import { BarcodeScannerSheet } from '../components/add/BarcodeScannerSheet'
import { DishAmountSheet } from '../components/add/DishAmountSheet'

type Tab = 'recent' | 'favorites' | 'custom' | 'dishes'
const TABS: { value: Tab; label: string }[] = [
  { value: 'recent', label: 'Zuletzt' },
  { value: 'favorites', label: 'Favoriten' },
  { value: 'custom', label: 'Eigene' },
  { value: 'dishes', label: 'Gerichte' },
]

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function AddFoodPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const date = params.get('date') ?? todayISO()
  const [meal, setMeal] = useState<MealType>((params.get('meal') as MealType) || 'breakfast')
  const [tab, setTab] = useState<Tab>('recent')
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query.trim(), 450)

  const { data: foods = [] } = useFoods()
  const { data: dishes = [] } = useDishes()
  const addLog = useAddLogEntries()
  const ensureFood = useEnsureFood()
  const touchFood = useTouchFood()
  const toggleFav = useToggleFavoriteFood()
  const saveDish = useSaveDish()

  const [selected, setSelected] = useState<FoodLike | null>(null)
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [editFood, setEditFood] = useState<Food | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanMiss, setScanMiss] = useState<string | null>(null)
  const [scanBusy, setScanBusy] = useState(false)

  const off = useQuery({
    queryKey: ['off-search', debounced],
    queryFn: ({ signal }) => searchProducts(debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 0,
  })

  const q = debounced.toLowerCase()
  const localFoodHits = useMemo(
    () => (q ? foods.filter((f) => `${f.name} ${f.brand ?? ''}`.toLowerCase().includes(q)).slice(0, 8) : []),
    [foods, q],
  )
  const localDishHits = useMemo(() => (q ? dishes.filter((d) => d.name.toLowerCase().includes(q)) : []), [dishes, q])

  const tabFoods = useMemo(() => {
    switch (tab) {
      case 'recent':
        return foods.filter((f) => f.last_used_at).slice(0, 25)
      case 'favorites':
        return foods.filter((f) => f.is_favorite)
      case 'custom':
        return foods.filter((f) => f.source === 'custom')
      default:
        return []
    }
  }, [tab, foods])

  const selectedStored = selected?.id ? foods.find((f) => f.id === selected.id) ?? null : null

  async function addFood(amount: number, unit: AmountUnit) {
    if (!selected) return
    const stored: Food = selected.id ? (selectedStored ?? (selected as Food)) : await ensureFood.mutateAsync(selected as OffProduct)
    const n = nutrientsForFoodAmount(stored, amount, unit)
    if (!n) return
    await addLog.mutateAsync([
      {
        date,
        meal,
        name: stored.brand ? `${stored.name} (${stored.brand})` : stored.name,
        amount,
        unit,
        grams: amountToGrams(amount, unit, stored),
        ...roundNutrients(n),
        food_id: stored.id,
        dish_id: null,
        recipe_id: null,
        veggies: detectVeggies(stored.name),
      },
    ])
    touchFood.mutate(stored)
    toast(`Zu ${MEAL_LABELS[meal]} hinzugefügt`, '✅')
    navigate(date === todayISO() ? '/' : `/?datum=${date}`)
  }

  async function addDish(servings: number) {
    if (!selectedDish) return
    const n = scaleNutrients(dishPerServing(selectedDish), servings)
    await addLog.mutateAsync([
      {
        date,
        meal,
        name: selectedDish.name,
        amount: servings,
        unit: 'serving',
        grams: null,
        ...roundNutrients(n),
        food_id: null,
        dish_id: selectedDish.id,
        recipe_id: null,
        veggies: detectVeggies(...selectedDish.ingredients.map((i) => i.name)),
      },
    ])
    saveDish.mutate({ ...selectedDish, last_used_at: new Date().toISOString() })
    toast(`Zu ${MEAL_LABELS[meal]} hinzugefügt`, '✅')
    navigate(date === todayISO() ? '/' : `/?datum=${date}`)
  }

  async function onBarcode(code: string) {
    setScanOpen(false)
    const known = foods.find((f) => f.barcode === code)
    if (known) {
      setSelected(known)
      return
    }
    setScanBusy(true)
    try {
      const p = await getProductByBarcode(code)
      if (p) setSelected({ ...offToFood(p) })
      else setScanMiss(code)
    } catch {
      toast('Keine Verbindung zu Open Food Facts')
      setScanMiss(code)
    } finally {
      setScanBusy(false)
    }
  }

  const searching = q.length >= 2

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-10 safe-top">
      <PageHeader title="Hinzufügen" back />
      <Segmented<MealType>
        label="Mahlzeit"
        value={meal}
        onChange={setMeal}
        options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m].replace('essen', '') }))}
      />

      <div className="sticky top-0 z-10 -mx-4 mt-3 bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="food-search" className="sr-only">
              Lebensmittel suchen
            </label>
            <input
              id="food-search"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Lebensmittel suchen …"
              className="min-h-12 w-full rounded-2xl bg-surface pl-11 pr-4 text-base ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            aria-label="Barcode scannen"
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink shadow-sm active:scale-95"
          >
            <ScanBarcode className="size-6" aria-hidden />
          </button>
        </div>
      </div>

      {scanBusy && <Spinner label="Produkt wird gesucht …" />}

      {!searching && (
        <>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Schnellauswahl">
            {TABS.map((t) => (
              <Chip key={t.value} active={tab === t.value} onClick={() => setTab(t.value)}>
                {t.label}
              </Chip>
            ))}
          </div>

          {tab === 'dishes' ? (
            <>
              <ul className="mt-3 space-y-1">
                {dishes.map((d) => (
                  <FoodRow
                    key={d.id}
                    title={d.name}
                    subtitle={`${d.ingredients.length} Zutaten`}
                    kcal={dishPerServing(d).kcal}
                    kcalLabel="kcal/Portion"
                    favorite={d.is_favorite}
                    onClick={() => setSelectedDish(d)}
                  />
                ))}
              </ul>
              {dishes.length === 0 && (
                <EmptyState
                  icon={<UtensilsCrossed className="size-8" />}
                  title="Noch keine eigenen Gerichte"
                  text="Speichere z. B. dein Lieblingsmüsli aus mehreren Zutaten und trage es mit einem Tippen ein."
                />
              )}
              <Link
                to="/gerichte/neu"
                className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface-2 font-semibold"
              >
                <Plus className="size-4" aria-hidden /> Gericht erstellen
              </Link>
            </>
          ) : (
            <>
              <ul className="mt-3 space-y-1">
                {tabFoods.map((f) => (
                  <FoodRow
                    key={f.id}
                    title={f.name}
                    subtitle={f.brand}
                    kcal={f.kcal_100}
                    favorite={f.is_favorite}
                    image={f.image_url}
                    onClick={() => setSelected(f)}
                  />
                ))}
              </ul>
              {tabFoods.length === 0 && (
                <EmptyState
                  icon={<Search className="size-8" />}
                  title={
                    tab === 'recent'
                      ? 'Noch nichts verwendet'
                      : tab === 'favorites'
                        ? 'Noch keine Favoriten'
                        : 'Noch keine eigenen Lebensmittel'
                  }
                  text={
                    tab === 'favorites'
                      ? 'Tippe beim Eintragen auf den Stern, um ein Lebensmittel zu merken.'
                      : 'Suche oben nach einem Lebensmittel oder scanne einen Barcode.'
                  }
                />
              )}
              <Button variant="secondary" block className="mt-2" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCustomOpen(true)}>
                Eigenes Lebensmittel anlegen
              </Button>
            </>
          )}
        </>
      )}

      {searching && (
        <div className="mt-2">
          {(localFoodHits.length > 0 || localDishHits.length > 0) && (
            <>
              <h2 className="px-1 pt-2 text-sm font-semibold text-muted">Meine Lebensmittel</h2>
              <ul className="mt-1 space-y-1">
                {localDishHits.map((d) => (
                  <FoodRow key={d.id} title={d.name} subtitle="Gericht" kcal={dishPerServing(d).kcal} kcalLabel="kcal/Portion" onClick={() => setSelectedDish(d)} />
                ))}
                {localFoodHits.map((f) => (
                  <FoodRow key={f.id} title={f.name} subtitle={f.brand} kcal={f.kcal_100} favorite={f.is_favorite} image={f.image_url} onClick={() => setSelected(f)} />
                ))}
              </ul>
            </>
          )}
          <h2 className="px-1 pt-4 text-sm font-semibold text-muted">Open Food Facts</h2>
          {off.isFetching && <Spinner label="Suche läuft …" />}
          {off.error && !off.isFetching && (
            <EmptyState
              icon={<WifiOff className="size-8" />}
              title="Suche gerade nicht möglich"
              text="Open Food Facts ist nicht erreichbar. Du kannst ein eigenes Lebensmittel anlegen."
            />
          )}
          {off.data && !off.isFetching && (
            <ul className="mt-1 space-y-1">
              {off.data.map((p) => (
                <FoodRow
                  key={p.barcode ?? `${p.name}-${p.brand}`}
                  title={p.name}
                  subtitle={p.brand}
                  kcal={p.kcal_100}
                  image={p.image_url}
                  onClick={() => setSelected(foods.find((f) => p.barcode && f.barcode === p.barcode) ?? offToFood(p))}
                />
              ))}
            </ul>
          )}
          {off.data?.length === 0 && !off.isFetching && (
            <EmptyState title="Keine Treffer" text="Probiere einen anderen Begriff oder lege das Lebensmittel selbst an." />
          )}
          <Button variant="secondary" block className="mt-3" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCustomOpen(true)}>
            „{query.trim()}“ selbst anlegen
          </Button>
        </div>
      )}

      <FoodAmountSheet
        food={selectedStored ?? selected}
        onClose={() => setSelected(null)}
        onAdd={addFood}
        busy={addLog.isPending || ensureFood.isPending}
        confirmLabel={`Zu ${MEAL_LABELS[meal]} hinzufügen`}
        onToggleFavorite={
          selected
            ? async () => {
                const stored = selectedStored ?? (await ensureFood.mutateAsync(selected as OffProduct))
                const updated = await toggleFav.mutateAsync(stored)
                setSelected(updated)
              }
            : undefined
        }
        onEdit={
          selectedStored?.source === 'custom'
            ? () => {
                setEditFood(selectedStored)
                setSelected(null)
              }
            : undefined
        }
      />
      <DishAmountSheet
        dish={selectedDish}
        onClose={() => setSelectedDish(null)}
        onAdd={addDish}
        busy={addLog.isPending}
        confirmLabel={`Zu ${MEAL_LABELS[meal]} hinzufügen`}
      />
      <CustomFoodSheet
        open={customOpen || !!editFood || !!scanMiss}
        food={editFood}
        initialBarcode={scanMiss}
        initialName={editFood ? undefined : query.trim()}
        onClose={() => {
          setCustomOpen(false)
          setEditFood(null)
          setScanMiss(null)
        }}
        onSaved={(f) => setSelected(f)}
      />
      <BarcodeScannerSheet open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onBarcode} />
      {scanMiss && (
        <p className="sr-only" role="status">
          Barcode {scanMiss} nicht gefunden. Du kannst das Produkt selbst anlegen.
        </p>
      )}
    </div>
  )
}
