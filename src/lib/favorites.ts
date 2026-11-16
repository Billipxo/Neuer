/**
 * Lieblingszutaten: Zutaten, die man gern isst. Daraus schlägt die App Kochbuch-Rezepte vor (die mit den meisten
 * Lieblingszutaten zuerst), bevorzugt sie leicht bei „Woche vorschlagen“ und stellt eigene Gerichte daraus zusammen.
 * Gespeichert wird die Auswahl nur auf diesem Gerät – wie „Was habe ich da?“.
 */
import type { DishIngredient, Recipe } from '../types'
import { INGREDIENT_LIST, type IngredientInfo } from '../data/ingredients'
import { recipeNeeds } from './pantry'

export const FAVORITES_KEY = 'teller-lieblingszutaten'

/** Höchstens so viele Lieblingszutaten – mehr wäre keine Auswahl mehr */
export const MAX_FAVORITES = 40

export function loadFavorites(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null') as unknown
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, MAX_FAVORITES)
  } catch {
    // ohne Speicher (privates Fenster) gibt es eben keine gemerkten Lieblingszutaten
  }
  return []
}

export function saveFavorites(list: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list.slice(0, MAX_FAVORITES)))
  } catch {
    // nicht schlimm: die Auswahl gilt dann nur bis zum Schließen
  }
}

export interface FavoriteMatch {
  recipe: Recipe
  /** Lieblingszutaten, die das Rezept verwendet */
  used: string[]
  /** Weitere Zutaten (ohne Salz, Öl, Gewürze) */
  others: number
}

/**
 * Rezepte mit Lieblingszutaten: die meisten Lieblingszutaten zuerst, dann die mit wenigen weiteren Zutaten,
 * dann die schnelleren. Zwiebeln und Knoblauch zählen mit, wenn man sie ausdrücklich mag.
 */
export function favoriteRecipes(recipes: Recipe[], favorites: string[]): FavoriteMatch[] {
  const fav = new Set(favorites)
  if (!fav.size) return []
  return recipes
    .map((recipe) => {
      const needs = recipeNeeds(recipe, { assumeBasics: false })
      const used = needs.filter((n) => fav.has(n))
      return { recipe, used, others: needs.length - used.length }
    })
    .filter((m) => m.used.length > 0)
    .sort(
      (a, b) =>
        b.used.length - a.used.length ||
        a.others - b.others ||
        a.recipe.time_min - b.recipe.time_min ||
        a.recipe.title.localeCompare(b.recipe.title, 'de'),
    )
}

/** Wie viele Lieblingszutaten ein Rezept verwendet – für die leichte Bevorzugung bei „Woche vorschlagen“ */
export function favoriteCount(recipe: Recipe, favorites: ReadonlySet<string>): number {
  if (!favorites.size) return 0
  return recipeNeeds(recipe, { assumeBasics: false }).filter((n) => favorites.has(n)).length
}

/** Trockene Grundzutaten (Reis, Nudeln …): eine Portion ungekocht */
const DRY_BASES = new Set(['Reis', 'Nudeln', 'Asia-Nudeln', 'Couscous', 'Bulgur', 'Quinoa', 'Linsen', 'Hirse', 'Polenta', 'Grieß', 'Haferflocken'])
const PIECE_UNITS = ['Stück', 'Scheibe', 'Zehe', 'Blatt', 'Beutel', 'Rolle', 'Päckchen']

const hasPieceUnit = (info: IngredientInfo) => PIECE_UNITS.some((u) => info.units[u])

/**
 * Eintrag der Nährwerttabelle zu einer Lieblingszutat: genau dieser Name oder – bei einem Oberbegriff wie „Käse“ –
 * am liebsten eine Sorte mit Stück- oder Scheibenmaß (Gouda statt Bergkäse am Stück)
 */
export function favoriteInfo(name: string): IngredientInfo | undefined {
  const exact = INGREDIENT_LIST.find((i) => i.name === name)
  if (exact) return exact
  const kinds = INGREDIENT_LIST.filter((i) => i.base === name)
  // Käse & Co.: am liebsten eine Sorte mit Scheiben- oder Stückmaß (Käse → Gouda). Bei Fleisch das klassische, zuerst
  // aufgeführte Stück – „Hähnchen“ ist Hähnchenbrust, nicht die Keule mit Stückgewicht
  return kinds.find((i) => hasPieceUnit(i) && !i.flags.includes('M')) ?? kinds[0]
}

/** Übliche Menge einer Zutat für ein Gericht in Gramm: ein Stück, ein Esslöffel, eine Portion ungekocht oder 100 g */
export function typicalGrams(info: IngredientInfo): number {
  for (const u of PIECE_UNITS) if (info.units[u]) return info.units[u]
  if (info.units.EL) return info.units.EL
  if (DRY_BASES.has(info.base) || DRY_BASES.has(info.name)) return 70
  return 100
}

/** Lieblingszutat als Zutat eines eigenen Gerichts – Werte aus der Nährwerttabelle, übliche Menge */
export function favoriteDishIngredient(name: string): DishIngredient | null {
  const info = favoriteInfo(name)
  if (!info) return null
  return {
    food_id: null,
    name: info.name,
    grams: typicalGrams(info),
    kcal_100: info.kcal,
    protein_100: info.protein,
    carbs_100: info.carbs,
    fat_100: info.fat,
  }
}

/** Vorschlag für den Namen eines Gerichts aus Zutaten: „Lachs, Spinat & Reis“ */
export function dishNameFrom(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}
