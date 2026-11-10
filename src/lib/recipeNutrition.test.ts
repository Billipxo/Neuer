import { describe, expect, it } from 'vitest'
import { deriveTags, dietInfo, ingredientGrams, nutritionPerServing, totalNutrition, unresolvedIngredients } from './recipeNutrition'
import { INGREDIENT_LIST } from '../data/ingredients'
import { RECIPES, getRecipe } from './recipes'
import type { RecipeIngredient } from '../types'

const ing = (name: string, amount: number | null, unit: string): RecipeIngredient => ({ name, amount, unit, category: 'sonstiges' })

describe('Nährwerttabelle', () => {
  it('hat plausible Werte', () => {
    for (const i of INGREDIENT_LIST) {
      expect(i.kcal).toBeGreaterThanOrEqual(0)
      expect(i.kcal).toBeLessThanOrEqual(900)
      // Energie aus Makros (+ ~2 kcal/g Ballaststoffe) passt grob zu den kcal (±25 %, ab 40 kcal)
      const fromMacros = i.protein * 4 + i.carbs * 4 + i.fat * 9 + i.fiber * 2
      if (i.kcal >= 40) expect(Math.abs(fromMacros - i.kcal) / i.kcal, i.name).toBeLessThan(0.25)
      expect(i.protein + i.carbs + i.fat + i.fiber, i.name).toBeLessThanOrEqual(101)
      i.season?.forEach((m) => expect(m >= 1 && m <= 12, i.name).toBe(true))
    }
  })
  it('hat eindeutige Namen', () => {
    expect(new Set(INGREDIENT_LIST.map((i) => i.name)).size).toBe(INGREDIENT_LIST.length)
  })
})

describe('Umrechnung in Gramm', () => {
  it('nutzt zutatenspezifische und Standard-Einheiten', () => {
    expect(ingredientGrams(ing('Zwiebel', 2, 'Stück'))).toBe(160)
    expect(ingredientGrams(ing('Olivenöl', 1, 'EL'))).toBe(10)
    expect(ingredientGrams(ing('Knoblauch', 2, 'Zehe'))).toBe(8)
    expect(ingredientGrams(ing('Kartoffeln', 1, 'kg'))).toBe(1000)
    expect(ingredientGrams(ing('Kichererbsen', 1, 'Dose'))).toBe(240)
    expect(ingredientGrams(ing('Salz und Pfeffer', null, ''))).toBe(0)
    expect(ingredientGrams(ing('Unbekannt', 1, 'g'))).toBeNull()
    expect(ingredientGrams(ing('Zwiebel', 1, 'Dose'))).toBeNull()
  })
  it('meldet nicht auflösbare Zutaten', () => {
    expect(unresolvedIngredients([ing('Zwiebel', 1, 'Stück'), ing('Drachenfrucht', 1, 'Stück')])).toEqual(['Drachenfrucht (Stück)'])
  })
})

describe('Nährwerte pro Portion', () => {
  it('summiert und rundet', () => {
    const list = [ing('Haferflocken', 100, 'g'), ing('Milch 1,5 %', 200, 'ml')]
    const t = totalNutrition(list)
    expect(t.kcal).toBeCloseTo(372 + 94)
    const p = nutritionPerServing(list, 2)
    expect(p).toEqual({ kcal: 235, protein: 10, carbs: 34, fat: 5, fiber: 5 })
  })
})

describe('Ernährungsform und Tags', () => {
  it('erkennt vegetarisch, vegan, glutenfrei und tierisches Lab', () => {
    expect(dietInfo([ing('Tofu (natur)', 200, 'g'), ing('Reis', 100, 'g')])).toEqual({ vegetarian: true, vegan: true, glutenFree: true, animalRennet: false })
    expect(dietInfo([ing('Eier', 2, 'Stück'), ing('Vollkornbrot', 1, 'Scheibe')])).toMatchObject({ vegetarian: true, vegan: false, glutenFree: false })
    expect(dietInfo([ing('Hähnchenbrust', 200, 'g')])).toMatchObject({ vegetarian: false, vegan: false })
    expect(dietInfo([ing('Honig', 1, 'TL')]).vegan).toBe(false)
    expect(dietInfo([ing('Parmesan', 20, 'g')])).toMatchObject({ vegetarian: true, vegan: false, animalRennet: true })
  })
  it('leitet Tags aus Nährwerten ab und ersetzt handgepflegte', () => {
    const diet = { vegetarian: true, vegan: false, glutenFree: false, animalRennet: false }
    const tags = deriveTags({ time_min: 10, tags: ['meal-prep', 'vegan'] }, { kcal: 300, protein: 30, carbs: 10, fat: 12, fiber: 9 }, diet)
    expect(tags).toEqual(['vegetarisch', 'proteinreich', 'low-carb', 'ballaststoffreich', 'schnell', 'meal-prep'])
  })
  it('zählt Wartezeit bei „schnell“ mit', () => {
    const diet = { vegetarian: true, vegan: true, glutenFree: true, animalRennet: false }
    const n = { kcal: 300, protein: 8, carbs: 40, fat: 10, fiber: 3 }
    expect(deriveTags({ time_min: 10, rest_min: 120 }, n, diet)).not.toContain('schnell')
    expect(getRecipe('chia-pudding-mango')!.tags).not.toContain('schnell')
  })
})

describe('Rezepte', () => {
  it('lassen sich vollständig berechnen', () => {
    for (const r of RECIPES) {
      expect(unresolvedIngredients(r.ingredients), r.id).toEqual([])
      expect(r.nutrition.kcal, r.id).toBeGreaterThanOrEqual(40)
      expect(r.nutrition.kcal, r.id).toBeLessThanOrEqual(950)
    }
  })
  it('kennzeichnen Ernährungsformen korrekt', () => {
    expect(getRecipe('linsensuppe')!.tags).toContain('vegan')
    expect(getRecipe('ofenlachs-kartoffeln')!.tags).not.toContain('vegetarisch')
    expect(getRecipe('ofenlachs-kartoffeln')!.tags).toContain('glutenfrei')
    expect(getRecipe('spaghetti-tomatensauce')!.diet.animalRennet).toBe(true)
    for (const r of RECIPES) if (r.tags.includes('vegan')) expect(r.tags, r.id).toContain('vegetarisch')
  })
})
