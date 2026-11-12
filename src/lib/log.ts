import type { LogEntry, MealType, Nutrients } from '../types'
import { MEAL_TYPES } from '../types'
import { roundNutrients, scaleNutrients, sumNutrients, ZERO } from './nutrition'
import { detectVeggies } from './veggies'

/** Einträge nach Mahlzeit gruppieren (feste Reihenfolge) */
export function groupByMeal(entries: LogEntry[]): Record<MealType, LogEntry[]> {
  const out = Object.fromEntries(MEAL_TYPES.map((m) => [m, [] as LogEntry[]])) as Record<MealType, LogEntry[]>
  for (const e of entries) out[e.meal]?.push(e)
  return out
}

export function entryNutrients(e: Pick<LogEntry, 'kcal' | 'protein' | 'carbs' | 'fat'>): Nutrients {
  return { kcal: Number(e.kcal), protein: Number(e.protein), carbs: Number(e.carbs), fat: Number(e.fat) }
}

export function totalsOf(entries: LogEntry[]): Nutrients {
  return entries.length ? sumNutrients(entries.map(entryNutrients)) : { ...ZERO }
}

/** Summen pro Tag */
export function totalsByDate(entries: LogEntry[]): Map<string, Nutrients> {
  const map = new Map<string, LogEntry[]>()
  for (const e of entries) {
    const list = map.get(e.date) ?? []
    list.push(e)
    map.set(e.date, list)
  }
  return new Map([...map].map(([d, list]) => [d, totalsOf(list)]))
}

/** Menge eines Eintrags ändern – Nährwerte werden proportional angepasst. */
export function rescaleEntry<T extends Pick<LogEntry, 'amount' | 'grams' | 'kcal' | 'protein' | 'carbs' | 'fat'>>(
  e: T,
  newAmount: number,
): Pick<LogEntry, 'amount' | 'grams' | 'kcal' | 'protein' | 'carbs' | 'fat'> {
  const factor = e.amount > 0 ? newAmount / e.amount : 0
  const n = scaleNutrients(entryNutrients(e), factor)
  return {
    amount: newAmount,
    grams: e.grams === null ? null : Number(e.grams) * factor,
    ...n,
  }
}

/** Einträge auf einen anderen Tag / eine andere Mahlzeit kopieren (ohne IDs) */
export function copyEntries(entries: LogEntry[], date: string, meal: MealType): Omit<LogEntry, 'id' | 'user_id' | 'created_at'>[] {
  return entries.map((e) => ({
    date,
    meal,
    name: e.name,
    amount: Number(e.amount),
    unit: e.unit,
    grams: e.grams === null ? null : Number(e.grams),
    kcal: Number(e.kcal),
    protein: Number(e.protein),
    carbs: Number(e.carbs),
    fat: Number(e.fat),
    food_id: e.food_id,
    dish_id: e.dish_id,
    recipe_id: e.recipe_id,
    veggies: e.veggies ?? [],
  }))
}

export interface QuickEntryInput {
  name?: string
  kcal: number
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}

/** Schnell-Eintrag: nur Kalorien (und optional Makros), ohne Lebensmittel dahinter – z. B. Essen im Restaurant */
export function quickEntry(date: string, meal: MealType, input: QuickEntryInput): Omit<LogEntry, 'id' | 'user_id' | 'created_at'> {
  const name = input.name?.trim() || 'Schnell-Eintrag'
  return {
    date,
    meal,
    name,
    amount: 1,
    unit: 'serving',
    grams: null,
    ...roundNutrients({ kcal: input.kcal, protein: input.protein ?? 0, carbs: input.carbs ?? 0, fat: input.fat ?? 0 }),
    food_id: null,
    dish_id: null,
    recipe_id: null,
    veggies: detectVeggies(name),
  }
}
