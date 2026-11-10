import type { MacroPercents, MealType, Nutrients, PlanItem, Recipe } from '../types'
import { macroShares, roundNutrients, scaleNutrients, sumNutrients, ZERO } from './nutrition'
import { seasonScore } from './season'

export type NewPlanItem = Omit<PlanItem, 'id' | 'user_id' | 'created_at'>

/** Anteil des Tagesziels je Mahlzeit beim Wochenvorschlag */
export const MEAL_SHARES: Record<Exclude<MealType, 'snack'>, number> = {
  breakfast: 0.25,
  lunch: 0.37,
  dinner: 0.3,
}

export function planNutrients(i: Pick<PlanItem, 'kcal' | 'protein' | 'carbs' | 'fat'>): Nutrients {
  return { kcal: Number(i.kcal), protein: Number(i.protein), carbs: Number(i.carbs), fat: Number(i.fat) }
}

export function dayTotals(items: PlanItem[], date: string): Nutrients {
  const list = items.filter((i) => i.date === date)
  return list.length ? sumNutrients(list.map(planNutrients)) : { ...ZERO }
}

export interface WeekSummary {
  total: Nutrients
  /** Durchschnitt über die Tage, an denen etwas geplant ist */
  avgPerPlannedDay: Nutrients
  plannedDays: number
  perDay: Record<string, Nutrients>
}

export function weekSummary(items: PlanItem[], days: string[]): WeekSummary {
  const perDay = Object.fromEntries(days.map((d) => [d, dayTotals(items, d)]))
  const planned = days.filter((d) => items.some((i) => i.date === d))
  const total = sumNutrients(Object.values(perDay))
  return {
    total,
    perDay,
    plannedDays: planned.length,
    avgPerPlannedDay: planned.length ? scaleNutrients(total, 1 / planned.length) : { ...ZERO },
  }
}

export function recipePlanItem(r: Recipe, date: string, meal: MealType, servings: number): NewPlanItem {
  return {
    date,
    meal,
    kind: 'recipe',
    recipe_id: r.id,
    dish_id: null,
    title: r.title,
    servings,
    ...roundNutrients(scaleNutrients(r.nutrition, servings)),
  }
}

/** Kleiner, deterministischer Zufallsgenerator (für reproduzierbare Vorschläge und Tests) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SuggestOptions {
  recipes: Recipe[]
  days: string[]
  kcalTarget: number
  macros: MacroPercents
  /** Bereits belegte Einträge – diese Slots bleiben unverändert */
  existing: PlanItem[]
  includeSnacks?: boolean
  /** Heißluftfritteusen-Rezepte leicht bevorzugen */
  preferAirfryer?: boolean
  /** Monat (1–12): saisonale Rezepte leicht bevorzugen */
  month?: number
  random?: () => number
}

/** Portionen in 0,5er-Schritten zwischen 1 und 2, damit der Slot gut getroffen wird */
export function servingsFor(slotKcal: number, recipeKcal: number): number {
  if (recipeKcal <= 0) return 1
  return Math.min(2, Math.max(1, Math.round((slotKcal / recipeKcal) * 2) / 2))
}

function score(r: Recipe, servings: number, slotKcal: number, macros: MacroPercents): number {
  const kcalDiff = Math.abs(r.nutrition.kcal * servings - slotKcal) / Math.max(1, slotKcal)
  const s = macroShares(r.nutrition)
  const macroDiff = (Math.abs(s.protein - macros.protein) + Math.abs(s.carbs - macros.carbs) + Math.abs(s.fat - macros.fat)) / 300
  return kcalDiff + 0.5 * macroDiff
}

/**
 * „Woche vorschlagen“: füllt leere Slots (Frühstück, Mittag, Abend und optional Snack) mit Rezepten, die zum
 * Tagesziel passen. Wiederholungen innerhalb der Woche werden vermieden, solange genug Rezepte da sind.
 */
export function suggestWeek(opts: SuggestOptions): NewPlanItem[] {
  const { recipes, days, kcalTarget, macros, existing, includeSnacks = true } = opts
  const random = opts.random ?? Math.random
  const used = new Set(existing.filter((e) => e.recipe_id).map((e) => e.recipe_id as string))
  const out: NewPlanItem[] = []

  const pick = (meal: MealType, slotKcal: number): { r: Recipe; servings: number } | null => {
    const pool = recipes.filter((r) => r.meal.includes(meal))
    if (!pool.length || slotKcal <= 0) return null
    const fresh = pool.filter((r) => !used.has(r.id))
    const candidates = (fresh.length ? fresh : pool)
      .map((r) => {
        const servings = servingsFor(slotKcal, r.nutrition.kcal)
        const airfryerBonus = opts.preferAirfryer && r.airfryer ? 0.05 : 0
        const seasonBonus = opts.month ? Math.min(3, Math.max(0, seasonScore(r, opts.month).score)) * 0.02 : 0
        return { r, servings, s: score(r, servings, slotKcal, macros) - airfryerBonus - seasonBonus }
      })
      .sort((a, b) => a.s - b.s)
      .slice(0, 4)
    const choice = candidates[Math.floor(random() * candidates.length)]
    used.add(choice.r.id)
    return { r: choice.r, servings: choice.servings }
  }

  for (const date of days) {
    const dayItems = existing.filter((e) => e.date === date)
    const taken = new Set(dayItems.map((e) => e.meal))
    let planned = dayItems.reduce((s, e) => s + Number(e.kcal), 0)
    for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
      if (taken.has(meal)) continue
      const choice = pick(meal, kcalTarget * MEAL_SHARES[meal])
      if (!choice) continue
      const item = recipePlanItem(choice.r, date, meal, choice.servings)
      planned += item.kcal
      out.push(item)
    }
    const rest = kcalTarget - planned
    if (includeSnacks && !taken.has('snack') && rest >= 120) {
      const snacks = recipes.filter((r) => r.meal.includes('snack') && r.nutrition.kcal <= rest * 1.1)
      const choice = pick('snack', Math.min(rest, 400))
      if (choice && snacks.some((s) => s.id === choice.r.id)) {
        out.push(recipePlanItem(choice.r, date, 'snack', 1))
      }
    }
  }
  return out
}
