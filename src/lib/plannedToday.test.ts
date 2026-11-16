import { describe, expect, it } from 'vitest'
import type { LogEntry, PlanItem } from '../types'
import { canLogDirectly, openPlanItems, planItemEntry } from './plannedToday'

const plan = (o: Partial<PlanItem> = {}): PlanItem => ({
  id: 'p1',
  date: '2026-11-16',
  meal: 'lunch',
  kind: 'recipe',
  recipe_id: 'linsen-dal',
  dish_id: null,
  title: 'Linsen-Dal',
  servings: 2,
  kcal: 901,
  protein: 40.04,
  carbs: 120,
  fat: 20,
  ...o,
})
const entry = (o: Partial<LogEntry> = {}): LogEntry => ({
  id: 'e1',
  date: '2026-11-16',
  meal: 'lunch',
  name: 'Linsen-Dal',
  amount: 1,
  unit: 'serving',
  grams: null,
  food_id: null,
  dish_id: null,
  recipe_id: 'linsen-dal',
  veggies: [],
  kcal: 450,
  protein: 20,
  carbs: 60,
  fat: 10,
  ...o,
})

describe('Geplantes auf der Tagesseite', () => {
  it('blendet Eingetragenes aus – je Mahlzeit, Rezept, Gericht oder Name', () => {
    expect(openPlanItems([plan()], [entry()])).toEqual([])
    // andere Mahlzeit zählt nicht
    expect(openPlanItems([plan()], [entry({ meal: 'dinner' })])).toHaveLength(1)
    // eigenes Gericht über die ID, freier Text über den Namen (Groß/klein egal)
    expect(openPlanItems([plan({ kind: 'dish', recipe_id: null, dish_id: 'd1', title: 'Omas Suppe' })], [entry({ recipe_id: null, dish_id: 'd1' })])).toEqual([])
    expect(openPlanItems([plan({ kind: 'text', recipe_id: null, title: 'Essen bei Oma' })], [entry({ recipe_id: null, name: 'essen bei oma ' })])).toEqual([])
  })

  it('zählt jeden Eintrag nur einmal', () => {
    const twice = [plan({ id: 'p1' }), plan({ id: 'p2' })]
    expect(openPlanItems(twice, [entry()]).map((p) => p.id)).toEqual(['p2'])
    expect(openPlanItems(twice, [entry({ id: 'e1' }), entry({ id: 'e2' })])).toEqual([])
  })

  it('trägt mit den geplanten Portionen und Nährwerten ein', () => {
    expect(planItemEntry(plan(), ['Linsen'])).toEqual({
      date: '2026-11-16',
      meal: 'lunch',
      name: 'Linsen-Dal',
      amount: 2,
      unit: 'serving',
      grams: null,
      kcal: 901,
      protein: 40,
      carbs: 120,
      fat: 20,
      food_id: null,
      dish_id: null,
      recipe_id: 'linsen-dal',
      veggies: ['Linsen'],
    })
    expect(canLogDirectly(plan())).toBe(true)
    expect(canLogDirectly(plan({ kind: 'text', recipe_id: null, kcal: 0 }))).toBe(false)
  })
})
