import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Plus, ScanBarcode, Search, UtensilsCrossed, WifiOff, Zap } from 'lucide-react'
import { fmtInt } from '../lib/format'
import type { AmountUnit, Dish, Food, MealType } from '../types'
import { MEAL_TYPES } from '../types'
import { MEAL_LABELS, mealForHour } from '../lib/meals'
import { quickEntry, type QuickEntryInput } from '../lib/log'
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
  useSaveFood,
  useToggleFavoriteFood,
  useTouchFood,
  type NewFood,
} from '../hooks/data'
import { browseFoods, findStoredBasic, suggestFoods } from '../lib/basicFoods'
import { parseMealText, rememberKey, type MealPart } from '../lib/mealText'
import { loadMealMemory, rememberChoices, saveMealMemory } from '../lib/mealMemory'
import { FOOD_GROUPS, type FoodGroupId } from '../data/everydayFoods'
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
import { QuickEntrySheet } from '../components/add/QuickEntrySheet'
import { MealTextCard, NO_EDITS, effectiveParts, mealList, type MealTextEdits } from '../components/add/MealTextCard'
import { MealPartSwapSheet } from '../components/add/MealPartSwapSheet'

/** Merkt sich, dass der Tipp „Mehreres auf einmal“ verstanden wurde */
const MULTI_HINT_KEY = 'teller-tipp-mehreres'

