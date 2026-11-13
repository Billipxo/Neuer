import { describe, expect, it } from 'vitest'
import { ingredientsFromPlan } from './planShopping'
import { recipePlanItem } from './planner'
import { getRecipe } from './recipes'
import type { Dish, PlanItem } from '../types'

const asItem = (p: Omit<PlanItem, 'id'>): PlanItem => ({ id: Math.random().toString(36), ...p })

describe('Einkaufsliste aus dem Wochenplan', () => {
  it('fasst Zutaten mehrerer Rezepte zusammen und skaliert nach Portionen', () => {
    const shak = getRecipe('shakshuka')! // 2 Portionen: 4 Eier, 1 Zwiebel
    const frit = getRecipe('ofen-frittata')! // 4 Portionen: 8 Eier, 1 Zwiebel
    const items = [
      asItem(recipePlanItem(shak, '2026-11-09', 'breakfast', 1)),
      asItem(recipePlanItem(shak, '2026-11-10', 'breakfast', 1)),
      asItem(recipePlanItem(frit, '2026-11-11', 'dinner', 2)),
    ]
    const res = ingredientsFromPlan(items, [])
    expect(res.find((i) => i.name === 'Eier')).toEqual({ name: 'Eier', amount: 2 + 2 + 4, unit: 'Stück', category: 'milch' })
    expect(res.find((i) => i.name === 'Zwiebel')?.amount).toBe(0.5 + 0.5 + 0.5)
    // keine doppelten Einträge
    const keys = res.map((i) => `${i.name}|${i.unit}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('berücksichtigt eigene Gerichte und ignoriert Freitext', () => {
    const dish: Dish = {
      id: 'd1',
      name: 'Müsli',
      servings: 2,
      is_favorite: false,
      last_used_at: null,
      ingredients: [
        { food_id: null, name: 'Haferflocken', grams: 100, kcal_100: 370, protein_100: 13, carbs_100: 59, fat_100: 7 },
        { food_id: null, name: 'Banane', grams: 120, kcal_100: 90, protein_100: 1, carbs_100: 20, fat_100: 0 },
      ],
    }
    const items: PlanItem[] = [
      asItem({ date: '2026-11-09', meal: 'breakfast', kind: 'dish', dish_id: 'd1', recipe_id: null, title: 'Müsli', servings: 1, kcal: 0, protein: 0, carbs: 0, fat: 0 }),
      asItem({ date: '2026-11-09', meal: 'lunch', kind: 'text', dish_id: null, recipe_id: null, title: 'Kantine', servings: 1, kcal: 600, protein: 0, carbs: 0, fat: 0 }),
    ]
    expect(ingredientsFromPlan(items, [dish])).toEqual([
      { name: 'Haferflocken', amount: 50, unit: 'g', category: 'vorrat' },
      { name: 'Banane', amount: 60, unit: 'g', category: 'obst_gemuese' },
    ])
  })
})
