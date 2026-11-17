/**
 * Wann welche Hauptmahlzeit „noch vor einem liegt“ – für Rezeptideen passend zum Training. Bewusst ohne das Kochbuch,
 * damit die Tagesseite schnell startet.
 */
export type MainMeal = 'breakfast' | 'lunch' | 'dinner'

/** Bis zu dieser vollen Stunde liegt die Mahlzeit noch vor einem */
export const MEAL_UNTIL: Record<MainMeal, number> = { breakfast: 11, lunch: 15, dinner: 22 }

const ORDER: MainMeal[] = ['breakfast', 'lunch', 'dinner']

/** Die nächste freie Hauptmahlzeit (weder eingetragen noch geplant), die zur Uhrzeit noch passt */
export function nextFreeMeal(free: readonly MainMeal[], hour: number): MainMeal | undefined {
  return ORDER.find((m) => free.includes(m) && hour < MEAL_UNTIL[m])
}

/**
 * Wie lange ein Rezept höchstens dauern sollte: bis eine halbe Stunde vor Ende der Mahlzeit, mindestens 20 und
 * höchstens 60 Minuten – je später es ist, desto schneller.
 */
export function ideaTimeBudget(meal: MainMeal, minutesOfDay: number): number {
  return Math.max(20, Math.min(60, MEAL_UNTIL[meal] * 60 - minutesOfDay - 30))
}