type Tab = 'recent' | 'browse' | 'favorites' | 'custom' | 'dishes'
const TABS: { value: Tab; label: string }[] = [
  { value: 'recent', label: 'Zuletzt' },
  { value: 'browse', label: 'Stöbern' },
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
  // Ohne Vorgabe (z. B. über eine App-Verknüpfung) passt die Mahlzeit zur Uhrzeit
  const [meal, setMeal] = useState<MealType>(() => {
    const wanted = params.get('meal') as MealType | null
    return wanted && MEAL_TYPES.includes(wanted) ? wanted : mealForHour(new Date().getHours())
  })
  const [tab, setTab] = useState<Tab>('recent')
  const [browseGroup, setBrowseGroup] = useState<FoodGroupId>('baeckerei')
  const browseHits = useMemo(() => (tab === 'browse' ? browseFoods(browseGroup) : []), [tab, browseGroup])
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query.trim(), 450)
  // Mehreres auf einmal („2 Brötchen, 1 Cappuccino und eine Banane“) – braucht keine Produktsuche im Netz
  const debouncedIsList = useMemo(() => (parseMealText(debounced)?.parts.length ?? 0) > 1, [debounced])

  const { data: foods = [] } = useFoods()
  const { data: dishes = [] } = useDishes()
  const addLog = useAddLogEntries()
  const ensureFood = useEnsureFood()
  const touchFood = useTouchFood()
  const toggleFav = useToggleFavoriteFood()
  const saveDish = useSaveDish()
  const saveFood = useSaveFood()

  const [selected, setSelected] = useState<FoodLike | null>(null)
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [editFood, setEditFood] = useState<Food | null>(null)
  // „?scan=1“ öffnet direkt den Barcode-Scanner, „?schnell=1“ den Schnell-Eintrag (App-Verknüpfungen)
  const [scanOpen, setScanOpen] = useState(() => params.get('scan') === '1')
  const [quickOpen, setQuickOpen] = useState(() => params.get('schnell') === '1')
  const [scanMiss, setScanMiss] = useState<string | null>(null)
  const [scanBusy, setScanBusy] = useState(false)
  /** In dieser Sitzung hinzugefügte Einträge – man kann mehrere nacheinander erfassen */
  const [added, setAdded] = useState<{ name: string; kcal: number }[]>([])
  // Erkannte Einträge aus dem Suchtext, mit Änderungen (entfernt, Menge geändert) – gelten nur für diesen Text
  // Gemerkte Wahl („Käse“ → Gouda) aus früheren Einträgen auf diesem Gerät
  const [memory, setMemory] = useState(loadMealMemory)
  const mealParse = useMemo(() => parseMealText(query, foods, dishes, memory), [query, foods, dishes, memory])
  const [editsState, setEdits] = useState<MealTextEdits>(NO_EDITS(''))
  const mealEdits: MealTextEdits = editsState.text === query ? editsState : NO_EDITS(query)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [swapIndex, setSwapIndex] = useState<number | null>(null)
  const swapOriginal = swapIndex !== null ? (mealParse?.parts[swapIndex] ?? null) : null
  const editingPart =
    editIndex !== null && mealParse ? (effectiveParts(mealParse, mealEdits).find((r) => r.index === editIndex)?.part ?? null) : null
  const [bulkBusy, setBulkBusy] = useState(false)
  const [multiHint, setMultiHint] = useState(() => {
    try {
      return localStorage.getItem(MULTI_HINT_KEY) !== '1'
    } catch {
      return true
    }
  })
  const isList = (mealParse?.parts.length ?? 0) > 1
  const done = () => navigate(date === todayISO() ? '/' : `/?datum=${date}`)

  const off = useQuery({
    queryKey: ['off-search', debounced],
    queryFn: ({ signal }) => searchProducts(debounced, signal),
    enabled: debounced.length >= 2 && !debouncedIsList,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 0,
  })

  // Eigene Lebensmittel und Grundnahrungsmittel reagieren sofort, nur Open Food Facts wartet auf die Eingabepause
  const q = query.trim().toLowerCase()
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
  // Grundnahrungsmittel und Alltägliches (Brötchen, Döner, Cappuccino …) – sofort und ohne Internet.
  // Passt der ganze Begriff nicht („Döner vom Imbiss“), helfen die einzelnen Wörter.
  const quickHits = useMemo(
    () => suggestFoods(q, 10).filter((h) => !localFoodHits.some((f) => f.name.trim().toLowerCase() === h.name.toLowerCase())),
    [q, localFoodHits],
  )

  /** Noch nicht gespeicherte Auswahl (Open Food Facts oder Grundnahrungsmittel) in die eigene Bibliothek übernehmen */
  async function persist(f: FoodLike): Promise<Food> {
    if (f.source === 'custom') {
      const row: NewFood = { ...f, is_favorite: f.is_favorite ?? false, last_used_at: f.last_used_at ?? null, use_count: f.use_count ?? 0 }
      return saveFood.mutateAsync(row)
    }
    return ensureFood.mutateAsync(f as OffProduct)
  }

  async function addFood(amount: number, unit: AmountUnit) {
    if (!selected) return
    const stored: Food = selected.id ? (selectedStored ?? (selected as Food)) : await persist(selected)
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
    setSelected(null)
    setAdded((a) => [...a, { name: stored.name, kcal: n.kcal }])
  }

  /** Alles Erkannte auf einmal eintragen; Vorlagen landen dabei in der eigenen Bibliothek (wie beim einzelnen Eintragen) */
  async function addParts(parts: MealPart[]) {
    setBulkBusy(true)
    try {
      const saved = new Map<string, Food>()
      const rows: Parameters<typeof addLog.mutateAsync>[0] = []
      const used: Food[] = []
      const usedDishes: Dish[] = []
      for (const p of parts) {
        // Eigenes Gericht: in Portionen, wie beim Eintragen über „Gerichte“
        if (p.dish) {
          const dish = p.dish
          const servings = p.unit === 'serving' ? p.amount : p.grams / 100
          rows.push({
            date,
            meal: p.meal ?? meal,
            name: dish.name,
            amount: servings,
            unit: 'serving',
            grams: null,
            ...roundNutrients(scaleNutrients(dishPerServing(dish), servings)),
            food_id: null,
            dish_id: dish.id,
            recipe_id: null,
            veggies: detectVeggies(...dish.ingredients.map((i) => i.name)),
          })
          if (!usedDishes.some((d) => d.id === dish.id)) usedDishes.push(dish)
          continue
        }
        const key = p.name.trim().toLowerCase()
        const stored = p.stored ? (p.food as Food) : (saved.get(key) ?? findStoredBasic(foods, p.name) ?? (await persist(p.food)))
        saved.set(key, stored)
        // Passt die Einheit nicht mehr zum gespeicherten Lebensmittel, zählen die Gramm
        let amount = p.amount
        let unit = p.unit
        let n = nutrientsForFoodAmount(stored, amount, unit)
        if (!n) {
          amount = p.grams
          unit = 'g'
          n = nutrientsForFoodAmount(stored, amount, unit)
        }
        if (!n) continue
        rows.push({
          date,
          meal: p.meal ?? meal,
          name: stored.brand ? `${stored.name} (${stored.brand})` : stored.name,
          amount,
          unit,
          grams: amountToGrams(amount, unit, stored),
          ...roundNutrients(n),
          food_id: stored.id,
          dish_id: null,
          recipe_id: null,
          veggies: detectVeggies(stored.name),
        })
        if (!used.some((f) => f.id === stored.id)) used.push(stored)
      }
      if (!rows.length) return
      // Getauschte Treffer merken, damit es beim nächsten Mal gleich passt
      const learned: Record<string, string> = {}
      for (const r of mealParse ? effectiveParts(mealParse, mealEdits) : []) {
        if (mealEdits.swaps[r.index] !== undefined) learned[rememberKey(r.original.query)] = r.part.name
      }
      await addLog.mutateAsync(rows)
      if (Object.keys(learned).length) {
        const next = rememberChoices(memory, learned)
        setMemory(next)
        saveMealMemory(next)
      }
      for (const f of used) touchFood.mutate(f)
      for (const d of usedDishes) saveDish.mutate({ ...d, last_used_at: new Date().toISOString() })
      const meals = MEAL_TYPES.filter((m) => rows.some((r) => r.meal === m))
      toast(rows.length === 1 ? `Zu ${mealList(meals)} hinzugefügt` : `${rows.length} Einträge zu ${mealList(meals)} hinzugefügt`, '✅')
      setAdded((a) => [...a, ...rows.map((r) => ({ name: r.name, kcal: r.kcal }))])
      setQuery('')
      setEditIndex(null)
      setMultiHint(false)
      try {
        localStorage.setItem(MULTI_HINT_KEY, '1')
      } catch {
        // ohne Speicher erscheint der Tipp eben wieder
      }
    } catch {
      toast('Eintragen hat nicht geklappt – bitte noch einmal versuchen')
    } finally {
      setBulkBusy(false)
    }
  }

  /** Anderen Treffer wählen (-1 = wieder den ursprünglichen); eine geänderte Menge gilt dann nicht mehr */
  function swapPart(choice: number) {
    if (swapIndex === null) return
    const swaps = { ...mealEdits.swaps }
    const amounts = { ...mealEdits.amounts }
    if (choice < 0) delete swaps[swapIndex]
    else swaps[swapIndex] = choice
    delete amounts[swapIndex]
    setEdits({ ...mealEdits, swaps, amounts })
    setSwapIndex(null)
  }

  /** Menge eines erkannten Eintrags ändern (gilt, solange der Text gleich bleibt) */
  function changePartAmount(amount: number, unit: AmountUnit) {
    if (editIndex !== null) setEdits({ ...mealEdits, amounts: { ...mealEdits.amounts, [editIndex]: { amount, unit } } })
    setEditIndex(null)
  }

  async function addQuick(input: QuickEntryInput) {
    const entry = quickEntry(date, meal, input)
    await addLog.mutateAsync([entry])
    toast(`Zu ${MEAL_LABELS[meal]} hinzugefügt`, '✅')
    setAdded((a) => [...a, { name: entry.name, kcal: entry.kcal }])
    setQuickOpen(false)
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
    setAdded((a) => [...a, { name: selectedDish.name, kcal: n.kcal }])
    setSelectedDish(null)
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
    <div className={`mx-auto min-h-dvh max-w-lg px-4 safe-top ${added.length ? 'pb-28' : 'pb-10'}`}>
      <PageHeader title="Hinzufügen" back subtitle={added.length ? 'Du kannst weitere Lebensmittel hinzufügen.' : undefined} />
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
              placeholder="Suchen, z. B. Apfel, Döner, Cappuccino"
              className="min-h-12 w-full rounded-2xl bg-surface pl-11 pr-4 text-base ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            aria-label="Schnell-Eintrag: nur Kalorien"
            title="Schnell-Eintrag"
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface ring-1 ring-line active:scale-95"
          >
            <Zap className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            aria-label="Barcode scannen"
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink shadow-sm active:scale-95"
          >
            <ScanBarcode className="size-6" aria-hidden />
          </button>
        </div>
        {multiHint && !searching && (
          <p className="mt-1.5 px-1 text-xs text-muted">
            Tipp: Mehreres auf einmal, z. B. „2 Brötchen, 1 Kaffee“
          </p>
        )}
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

          {tab === 'browse' ? (
            <>
              <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Kategorien">
                {FOOD_GROUPS.map((g) => (
                  <Chip key={g.id} active={browseGroup === g.id} onClick={() => setBrowseGroup(g.id)}>
                    <span aria-hidden>{g.emoji}</span> {g.label}
                  </Chip>
                ))}
              </div>
              <ul className="mt-2 space-y-1" aria-label={FOOD_GROUPS.find((g) => g.id === browseGroup)?.label}>
                {browseHits.map((h) => (
                  <FoodRow
                    key={h.key}
                    title={h.name}
                    subtitle={h.subtitle}
                    kcal={h.kcal}
                    kcalLabel={h.kcalLabel}
                    onClick={() => setSelected(findStoredBasic(foods, h.name) ?? h.food)}
                  />
                ))}
              </ul>
            </>
          ) : tab === 'dishes' ? (
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
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="secondary" aria-label="Eigenes Lebensmittel anlegen" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCustomOpen(true)}>
                  Eigenes Lebensmittel
                </Button>
                <Button variant="secondary" icon={<Zap className="size-4" aria-hidden />} onClick={() => setQuickOpen(true)}>
                  Nur Kalorien
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {searching && (
        <div className="mt-2">
          {mealParse && (
            <MealTextCard
              parse={mealParse}
              edits={mealEdits}
              meal={meal}
              busy={bulkBusy}
              onRemove={(i) => setEdits({ ...mealEdits, removed: [...mealEdits.removed, i] })}
              onEdit={setEditIndex}
              onSwap={setSwapIndex}
              onAddAll={addParts}
            />
          )}
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
          {quickHits.length > 0 && (
            <>
              <h2 className="px-1 pt-4 text-sm font-semibold text-muted">Lebensmittel & Gerichte</h2>
              <ul className="mt-1 space-y-1" aria-label="Lebensmittel und Gerichte">
                {quickHits.map((h) => (
                  <FoodRow
                    key={h.key}
                    title={h.name}
                    subtitle={h.subtitle}
                    kcal={h.kcal}
                    kcalLabel={h.kcalLabel}
                    onClick={() => setSelected(findStoredBasic(foods, h.name) ?? h.food)}
                  />
                ))}
              </ul>
            </>
          )}
          {!isList && <h2 className="px-1 pt-4 text-sm font-semibold text-muted">Open Food Facts</h2>}
          {!isList && off.isFetching && <Spinner label="Suche läuft …" />}
          {!isList && off.error && !off.isFetching && (
            <EmptyState
              icon={<WifiOff className="size-8" />}
              title="Suche gerade nicht möglich"
              text="Open Food Facts ist nicht erreichbar. Du kannst ein eigenes Lebensmittel anlegen."
            />
          )}
          {!isList && off.data && !off.isFetching && (
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
          {!isList && off.data?.length === 0 && !off.isFetching && (
            <EmptyState title="Keine Treffer" text="Probiere einen anderen Begriff oder lege das Lebensmittel selbst an." />
          )}
          <Button variant="secondary" block className="mt-3" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCustomOpen(true)}>
            „{query.trim()}“ selbst anlegen
          </Button>
          <Button variant="ghost" block className="mt-1" icon={<Zap className="size-4" aria-hidden />} onClick={() => setQuickOpen(true)}>
            Nur Kalorien für „{query.trim()}“ eintragen
          </Button>
        </div>
      )}

      <FoodAmountSheet
        food={selectedStored ?? selected}
        onClose={() => setSelected(null)}
        onAdd={addFood}
        busy={addLog.isPending || ensureFood.isPending || saveFood.isPending}
        confirmLabel={`Zu ${MEAL_LABELS[meal]} hinzufügen`}
        onToggleFavorite={
          selected
            ? async () => {
                const stored = selectedStored ?? (await persist(selected))
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
      <FoodAmountSheet
        food={editingPart && !editingPart.dish ? editingPart.food : null}
        initialAmount={editingPart?.amount}
        initialUnit={editingPart?.unit}
        onClose={() => setEditIndex(null)}
        onAdd={(amount, unit) => changePartAmount(amount, unit)}
        confirmLabel="Menge übernehmen"
      />
      <MealPartSwapSheet
        original={swapOriginal}
        selected={swapIndex !== null ? (mealEdits.swaps[swapIndex] ?? -1) : -1}
        onSelect={swapPart}
        onClose={() => setSwapIndex(null)}
      />
      <DishAmountSheet
        dish={editingPart?.dish ?? null}
        initialServings={editingPart?.amount}
        onClose={() => setEditIndex(null)}
        onAdd={(servings) => changePartAmount(servings, 'serving')}
        confirmLabel="Menge übernehmen"
      />
      <DishAmountSheet
        dish={selectedDish}
        onClose={() => setSelectedDish(null)}
        onAdd={addDish}
        busy={addLog.isPending}
        confirmLabel={`Zu ${MEAL_LABELS[meal]} hinzufügen`}
      />
      <QuickEntrySheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAdd={addQuick}
        initialName={query.trim()}
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
      {added.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur animate-fade-up">
          <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="text-sm font-semibold">
                {added.length} {added.length === 1 ? 'Eintrag' : 'Einträge'} · {fmtInt(added.reduce((s, a) => s + a.kcal, 0))} kcal
              </p>
              <p className="truncate text-xs text-muted">{added.map((a) => a.name).join(', ')}</p>
            </div>
            <Button size="lg" icon={<Check className="size-5" aria-hidden />} onClick={done}>
              Fertig
            </Button>
          </div>
        </div>
      )}
      <BarcodeScannerSheet open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onBarcode} />
      {scanMiss && (
        <p className="sr-only" role="status">
          Barcode {scanMiss} nicht gefunden. Du kannst das Produkt selbst anlegen.
        </p>
      )}
    </div>
  )
}
