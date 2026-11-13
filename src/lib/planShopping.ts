import type { Dish, PlanItem, Recipe } from '../types'
import { getRecipe, scaleIngredients } from './recipes'
import { guessCategory, mergeIngredients, type ShoppingInput } from './shopping'
import { ingredientAmount } from './dishes'

/**
 * Zutaten aus dem Wochenplan sammeln:
 * - Rezepte (auch eigene Varianten): Zutaten passend zur geplanten Portionszahl
 * - Eigene Gerichte: Zutaten in Gramm, anteilig zur Portionszahl
 * - Freitext: keine Zutaten
 * Ergebnis ist bereits zusammengeführt.
 */
export function ingredientsFromPlan(items: PlanItem[], dishes: Dish[], ownRecipes: Recipe[] = []): ShoppingInput[] {
  const out: ShoppingInput[] = []
  for (const item of items) {
    const servings = Number(item.servings) || 1
    if (item.kind === 'recipe') {
      const recipe = getRecipe(item.recipe_id) ?? ownRecipes.find((r) => r.id === item.recipe_id)
      if (!recipe) continue
      for (const i of scaleIngredients(recipe, servings)) out.push({ name: i.name, amount: i.amount, unit: i.unit, category: i.category })
    } else if (item.kind === 'dish') {
      const dish = dishes.find((d) => d.id === item.dish_id)
      if (!dish) continue
      const f = servings / (Number(dish.servings) || 1)
      for (const ing of dish.ingredients) {
        const { value, unit } = ingredientAmount(ing)
        const amount = unit === 'g' ? Math.round(value * f) : Math.round(value * f * 100) / 100
        out.push({ name: ing.name, amount, unit, category: guessCategory(ing.name) })
      }
    }
  }
  return mergeIngredients(out)
}
