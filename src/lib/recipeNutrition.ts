import { DEFAULT_UNIT_GRAMS, INGREDIENTS, type IngredientInfo } from '../data/ingredients'
import type { DietInfo, Nutrients, RecipeIngredient } from '../types'

export type { DietInfo }

export interface NutritionWithFiber extends Nutrients {
  fiber: number
}

export function ingredientInfo(name: string): IngredientInfo | undefined {
  return INGREDIENTS.get(name)
}

/** Gramm pro Einheit für eine Zutat, oder null, wenn unbekannt */
export function unitGrams(info: IngredientInfo, unit: string): number | null {
  return info.units[unit] ?? DEFAULT_UNIT_GRAMS[unit] ?? null
}

/** Nährwerte pro 100 g: aus der Tabelle oder – bei eigenen Zutaten – aus der Zutat selbst */
export function per100(ing: RecipeIngredient): NutritionWithFiber | undefined {
  if (ing.custom) return ing.custom
  return ingredientInfo(ing.name)
}

/** Kennzeichnung (Fleisch, Fisch, Milch, Ei, Gluten …) einer Zutat */
export function ingredientFlags(ing: RecipeIngredient): string {
  return ing.custom?.flags ?? ingredientInfo(ing.name)?.flags ?? ''
}

/** Menge einer Rezeptzutat in Gramm (Zutaten ohne Mengenangabe zählen als 0 g), null wenn nicht umrechenbar */
export function ingredientGrams(ing: RecipeIngredient): number | null {
  if (ing.amount === null) return 0
  if (ing.custom) {
    const g = ing.unit === 'Stück' ? (ing.custom.unit_g ?? null) : (DEFAULT_UNIT_GRAMS[ing.unit || 'g'] ?? null)
    return g === null ? null : ing.amount * g
  }
  const info = ingredientInfo(ing.name)
  if (!info) return null
  const g = unitGrams(info, ing.unit)
  return g === null ? null : ing.amount * g
}

/** Zutaten, die nicht in der Nährwerttabelle stehen oder deren Einheit nicht umgerechnet werden kann */
export function unresolvedIngredients(ingredients: RecipeIngredient[]): string[] {
  return ingredients.filter((i) => ingredientGrams(i) === null).map((i) => `${i.name} (${i.unit || 'ohne Einheit'})`)
}

/** Nährwerte aller Zutaten zusammen */
export function totalNutrition(ingredients: RecipeIngredient[]): NutritionWithFiber {
  const sum: NutritionWithFiber = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const ing of ingredients) {
    const grams = ingredientGrams(ing)
    const info = per100(ing)
    if (!grams || !info) continue
    const f = grams / 100
    sum.kcal += info.kcal * f
    sum.protein += info.protein * f
    sum.carbs += info.carbs * f
    sum.fat += info.fat * f
    sum.fiber += info.fiber * f
  }
  return sum
}

/** Nährwerte pro Portion, sinnvoll gerundet (kcal auf 5, Gramm auf ganze Zahlen) */
export function nutritionPerServing(ingredients: RecipeIngredient[], servings: number): NutritionWithFiber {
  const t = totalNutrition(ingredients)
  const s = servings > 0 ? servings : 1
  return {
    kcal: Math.round(t.kcal / s / 5) * 5,
    protein: Math.round(t.protein / s),
    carbs: Math.round(t.carbs / s),
    fat: Math.round(t.fat / s),
    fiber: Math.round(t.fiber / s),
  }
}

export function dietInfo(ingredients: RecipeIngredient[]): DietInfo {
  const flags = ingredients.map(ingredientFlags).join('')
  const has = (f: string) => flags.includes(f)
  const vegetarian = !has('M') && !has('F')
  return {
    vegetarian,
    vegan: vegetarian && !has('D') && !has('E') && !has('H') && !has('L'),
    glutenFree: !has('G'),
    animalRennet: has('L'),
  }
}

/** Tags, die sich aus Zutaten, Nährwerten und Zeit ergeben (werden nicht von Hand gepflegt) */
export const DERIVED_TAGS = ['vegetarisch', 'vegan', 'glutenfrei', 'proteinreich', 'low-carb', 'schnell', 'ballaststoffreich', 'heissluftfritteuse'] as const

export function deriveTags(
  r: { time_min: number; rest_min?: number; tags?: string[]; airfryer?: unknown },
  n: NutritionWithFiber,
  diet: DietInfo,
): string[] {
  const tags = new Set((r.tags ?? []).filter((t) => !(DERIVED_TAGS as readonly string[]).includes(t)))
  if (diet.vegan) tags.add('vegan')
  if (diet.vegetarian) tags.add('vegetarisch')
  if (diet.glutenFree) tags.add('glutenfrei')
  const energy = n.protein * 4 + n.carbs * 4 + n.fat * 9
  const proteinShare = energy > 0 ? (n.protein * 4) / energy : 0
  const carbShare = energy > 0 ? (n.carbs * 4) / energy : 0
  // Proteinreich: mind. 30 % der Energie aus Eiweiß – oder mind. 25 g pro Portion bei mind. 20 %
  if (proteinShare >= 0.3 || (n.protein >= 25 && proteinShare >= 0.2)) tags.add('proteinreich')
  // Low Carb: höchstens 20 g Kohlenhydrate pro Portion und höchstens 25 % der Energie
  if (n.carbs <= 20 && carbShare <= 0.25) tags.add('low-carb')
  // Schnell: in höchstens 15 Minuten fertig – inklusive Warte-, Quell- und Kühlzeit
  if (r.time_min + (r.rest_min ?? 0) <= 15) tags.add('schnell')
  // Ballaststoffreich: mind. 8 g pro Portion – oder mind. 5 g bei hoher Dichte (2,5 g pro 100 kcal)
  if (n.fiber >= 8 || (n.fiber >= 5 && n.kcal > 0 && (n.fiber / n.kcal) * 100 >= 2.5)) tags.add('ballaststoffreich')
  if (r.airfryer) tags.add('heissluftfritteuse')
  const rank = (t: string) => (TAG_ORDER.includes(t) ? TAG_ORDER.indexOf(t) : 99)
  return [...tags].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'de'))
}

/** Anzeige-Reihenfolge der Tags */
const TAG_ORDER = [
  'vegan',
  'vegetarisch',
  'proteinreich',
  'low-carb',
  'ballaststoffreich',
  'schnell',
  'glutenfrei',
  'heissluftfritteuse',
  'meal-prep',
  'one-pot',
  'klassiker',
  'suess',
]
