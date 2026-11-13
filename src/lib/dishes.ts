import type { DishIngredient, LogEntry, MealType } from '../types'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Einträge einer Mahlzeit als Zutaten eines Gerichts.
 * Einträge mit Grammangabe werden pro 100 g gespeichert. Alles andere (Rezept-Portionen, Gerichte, Schnell-Einträge)
 * wird als Portion gespeichert: 100 „Gramm“ stehen dann für eine Portion, die Werte „pro 100 g“ für deren Nährwerte.
 */
export function dishIngredientsFromEntries(entries: LogEntry[]): DishIngredient[] {
  return entries.map((e) => {
    const grams = e.grams === null || e.grams === undefined ? 0 : Number(e.grams)
    if (grams > 0) {
      const f = 100 / grams
      return {
        food_id: e.food_id,
        name: e.name,
        grams: round2(grams),
        kcal_100: round2(Number(e.kcal) * f),
        protein_100: round2(Number(e.protein) * f),
        carbs_100: round2(Number(e.carbs) * f),
        fat_100: round2(Number(e.fat) * f),
      }
    }
    const amount = Number(e.amount) > 0 ? Number(e.amount) : 1
    return {
      food_id: null,
      name: e.name,
      grams: round2(amount * 100),
      kcal_100: round2(Number(e.kcal) / amount),
      protein_100: round2(Number(e.protein) / amount),
      carbs_100: round2(Number(e.carbs) / amount),
      fat_100: round2(Number(e.fat) / amount),
      portion: true,
    }
  })
}

const DISH_NAMES: Record<MealType, string> = {
  breakfast: 'Mein Frühstück',
  lunch: 'Mein Mittagessen',
  dinner: 'Mein Abendessen',
  snack: 'Mein Snack',
}

/** Namensvorschlag, der noch nicht vergeben ist: „Mein Frühstück“, „Mein Frühstück 2“ … */
export function suggestDishName(meal: MealType, existingNames: string[] = []): string {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()))
  const base = DISH_NAMES[meal]
  if (!taken.has(base.toLowerCase())) return base
  for (let i = 2; i < 100; i++) if (!taken.has(`${base} ${i}`.toLowerCase())) return `${base} ${i}`
  return base
}

/** Menge einer Zutat für die Anzeige: Gramm oder – bei Portions-Zutaten – Portionen */
export function ingredientAmount(i: Pick<DishIngredient, 'grams' | 'portion'>): { value: number; unit: 'g' | 'Portion' } {
  return i.portion ? { value: round2(i.grams / 100), unit: 'Portion' } : { value: i.grams, unit: 'g' }
}
