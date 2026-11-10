import type { Recipe, RecipeIngredient, ShoppingItem } from '../types'
import { ingredientInfo } from './recipeNutrition'

export interface PantryOptions {
  /** Zwiebeln und Knoblauch als vorhanden annehmen */
  assumeBasics: boolean
}

export interface PantryMatch {
  recipe: Recipe
  have: string[]
  missing: string[]
  /** Anteil vorhandener Zutaten (0–1) */
  coverage: number
}

function baseOf(ing: RecipeIngredient): string {
  return ingredientInfo(ing.name)?.base ?? ing.name
}

/** Zutaten-Oberbegriffe, die ein Rezept wirklich braucht (ohne Salz, Öl, Gewürze …) */
export function recipeNeeds(recipe: Recipe, opts: PantryOptions): string[] {
  const needs = new Set<string>()
  for (const ing of recipe.ingredients) {
    const info = ingredientInfo(ing.name)
    if (info?.staple) continue
    if (opts.assumeBasics && info?.basic) continue
    needs.add(baseOf(ing))
  }
  return [...needs]
}

/** Alle wählbaren Zutaten mit Anzahl der Rezepte, in denen sie vorkommen – häufigste zuerst */
export function pantryChoices(recipes: Recipe[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of recipes) for (const b of recipeNeeds(r, { assumeBasics: false })) counts.set(b, (counts.get(b) ?? 0) + 1)
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'))
}

/**
 * Rezepte, die zu den vorhandenen Zutaten passen. Mindestens eine Zutat muss vorhanden sein.
 * Sortiert nach: wenigste fehlende Zutaten, dann die meisten genutzten Zutaten (so steht ein Omelett mit Eiern,
 * Spinat und Feta vor „Eier kochen“), dann höchster Anteil vorhandener Zutaten.
 */
export function matchRecipes(recipes: Recipe[], have: string[], opts: PantryOptions): PantryMatch[] {
  const owned = new Set(have)
  return recipes
    .map((recipe) => {
      const needs = recipeNeeds(recipe, opts)
      const hit = needs.filter((n) => owned.has(n))
      return { recipe, have: hit, missing: needs.filter((n) => !owned.has(n)), coverage: needs.length ? hit.length / needs.length : 0 }
    })
    .filter((m) => m.have.length > 0)
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.have.length - a.have.length ||
        b.coverage - a.coverage ||
        a.recipe.title.localeCompare(b.recipe.title, 'de'),
    )
}

/** Die konkreten Zutaten eines Rezepts zu fehlenden Oberbegriffen (für die Einkaufsliste) */
export function missingIngredients(recipe: Recipe, missing: string[]): RecipeIngredient[] {
  const set = new Set(missing)
  return recipe.ingredients.filter((i) => set.has(baseOf(i)))
}

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Als „im Vorrat“ markierte Einkaufsartikel den Zutaten-Oberbegriffen zuordnen */
export function choicesFromShopping(items: ShoppingItem[], choices: string[]): string[] {
  const found = new Set<string>()
  for (const item of items) {
    if (!item.in_stock) continue
    const n = norm(item.name)
    for (const c of choices) {
      const cn = norm(c)
      // Wortstamm vergleichen: „Zwiebel“ ↔ „Zwiebeln“, „Kartoffel“ ↔ „Kartoffeln“
      const stem = (w: string) => (w.length >= 6 ? w.replace(/(en|n|e|s)$/, '') : w)
      if (n === cn || n.includes(stem(cn)) || cn.includes(stem(n))) found.add(c)
    }
  }
  return [...found]
}
