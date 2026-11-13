import type { MealType } from '../types'

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks',
}

/** Sinnvolle Mahlzeit je nach Uhrzeit vorschlagen */
export function mealForHour(hour: number): MealType {
  if (hour < 10) return 'breakfast'
  if (hour < 14) return 'lunch'
  if (hour >= 17 && hour < 21) return 'dinner'
  return 'snack'
}
