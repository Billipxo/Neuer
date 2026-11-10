import { INGREDIENT_LIST } from '../data/ingredients'
import type { Recipe } from '../types'
import { ingredientGrams, ingredientInfo } from './recipeNutrition'

export const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
export const MONTH_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export interface SeasonRow {
  name: string
  months: number[]
}

/** Saisonkalender: ein Eintrag je Obst-/Gemüsesorte (Oberbegriff), aktuelle Saison zuerst */
export function seasonRows(month: number): SeasonRow[] {
  const map = new Map<string, Set<number>>()
  for (const i of INGREDIENT_LIST) {
    if (!i.season) continue
    const set = map.get(i.base) ?? new Set<number>()
    i.season.forEach((m) => set.add(m))
    map.set(i.base, set)
  }
  return [...map]
    .map(([name, set]) => ({ name, months: [...set].sort((a, b) => a - b) }))
    .sort((a, b) => Number(b.months.includes(month)) - Number(a.months.includes(month)) || a.name.localeCompare(b.name, 'de'))
}

/** Was hat in diesem Monat Saison? */
export function inSeasonNow(month: number): string[] {
  return seasonRows(month)
    .filter((r) => r.months.includes(month))
    .map((r) => r.name)
}

export interface SeasonScore {
  inSeason: string[]
  outOfSeason: string[]
  score: number
}

/**
 * Bewertet ein Rezept nach saisonalen Zutaten. Typische Saisonware mit kurzer Saison (z. B. Grünkohl) zählt mehr als
 * fast ganzjährige (z. B. Äpfel), kleine Mengen zählen weniger. Zutaten außerhalb ihrer Saison ziehen etwas ab.
 */
export function seasonScore(recipe: Recipe, month: number): SeasonScore {
  const inS = new Map<string, number>()
  const outS = new Map<string, number>()
  for (const ing of recipe.ingredients) {
    const info = ingredientInfo(ing.name)
    if (!info?.season) continue
    const amount = (ingredientGrams(ing) ?? 0) >= 100 ? 1 : 0.6
    if (info.season.includes(month)) {
      const specificity = 1 + (12 - info.season.length) / 12
      inS.set(info.base, Math.max(inS.get(info.base) ?? 0, specificity * amount))
    } else {
      outS.set(info.base, Math.max(outS.get(info.base) ?? 0, 0.5 * amount))
    }
  }
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0)
  return { inSeason: [...inS.keys()], outOfSeason: [...outS.keys()], score: Math.round((sum(inS) - sum(outS)) * 100) / 100 }
}

/** Rezepte, die gerade gut in die Saison passen */
export function seasonalRecipes(recipes: Recipe[], month: number, limit = 10): Recipe[] {
  return recipes
    .map((r) => ({ r, s: seasonScore(r, month) }))
    .filter(({ s }) => s.score >= 1.2)
    .sort((a, b) => b.s.score - a.s.score || a.r.title.localeCompare(b.r.title, 'de'))
    .slice(0, limit)
    .map(({ r }) => r)
}
