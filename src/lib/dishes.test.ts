import { describe, expect, it } from 'vitest'
import type { Dish, LogEntry, PlanItem } from '../types'
import { dishIngredientsFromEntries, ingredientAmount, suggestDishName } from './dishes'
import { quickEntry, totalsOf } from './log'
import { dishPerServing, dishTotals } from './nutrition'
import { ingredientsFromPlan } from './planShopping'
import { withoutIdentity } from './undo'

const entry = (p: Partial<LogEntry>): LogEntry => ({
  id: Math.random().toString(36), date: '2026-11-12', meal: 'breakfast', name: 'x', amount: 1, unit: 'g', grams: null,
  kcal: 0, protein: 0, carbs: 0, fat: 0, food_id: null, dish_id: null, recipe_id: null, veggies: [], ...p,
})

describe('Mahlzeit als Gericht speichern', () => {
  const entries = [
    entry({ name: 'Haferflocken', amount: 40, unit: 'g', grams: 40, kcal: 149, protein: 5.4, carbs: 23.5, fat: 2.8, food_id: 'f1' }),
    entry({ name: 'Apfel', amount: 1, unit: 'piece', grams: 150, kcal: 81, protein: 0.5, carbs: 17.1, fat: 0.3 }),
    entry({ name: 'Bolognese light', amount: 1.5, unit: 'serving', grams: null, kcal: 720, protein: 40.5, carbs: 93, fat: 15, recipe_id: 'v1' }),
  ]
  it('übernimmt Gramm-Einträge pro 100 g und alles andere als Portion', () => {
    const ing = dishIngredientsFromEntries(entries)
    expect(ing[0]).toMatchObject({ name: 'Haferflocken', grams: 40, kcal_100: 372.5, food_id: 'f1' })
    expect(ing[0].portion).toBeUndefined()
    expect(ing[1]).toMatchObject({ name: 'Apfel', grams: 150, kcal_100: 54 })
    expect(ing[2]).toMatchObject({ name: 'Bolognese light', grams: 150, kcal_100: 480, portion: true, food_id: null })
    expect(ingredientAmount(ing[2])).toEqual({ value: 1.5, unit: 'Portion' })
    expect(ingredientAmount(ing[0])).toEqual({ value: 40, unit: 'g' })
  })
  it('ergibt dieselben Nährwerte wie die Mahlzeit', () => {
    const total = dishTotals(dishIngredientsFromEntries(entries))
    const meal = totalsOf(entries)
    expect(total.kcal).toBeCloseTo(meal.kcal, 0)
    expect(total.protein).toBeCloseTo(meal.protein, 1)
    expect(total.carbs).toBeCloseTo(meal.carbs, 1)
    expect(total.fat).toBeCloseTo(meal.fat, 1)
    expect(dishPerServing({ ingredients: dishIngredientsFromEntries(entries), servings: 2 }).kcal).toBeCloseTo(meal.kcal / 2, 0)
  })
  it('schlägt einen freien Namen vor', () => {
    expect(suggestDishName('breakfast')).toBe('Mein Frühstück')
    expect(suggestDishName('breakfast', ['mein frühstück'])).toBe('Mein Frühstück 2')
    expect(suggestDishName('snack', ['Mein Snack', 'Mein Snack 2'])).toBe('Mein Snack 3')
  })
  it('setzt Portions-Zutaten als Portionen auf die Einkaufsliste', () => {
    const dish: Dish = { id: 'd1', name: 'Mein Frühstück', servings: 1, ingredients: dishIngredientsFromEntries(entries), is_favorite: false, last_used_at: null }
    const plan: PlanItem = { id: 'p', date: '2026-11-13', meal: 'breakfast', kind: 'dish', recipe_id: null, dish_id: 'd1', title: dish.name, servings: 2, kcal: 0, protein: 0, carbs: 0, fat: 0 }
    const list = ingredientsFromPlan([plan], [dish])
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Haferflocken', amount: 80, unit: 'g' }),
        expect.objectContaining({ name: 'Bolognese light', amount: 3, unit: 'Portion' }),
      ]),
    )
  })
})

describe('Schnell-Eintrag', () => {
  it('trägt nur Kalorien ein', () => {
    const e = quickEntry('2026-11-12', 'dinner', { kcal: 649.6 })
    expect(e).toMatchObject({ name: 'Schnell-Eintrag', kcal: 650, protein: 0, carbs: 0, fat: 0, amount: 1, unit: 'serving', grams: null, food_id: null })
  })
  it('übernimmt Namen, Makros und erkennt Gemüse', () => {
    const e = quickEntry('2026-11-12', 'lunch', { name: '  Döner mit Tomate ', kcal: 700, protein: 35.26, carbs: null, fat: 30 })
    expect(e).toMatchObject({ name: 'Döner mit Tomate', protein: 35.3, carbs: 0, fat: 30, meal: 'lunch' })
    expect(e.veggies).toContain('Tomate')
  })
})

describe('Rückgängig', () => {
  it('stellt Zeilen ohne ID und Besitzer wieder her – Inhalt und Zeitstempel bleiben', () => {
    const row = { id: 'abc', user_id: 'u1', created_at: '2026-11-12T08:00:00Z', name: 'Apfel', kcal: 81 }
    expect(withoutIdentity(row)).toEqual({ created_at: '2026-11-12T08:00:00Z', name: 'Apfel', kcal: 81 })
    expect(row.id).toBe('abc')
  })
})
