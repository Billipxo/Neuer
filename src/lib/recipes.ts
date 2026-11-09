import rawRecipes from '../data/recipes.json'
import type { MealType, Nutrients, Recipe, RecipeIngredient } from '../types'
import { scaleNutrients } from './nutrition'
import { detectVeggies } from './veggies'

export const RECIPES: Recipe[] = rawRecipes as Recipe[]

export function getRecipe(id: string | null | undefined): Recipe | undefined {
  return id ? RECIPES.find((r) => r.id === id) : undefined
}

export interface RecipeFilter {
  meal?: MealType | null
  maxKcal?: number | null
  maxTime?: number | null
  keyword?: string
  tag?: string | null
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Rezepte nach Mahlzeit, kcal pro Portion, Zubereitungszeit, Stichwort und Tag filtern */
export function filterRecipes(recipes: Recipe[], f: RecipeFilter): Recipe[] {
  const kw = f.keyword ? normalize(f.keyword.trim()) : ''
  return recipes.filter((r) => {
    if (f.meal && !r.meal.includes(f.meal)) return false
    if (f.maxKcal && r.nutrition.kcal > f.maxKcal) return false
    if (f.maxTime && r.time_min > f.maxTime) return false
    if (f.tag && !r.tags.includes(f.tag)) return false
    if (kw) {
      const hay = normalize([r.title, ...r.tags, ...r.ingredients.map((i) => i.name)].join(' '))
      if (!kw.split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })
}

export function allTags(recipes: Recipe[]): string[] {
  return [...new Set(recipes.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, 'de'))
}

/**
 * Empfehlungen passend zum verbleibenden Tagesbudget:
 * Das Restbudget wird auf die noch offenen Mahlzeiten verteilt; Rezepte, die nicht ins Restbudget passen, fallen raus.
 * Sortiert nach Nähe zum Budget pro Mahlzeit.
 */
export function recommendRecipes(
  recipes: Recipe[],
  opts: { remainingKcal: number; meal: MealType; openMeals: number; limit?: number },
): Recipe[] {
  const { remainingKcal, meal, openMeals, limit = 6 } = opts
  if (remainingKcal <= 0) return []
  const perMeal = remainingKcal / Math.max(1, openMeals)
  return recipes
    .filter((r) => r.meal.includes(meal) && r.nutrition.kcal <= remainingKcal)
    .map((r) => ({ r, score: Math.abs(r.nutrition.kcal - perMeal) }))
    .sort((a, b) => a.score - b.score || a.r.title.localeCompare(b.r.title, 'de'))
    .slice(0, limit)
    .map((x) => x.r)
}

/** Zutatenmengen für eine andere Portionszahl umrechnen */
export function scaleIngredients(r: Recipe, servings: number): RecipeIngredient[] {
  const f = r.servings > 0 ? servings / r.servings : 1
  return r.ingredients.map((i) => ({ ...i, amount: i.amount === null ? null : roundAmount(i.amount * f, i.unit) }))
}

/** Sinnvoll runden: Gramm/ml auf 5er-Schritte ab 50, sonst auf 0,25 */
export function roundAmount(amount: number, unit: string): number {
  if ((unit === 'g' || unit === 'ml') && amount >= 50) return Math.round(amount / 5) * 5
  if (unit === 'g' || unit === 'ml') return Math.round(amount)
  return Math.round(amount * 4) / 4
}

export function recipeNutrients(r: Recipe, servings: number): Nutrients {
  return scaleNutrients(r.nutrition, servings)
}

export function recipeVeggies(r: Recipe): string[] {
  return detectVeggies(...r.ingredients.filter((i) => i.category === 'obst_gemuese').map((i) => i.name))
}

const EMOJI_RULES: [RegExp, string][] = [
  [/suppe|eintopf/i, '🍲'],
  [/salat/i, '🥗'],
  [/pancake/i, '🥞'],
  [/lachs|kabeljau|thunfisch|garnele/i, '🐟'],
  [/hähnchen|pute|frikadelle/i, '🍗'],
  [/hack/i, '🥩'],
  [/spaghetti|nudel|bolognese|gnocchi/i, '🍝'],
  [/curry|reis|bowl/i, '🍛'],
  [/ei\b|eier|omelett|frittata|shakshuka|rührei/i, '🍳'],
  [/oats|porridge|müsli/i, '🥣'],
  [/smoothie/i, '🥤'],
  [/brot|toast|brötchen|wrap|knäcke/i, '🥪'],
  [/apfelchips|bratapfel|apfel|beeren|banane/i, '🍎'],
  [/pommes|kartoffelspalten/i, '🍟'],
  [/falafel|kichererbse/i, '🧆'],
  [/blumenkohl/i, '🥦'],
  [/champignon/i, '🍄'],
  [/muffin/i, '🧁'],
  [/zucchini-sticks|sticks/i, '🥒'],
  [/kartoffel/i, '🥔'],
  [/paprika|gemüse|zucchini|kürbis|süßkartoffel/i, '🫑'],
  [/hummus|edamame|kichererbse|linse|bohne/i, '🫘'],
  [/quark|skyr|joghurt/i, '🥛'],
]

export function recipeEmoji(r: Pick<Recipe, 'title'>): string {
  for (const [re, e] of EMOJI_RULES) if (re.test(r.title)) return e
  return '🍽️'
}

export const TAG_LABELS: Record<string, string> = {
  vegetarisch: 'Vegetarisch',
  vegan: 'Vegan',
  proteinreich: 'Proteinreich',
  'low-carb': 'Low Carb',
  schnell: 'Schnell',
  'meal-prep': 'Meal Prep',
  glutenfrei: 'Glutenfrei',
  ballaststoffreich: 'Ballaststoffreich',
  heissluftfritteuse: 'Heißluftfritteuse',
}

export type RecipeSort = 'empfohlen' | 'kcal' | 'zeit' | 'eiweiss'

export const SORT_LABELS: Record<RecipeSort, string> = {
  empfohlen: 'Empfohlen',
  kcal: 'Wenig kcal zuerst',
  zeit: 'Schnell zuerst',
  eiweiss: 'Viel Eiweiß zuerst',
}

/** Eiweiß in Gramm pro 100 kcal – Maß für „proteinreich“ unabhängig von der Portionsgröße */
export function proteinDensity(r: Recipe): number {
  return r.nutrition.kcal > 0 ? (r.nutrition.protein / r.nutrition.kcal) * 100 : 0
}

/**
 * Sortierung. „Empfohlen“ stellt Favoriten und (falls vorhanden) Heißluftfritteusen-Rezepte nach vorne,
 * sonst bleibt die Reihenfolge des Datensatzes.
 */
export function sortRecipes(
  recipes: Recipe[],
  sort: RecipeSort,
  opts: { favorites?: string[]; preferAirfryer?: boolean } = {},
): Recipe[] {
  const fav = new Set(opts.favorites ?? [])
  const index = new Map(recipes.map((r, i) => [r.id, i]))
  const byIndex = (a: Recipe, b: Recipe) => index.get(a.id)! - index.get(b.id)!
  const list = [...recipes]
  switch (sort) {
    case 'kcal':
      return list.sort((a, b) => a.nutrition.kcal - b.nutrition.kcal || byIndex(a, b))
    case 'zeit':
      return list.sort((a, b) => a.time_min - b.time_min || byIndex(a, b))
    case 'eiweiss':
      return list.sort((a, b) => proteinDensity(b) - proteinDensity(a) || byIndex(a, b))
    default: {
      const rank = (r: Recipe) => (fav.has(r.id) ? 0 : opts.preferAirfryer && r.airfryer ? 1 : 2)
      return list.sort((a, b) => rank(a) - rank(b) || byIndex(a, b))
    }
  }
}

export function airfryerRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.filter((r) => r.airfryer)
}

/** Zubereitungsschritte je nach Gerät */
export function recipeSteps(r: Recipe, method: 'airfryer' | 'oven'): string[] {
  if (method === 'airfryer' && r.airfryer?.steps) return r.airfryer.steps
  return r.steps
}

/** Rezept ist eine Backofen-Variante mit zusätzlicher Anleitung für die Heißluftfritteuse */
export function hasAirfryerVariant(r: Recipe): boolean {
  return Boolean(r.airfryer?.steps)
}

/** Rezept ist direkt für die Heißluftfritteuse geschrieben */
export function isAirfryerNative(r: Recipe): boolean {
  return Boolean(r.airfryer && !r.airfryer.steps)
}

export function toggleFavorite(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}
