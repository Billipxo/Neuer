/**
 * Kochbuch-Rezepte beim Eintragen: eine schlanke Übersicht (Titel, Nährwerte je Portion, Gemüse) für die Suche und die
 * Texterkennung. Das Kochbuch selbst (rund 600 kB) wird erst nachgeladen, wenn jemand tippt.
 */
import type { Nutrients, Recipe, RecipeVariant } from '../types'
import { nameScore } from './basicFoods'

export interface CookbookEntry {
  /** ID des Kochbuch-Rezepts bzw. der eigenen Variante / des eigenen Rezepts */
  id: string
  title: string
  /** Nährwerte je Portion */
  nutrition: Nutrients
  veggies: string[]
  /** Eigene Variante oder eigenes Rezept */
  own: boolean
}

export interface CookbookIndex {
  entries: CookbookEntry[]
  /** Eigene Variante bzw. eigenes Rezept als Eintrag (Nährwerte aus den Zutaten) */
  fromVariant: (v: RecipeVariant) => CookbookEntry | null
}

let loaded: CookbookIndex | null = null
let loading: Promise<CookbookIndex> | null = null

/** Kochbuch nachladen (einmal je Sitzung) */
export function loadCookbook(): Promise<CookbookIndex> {
  if (loaded) return Promise.resolve(loaded)
  loading ??= Promise.all([import('./recipes'), import('./variants')])
    .then(([book, variants]) => {
      const entry = (r: Recipe, own: boolean): CookbookEntry => ({
        id: r.id,
        title: r.title,
        nutrition: r.nutrition,
        veggies: book.recipeVeggies(r),
        own,
      })
      loaded = {
        entries: book.RECIPES.map((r) => entry(r, false)),
        fromVariant: (v) => {
          try {
            return entry(variants.variantToRecipe(v), true)
          } catch {
            return null
          }
        },
      }
      return loaded
    })
    .catch((e: unknown) => {
      loading = null
      throw e
    })
  return loading
}

/** Schon geladen? Dann ohne Warten */
export function loadedCookbook(): CookbookIndex | null {
  return loaded
}

/** Rezepte zu einer Suche: beste Titel-Treffer zuerst, bei Gleichstand eigene, dann kürzere Titel */
export function searchCookbook(entries: readonly CookbookEntry[], query: string, limit = 5): CookbookEntry[] {
  return entries
    .map((e) => ({ e, score: nameScore(query, e.title) }))
    .filter((x) => x.score >= 0 && x.score <= 5)
    .sort((a, b) => a.score - b.score || Number(b.e.own) - Number(a.e.own) || a.e.title.length - b.e.title.length)
    .slice(0, limit)
    .map((x) => x.e)
}
