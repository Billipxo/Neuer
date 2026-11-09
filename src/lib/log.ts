import type { LogEntry, MealType, Nutrients } from '../types'
import { MEAL_TYPES } from '../types'
import { scaleNutrients, sumNutrients, ZERO } from './nutrition'

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
