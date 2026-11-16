/**
 * Geplantes auf der Tagesseite: Was im Wochenplan für diesen Tag steht und noch nicht eingetragen ist, lässt sich mit
 * einem Tipp als gegessen übernehmen.
 */
import type { LogEntry, PlanItem } from '../types'
import { roundNutrients } from './nutrition'

type NewLogEntry = Omit<LogEntry, 'id' | 'user_id' | 'created_at'>

/** Ist dieser Eintrag das geplante Gericht? Rezept bzw. Gericht über die ID, freier Text über den Namen */
function sameThing(p: PlanItem, e: LogEntry): boolean {
  if (p.recipe_id) return e.recipe_id === p.recipe_id
  if (p.dish_id) return e.dish_id === p.dish_id
  return e.name.trim().toLowerCase() === p.title.trim().toLowerCase()
}

/**
 * Geplantes, das noch nicht eingetragen ist. Jeder Eintrag „verbraucht“ höchstens einen Plan-Eintrag: Ist dasselbe
 * Rezept zweimal geplant und einmal gegessen, bleibt eins übrig.
 */
export function openPlanItems(plan: readonly PlanItem[], entries: readonly LogEntry[]): PlanItem[] {
  const used = new Set<string>()
  return plan.filter((p) => {
    const match = entries.find((e) => !used.has(e.id) && e.meal === p.meal && sameThing(p, e))
    if (!match) return true
    used.add(match.id)
    return false
  })
}

/** Lässt sich direkt eintragen? Freier Text ohne Nährwerte („Essen bei Oma“) braucht erst Werte */
export function canLogDirectly(p: PlanItem): boolean {
  return Number(p.kcal) > 0
}

/** Tagebuch-Eintrag für ein geplantes Gericht – Portionen und Nährwerte wie geplant */
export function planItemEntry(p: PlanItem, veggies: string[]): NewLogEntry {
  return {
    date: p.date,
    meal: p.meal,
    name: p.title,
    amount: Number(p.servings) || 1,
    unit: 'serving',
    grams: null,
    ...roundNutrients({ kcal: Number(p.kcal), protein: Number(p.protein), carbs: Number(p.carbs), fat: Number(p.fat) }),
    food_id: null,
    dish_id: p.dish_id,
    recipe_id: p.recipe_id,
    veggies,
  }
}
