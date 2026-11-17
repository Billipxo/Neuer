/**
 * Essen passend zum Training: proteinreiche Ideen für die nächste freie Mahlzeit und Snacks für Trainingstage, die erst
 * nach dem Essen eingeplant wurden. Braucht das Kochbuch – wird nur bei Bedarf geladen.
 */
import type { MealType, PlanItem, Recipe } from '../types'
import { recommendRecipes } from './recipes'
import { isSuggestible, recipePlanItem, type NewPlanItem } from './planner'

/** Gesamtzeit eines Rezepts inklusive Warte-, Quell- und Kühlzeit */
export const totalMinutes = (r: Pick<Recipe, 'time_min' | 'rest_min'>) => r.time_min + (r.rest_min ?? 0)

/**
 * Proteinreiche Ideen für eine Mahlzeit, passend zu den offenen kcal. Zuerst Rezepte, die im Zeitbudget fertig sind;
 * reicht das nicht, kommen die schnellsten übrigen dazu.
 */
export function trainingMealIdeas(
  pool: Recipe[],
  o: { meal: MealType; remainingKcal: number; openMeals: number; maxMinutes: number; limit?: number },
): Recipe[] {
  const limit = o.limit ?? 3
  const protein = pool.filter((r) => r.tags.includes('proteinreich'))
  const fits = (list: Recipe[], n: number) =>
    recommendRecipes(list, { remainingKcal: o.remainingKcal, meal: o.meal, openMeals: o.openMeals, limit: n })
  const inTime = protein.filter((r) => totalMinutes(r) <= o.maxMinutes)
  const quick = fits(inTime, limit)
  if (quick.length >= limit) return quick
  const rest = fits(protein, 50)
    .filter((r) => !quick.includes(r))
    .sort((a, b) => totalMinutes(a) - totalMinutes(b))
  return [...quick, ...rest].slice(0, limit)
}

/** Ab so viel Platz (kcal) an einem Trainingstag lohnt ein zusätzlicher Snack */
export const MIN_SNACK_ROOM = 150
/** Größer als das wird ein Snack nicht */
const MAX_SNACK_KCAL = 400

/**
 * Training nach dem Essen eingeplant? An Trainingstagen mit Platz im Plan (Tagesziel samt Training minus Geplantes) je
 * einen Snack ergänzen – an Krafttagen deutlich bevorzugt proteinreich. Vorhandenes bleibt, wie es ist.
 */
export function trainingDaySnacks(o: {
  recipes: Recipe[]
  /** Platz je Tag in kcal */
  room: Record<string, number>
  /** Tage mit Krafttraining */
  proteinDays: readonly string[]
  existing: readonly Pick<PlanItem, 'recipe_id'>[]
  random?: () => number
}): NewPlanItem[] {
  const random = o.random ?? Math.random
  const used = new Set(o.existing.map((e) => e.recipe_id).filter((id): id is string => !!id))
  const snacks = o.recipes.filter((r) => isSuggestible(r) && r.meal.includes('snack'))
  const out: NewPlanItem[] = []
  for (const date of Object.keys(o.room).sort()) {
    const room = o.room[date]
    if (room < MIN_SNACK_ROOM) continue
    const target = Math.min(room, MAX_SNACK_KCAL)
    const fits = snacks.filter((r) => r.nutrition.kcal <= target * 1.1 && r.nutrition.kcal >= target * 0.4)
    const fresh = fits.filter((r) => !used.has(r.id))
    const proteinDay = o.proteinDays.includes(date)
    const best = (fresh.length ? fresh : fits)
      .map((r) => ({ r, s: Math.abs(r.nutrition.kcal - target) / target - (r.tags.includes('proteinreich') ? (proteinDay ? 0.3 : 0.1) : 0) }))
      .sort((a, b) => a.s - b.s)
      .slice(0, 4)
    if (!best.length) continue
    const choice = best[Math.floor(random() * best.length)].r
    used.add(choice.id)
    out.push(recipePlanItem(choice, date, 'snack', 1))
  }
  return out
}
