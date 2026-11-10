import { GUIDES, type Guide } from '../data/guides'
import { INGREDIENT_LIST } from '../data/ingredients'
import type { Recipe } from '../types'
import { ingredientInfo } from './recipeNutrition'
import { fmt1 } from './format'

export function getGuide(id: string | undefined): Guide | undefined {
  return GUIDES.find((g) => g.id === id)
}

/**
 * Passende Anleitungen zu einem Rezept (höchstens drei), z. B. Heißluftfritteuse, Kerntemperaturen oder Reis kochen.
 */
export function relatedGuides(recipe: Recipe, limit = 3): Guide[] {
  const bases = new Set(recipe.ingredients.map((i) => ingredientInfo(i.name)?.base ?? i.name))
  const flags = recipe.ingredients.map((i) => ingredientInfo(i.name)?.flags ?? '').join('')
  const veggieCount = recipe.ingredients.filter((i) => i.category === 'obst_gemuese').length
  const ids: string[] = []
  if (recipe.airfryer) ids.push('heissluftfritteuse')
  if (flags.includes('M') || flags.includes('F')) ids.push('kerntemperaturen')
  if (bases.has('Reis')) ids.push('reis-kochen')
  if (bases.has('Nudeln')) ids.push('nudeln-kochen')
  if (bases.has('Kartoffeln')) ids.push('kartoffeln')
  if (['Linsen', 'Schälerbsen', 'Kichererbsen', 'Bohnen (Dose)'].some((b) => bases.has(b))) ids.push('huelsenfruechte')
  if (bases.has('Eier')) ids.push('eier')
  if (recipe.tags.includes('meal-prep')) ids.push('meal-prep')
  if (veggieCount >= 4) ids.push('gemuese-garen')
  return ids
    .map((id) => getGuide(id))
    .filter((g): g is Guide => Boolean(g))
    .slice(0, limit)
}

const WEIGHT_UNITS = ['Stück', 'Zehe', 'Bund', 'Dose', 'Scheibe', 'Schale']

/** Durchschnittsgewichte aus der Nährwerttabelle (z. B. 1 Zwiebel ≈ 80 g) */
export function weightRows(): string[][] {
  const rows: string[][] = []
  const seen = new Set<string>()
  for (const i of INGREDIENT_LIST) {
    if (i.staple) continue
    for (const unit of WEIGHT_UNITS) {
      const g = i.units[unit]
      if (!g || g < 1) continue
      const label = `${i.name} · ${unit}`
      if (seen.has(label)) continue
      seen.add(label)
      rows.push([`1 ${unit} ${i.name}`, `ca. ${fmt1(g)} ${unit === 'Dose' && ['Kichererbsen', 'Kidneybohnen', 'weiße Bohnen', 'Mais', 'Thunfisch (naturell)'].includes(i.name) ? 'g abgetropft' : 'g'}`])
    }
  }
  return rows.sort((a, b) => a[0].replace(/^1 \S+ /, '').localeCompare(b[0].replace(/^1 \S+ /, ''), 'de'))
}
