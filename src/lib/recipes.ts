import rawRecipes from '../data/recipes.json'
import type { DietPreference, MealType, Nutrients, RawRecipe, Recipe, RecipeIngredient } from '../types'
import { scaleNutrients } from './nutrition'
import { detectVeggies } from './veggies'
import { deriveTags, dietInfo, nutritionPerServing } from './recipeNutrition'

/** Rezept um berechnete Nährwerte, Ernährungsform und abgeleitete Tags ergänzen */
export function buildRecipe(raw: RawRecipe): Recipe {
  const { fiber, ...nutrition } = nutritionPerServing(raw.ingredients, raw.servings)
  const diet = dietInfo(raw.ingredients)
  return { ...raw, nutrition, fiber, diet, tags: deriveTags(raw, { ...nutrition, fiber }, diet) }
}

export const RECIPES: Recipe[] = (rawRecipes as RawRecipe[]).map(buildRecipe)

export function getRecipe(id: string | null | undefined): Recipe | undefined {
  return id ? RECIPES.find((r) => r.id === id) : undefined
}

export interface RecipeFilter {
  chapter?: string | null
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
    if (f.chapter && r.chapter !== f.chapter) return false
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
  // Gerichte
  [/burger/i, '🍔'],
  [/pizza|flammkuchen/i, '🍕'],
  [/taco/i, '🌮'],
  [/burrito|wrap/i, '🌯'],
  [/sushi/i, '🍣'],
  [/pad thai|nudelsuppe|ramen/i, '🍜'],
  [/risotto|reis-bowl|reisbowl|gemüsereis|milchreis/i, '🍚'],
  [/curry|dal\b/i, '🍛'],
  [/lasagne|spaghetti|pasta|nudel|bolognese|gnocchi|penne|schupfnudel/i, '🍝'],
  [/spätzle/i, '🧀'],
  [/pancake|kaiserschmarrn/i, '🥞'],
  [/muffin/i, '🧁'],
  [/bananenbrot/i, '🍞'],
  [/brötchen/i, '🥯'],
  [/pommes/i, '🍟'],
  [/popcorn/i, '🍿'],
  [/studentenfutter/i, '🥜'],
  [/kugeln|bällchen/i, '🍪'],
  [/trauben/i, '🍇'],
  [/reiswaffel/i, '🍘'],
  [/nicecream|frozen|parfait|bananen-eis/i, '🍨'],
  [/schoko/i, '🍫'],
  [/chia/i, '🥥'],
  [/shake|smoothie/i, '🥤'],
  [/oats|porridge|müsli|grieß/i, '🥣'],
  [/garnele/i, '🦐'],
  [/lachs|kabeljau|thunfisch|seelachs|fisch/i, '🐟'],
  [/hähnchen|pute|huhn|hühner|gyros/i, '🍗'],
  [/klopse|frikadelle|ćevap|cevap|gulasch|hack/i, '🍖'],
  [/falafel/i, '🧆'],
  [/hummus|edamame|kichererbse|linse|bohne|erbse/i, '🫘'],
  [/ei\b|eier|omelett|frittata|shakshuka|rührei|spiegelei|bauernfrühstück/i, '🍳'],
  [/tomatensuppe|tomaten-mozzarella/i, '🍅'],
  [/kürbis/i, '🎃'],
  [/möhre|karotte|gemüsesticks/i, '🥕'],
  [/suppe|eintopf|chili|pichelsteiner/i, '🍲'],
  [/salat|tabouleh/i, '🥗'],
  [/brokkoli|blumenkohl|rosenkohl/i, '🥦'],
  [/grünkohl|rotkohl|spitzkohl|sauerkraut|wirsing/i, '🥬'],
  [/spargel/i, '🌿'],
  [/champignon|pilz/i, '🍄'],
  [/apfel|beeren|banane|crumble/i, '🍎'],
  [/brot|toast|knäcke/i, '🥪'],
  [/kartoffel/i, '🥔'],
  [/paprika|gemüse|zucchini|süßkartoffel|ratatouille/i, '🫑'],
  [/tofu/i, '🍱'],
  [/quark|skyr|joghurt|hüttenkäse/i, '🥛'],
  [/feta|halloumi/i, '🧀'],
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
  klassiker: 'Klassiker',
  'one-pot': 'One Pot',
  suess: 'Süßes',
}

export type RecipeSort = 'empfohlen' | 'kcal' | 'zeit' | 'eiweiss' | 'oft'

export const SORT_LABELS: Record<RecipeSort, string> = {
  empfohlen: 'Empfohlen',
  kcal: 'Wenig kcal zuerst',
  zeit: 'Schnell zuerst',
  eiweiss: 'Viel Eiweiß zuerst',
  oft: 'Oft gekocht',
}

export interface CookedStat {
  count: number
  /** Datum des letzten Eintrags (yyyy-MM-dd) */
  last: string
}

/** Wie oft und wann zuletzt ein Rezept als gegessen eingetragen wurde */
export function cookedStats(log: { recipe_id: string | null; date: string }[]): Map<string, CookedStat> {
  const map = new Map<string, CookedStat>()
  for (const e of log) {
    if (!e.recipe_id) continue
    const cur = map.get(e.recipe_id)
    map.set(e.recipe_id, { count: (cur?.count ?? 0) + 1, last: cur && cur.last > e.date ? cur.last : e.date })
  }
  return map
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
  opts: { favorites?: string[]; preferAirfryer?: boolean; cooked?: Map<string, CookedStat> } = {},
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
    case 'oft': {
      const c = (r: Recipe) => opts.cooked?.get(r.id)?.count ?? 0
      return list.sort((a, b) => c(b) - c(a) || byIndex(a, b))
    }
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

/** Rezept als Text zum Teilen (Messenger, E-Mail) */
export function recipeShareText(r: Recipe, servings: number, steps: string[]): string {
  const lines = [
    `${recipeEmoji(r)} ${r.title}`,
    `${servings} Portion${servings === 1 ? '' : 'en'} · ${r.time_min} Min. · ca. ${Math.round(r.nutrition.kcal)} kcal pro Portion`,
    '',
    'Zutaten:',
    ...scaleIngredients(r, servings).map((i) => `• ${[formatAmount(i.amount, i.unit), i.name].filter(Boolean).join(' ')}${i.note ? ` (${i.note})` : ''}`),
    '',
    'Zubereitung:',
    ...steps.map((s, idx) => `${idx + 1}. ${s}`),
  ]
  return lines.join('\n')
}

function formatAmount(amount: number | null, unit: string): string {
  if (amount === null) return ''
  const n = String(Math.round(amount * 100) / 100).replace('.', ',')
  return unit ? `${n} ${unit}` : n
}

export const DIET_LABELS: Record<DietPreference, string> = {
  all: 'Alles',
  vegetarian: 'Vegetarisch',
  vegan: 'Vegan',
}

/** Passt das Rezept zur gewählten Ernährungsweise? */
export function matchesDiet(r: Recipe, diet: DietPreference | undefined): boolean {
  if (diet === 'vegan') return r.diet.vegan
  if (diet === 'vegetarian') return r.diet.vegetarian
  return true
}
