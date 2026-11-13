import type { Nutrients } from '../types'

export type NutrientBasis = '100g' | 'serving'

/**
 * Nährwerte eines eigenen Lebensmittels auf 100 g umrechnen.
 * Bei Angabe „pro Portion“ ist die Portionsgröße in Gramm erforderlich.
 */
export function toPer100(values: Nutrients, basis: NutrientBasis, servingGrams: number | null): Nutrients | null {
  if (basis === '100g') return values
  if (!servingGrams || servingGrams <= 0) return null
  const f = 100 / servingGrams
  return {
    kcal: round1(values.kcal * f),
    protein: round1(values.protein * f),
    carbs: round1(values.carbs * f),
    fat: round1(values.fat * f),
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}
