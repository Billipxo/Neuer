import { describe, expect, it } from 'vitest'
import type { PlanItem, Recipe } from '../types'
import { decodePlan, encodePlan, planItemsFromShared, planLink, targetWeek, weekPlanShareText, weekPlanText } from './planShare'

const DAYS = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']

const item = (over: Partial<PlanItem>): PlanItem => ({
  id: 'x',
  date: DAYS[0],
  meal: 'dinner',
  kind: 'text',
  recipe_id: null,
  dish_id: null,
  title: 'Linsensuppe',
  servings: 1,
  kcal: 480,
  protein: 22,
  carbs: 60,
  fat: 12,
  ...over,
})

const ITEMS: PlanItem[] = [
  item({ meal: 'dinner', title: 'Linsensuppe' }),
  item({ meal: 'breakfast', kind: 'recipe', recipe_id: 'overnight-oats', title: 'Overnight Oats', kcal: 350 }),
  item({ date: DAYS[2], meal: 'lunch', kind: 'recipe', recipe_id: 'eigene-variante-uuid', title: 'Bolognese „light“ für Jörg', servings: 2.5, kcal: 961.4, protein: 55.5, carbs: 120.2, fat: 20.6 }),
  item({ date: DAYS[6], meal: 'snack', kind: 'dish', dish_id: 'd1', title: 'Müsli', kcal: 250 }),
  item({ date: '2026-11-30', title: 'Andere Woche' }),
]

const oats = { id: 'overnight-oats', title: 'Overnight Oats (Kochbuch)', nutrition: { kcal: 360, protein: 15, carbs: 50, fat: 9, fiber: 6 } } as unknown as Recipe
const getRecipe = (id: string) => (id === 'overnight-oats' ? oats : undefined)
const isCookbook = (id: string) => id === 'overnight-oats'

describe('Wochenplan als Text', () => {
  it('listet die Tage mit Einträgen in der Reihenfolge der Mahlzeiten', () => {
    expect(weekPlanText(ITEMS, DAYS)).toBe(
      [
        '🍽️ Wochenplan',
        '',
        'Montag, 16. November:',
        '• Frühstück: Overnight Oats',
        '• Abendessen: Linsensuppe',
        '',
        'Mittwoch, 18. November:',
        '• Mittagessen: Bolognese „light“ für Jörg (2,5 Portionen)',
        '',
        'Sonntag, 22. November:',
        '• Snacks: Müsli',
      ].join('\n'),
    )
  })

  it('hängt den Link zum Übernehmen an', () => {
    const link = planLink('https://teller.example/', 'abc')
    expect(link).toBe('https://teller.example/planer?plan=abc')
    expect(weekPlanShareText(ITEMS, DAYS, link).endsWith('In Teller übernehmen:\nhttps://teller.example/planer?plan=abc')).toBe(true)
  })
})

describe('Wochenplan als Link', () => {
  const token = encodePlan(ITEMS, DAYS, isCookbook)

  it('passt in eine Adresse', () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    // eine volle Woche mit vier Mahlzeiten am Tag bleibt handlich
    const full = DAYS.flatMap((d) => (['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => item({ date: d, meal, kind: 'recipe', recipe_id: 'overnight-oats' })))
    expect(encodePlan(full, DAYS, isCookbook).length).toBeLessThan(1200)
  })

  it('überträgt Kochbuch-Rezepte als Kennung, alles andere mit Titel und Nährwerten', () => {
    const plan = decodePlan(token)!
    expect(plan.weekStart).toBe('2026-11-16')
    expect(plan.items).toEqual([
      { day: 0, meal: 'dinner', servings: 1, title: 'Linsensuppe', kcal: 480, protein: 22, carbs: 60, fat: 12 },
      { day: 0, meal: 'breakfast', servings: 1, recipeId: 'overnight-oats' },
      // eigene Variante: Das andere Konto kennt sie nicht – sie reist als Text mit gerundeten Werten
      { day: 2, meal: 'lunch', servings: 2.5, title: 'Bolognese „light“ für Jörg', kcal: 961, protein: 56, carbs: 120, fat: 21 },
      { day: 6, meal: 'snack', servings: 1, title: 'Müsli', kcal: 250, protein: 22, carbs: 60, fat: 12 },
    ])
  })

  it('setzt den Plan in die Zielwoche um und nimmt Rezepte aus dem eigenen Kochbuch', () => {
    const { items, skipped } = planItemsFromShared(decodePlan(token)!, '2026-11-23', getRecipe)
    expect(skipped).toBe(0)
    expect(items.map((i) => [i.date, i.meal, i.kind, i.title])).toEqual([
      ['2026-11-23', 'dinner', 'text', 'Linsensuppe'],
      ['2026-11-23', 'breakfast', 'recipe', 'Overnight Oats (Kochbuch)'],
      ['2026-11-25', 'lunch', 'text', 'Bolognese „light“ für Jörg'],
      ['2026-11-29', 'snack', 'text', 'Müsli'],
    ])
    expect(items[1]).toMatchObject({ recipe_id: 'overnight-oats', kcal: 360, servings: 1 })
    expect(items[2]).toMatchObject({ recipe_id: null, dish_id: null, servings: 2.5, kcal: 961 })
  })

  it('lässt Rezepte aus, die das eigene Kochbuch nicht kennt', () => {
    const { items, skipped } = planItemsFromShared(decodePlan(token)!, '2026-11-16', () => undefined)
    expect(skipped).toBe(1)
    expect(items).toHaveLength(3)
  })

  it('fügt in die Woche des Plans ein – liegt sie zurück, in die laufende', () => {
    const plan = decodePlan(token)!
    expect(targetWeek(plan, '2026-11-13')).toBe('2026-11-16')
    expect(targetWeek(plan, '2026-11-18')).toBe('2026-11-16')
    expect(targetWeek(plan, '2026-12-03')).toBe('2026-11-30')
  })

  it('weist alles zurück, was kein gültiger Plan ist', () => {
    const enc = (data: unknown) => Buffer.from(JSON.stringify(data)).toString('base64url')
    expect(decodePlan('kein-plan')).toBeNull()
    expect(decodePlan('')).toBeNull()
    expect(decodePlan(enc([1, 2]))).toBeNull()
    expect(decodePlan(enc({ v: 2, w: '2026-11-16', i: [] }))).toBeNull()
    expect(decodePlan(enc({ v: 1, w: 'morgen', i: [] }))).toBeNull()
    expect(decodePlan(enc({ v: 1, w: '2026-11-16', i: [[7, 0, 1, 'x']] }))).toBeNull()
    expect(decodePlan(enc({ v: 1, w: '2026-11-16', i: [[0, 4, 1, 'x']] }))).toBeNull()
    expect(decodePlan(enc({ v: 1, w: '2026-11-16', i: [[0, 0, 0, 'x']] }))).toBeNull()
    expect(decodePlan(enc({ v: 1, w: '2026-11-16', i: [[0, 0, 1, 'x', -5, 0, 0, 0]] }))).toBeNull()
    expect(decodePlan(enc({ v: 1, w: '2026-11-16', i: [[0, 0, 1, 'x'.repeat(200)]] }))).toBeNull()
    expect(decodePlan(enc({ v: 1, w: '2026-11-16', i: Array.from({ length: 81 }, () => [0, 0, 1, 'x']) }))).toBeNull()
    // ein leerer Plan ist gültig, aber eben leer
    expect(decodePlan(enc({ v: 1, w: '2026-11-18', i: [] }))).toEqual({ weekStart: '2026-11-16', items: [] })
  })
})
