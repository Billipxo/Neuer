import { describe, expect, it } from 'vitest'
import { isSuggestible, mulberry32, servingsFor, suggestWeek, weekSummary, dayTotals, recipePlanItem } from './planner'
import { RECIPES, getRecipe } from './recipes'
import { weekDaysISO } from './dates'
import type { PlanItem } from '../types'

const days = weekDaysISO('2026-11-09')
const macros = { protein: 25, carbs: 45, fat: 30 }
const asItem = (p: Omit<PlanItem, 'id'>, id = Math.random().toString(36)): PlanItem => ({ id, ...p })

describe('Wochenvorschlag', () => {
  it('füllt Frühstück, Mittag und Abend an allen Tagen', () => {
    const res = suggestWeek({ recipes: RECIPES, days, kcalTarget: 2000, macros, existing: [], random: mulberry32(1) })
    for (const d of days) {
      for (const m of ['breakfast', 'lunch', 'dinner']) {
        expect(res.filter((i) => i.date === d && i.meal === m)).toHaveLength(1)
      }
    }
    // jedes vorgeschlagene Rezept passt zur Mahlzeit
    res.forEach((i) => expect(getRecipe(i.recipe_id)!.meal).toContain(i.meal))
  })
  it('bleibt im Schnitt in der Nähe des Tagesziels', () => {
    for (const target of [1600, 2000, 2600]) {
      const res = suggestWeek({ recipes: RECIPES, days, kcalTarget: target, macros, existing: [], random: mulberry32(7) })
      const avg = res.reduce((s, i) => s + i.kcal, 0) / 7
      expect(Math.abs(avg - target) / target).toBeLessThan(0.2)
    }
  })
  it('vermeidet Wiederholungen bei Hauptmahlzeiten, solange genug Rezepte da sind', () => {
    const res = suggestWeek({ recipes: RECIPES, days, kcalTarget: 2000, macros, existing: [], random: mulberry32(3), includeSnacks: false })
    const lunchDinner = res.filter((i) => i.meal !== 'breakfast').map((i) => i.recipe_id)
    expect(new Set(lunchDinner).size).toBe(lunchDinner.length)
  })
  it('lässt belegte Slots unverändert', () => {
    const existing = [asItem({ ...recipePlanItem(getRecipe('shakshuka')!, days[0], 'breakfast', 1) })]
    const res = suggestWeek({ recipes: RECIPES, days, kcalTarget: 2000, macros, existing, random: mulberry32(5) })
    expect(res.filter((i) => i.date === days[0] && i.meal === 'breakfast')).toHaveLength(0)
    expect(res.some((i) => i.recipe_id === 'shakshuka')).toBe(false)
  })
  it('ist mit gleichem Seed reproduzierbar', () => {
    // Keine Grundrezepte und keine Kuchen oder Kekse, die man nur im Ganzen backt
    for (let seed = 1; seed <= 5; seed++) {
      const res = suggestWeek({ recipes: RECIPES, days, kcalTarget: 2000, macros, existing: [], random: mulberry32(seed) })
      res.forEach((i) => expect(isSuggestible(getRecipe(i.recipe_id)!), i.recipe_id ?? '').toBe(true))
    }
    expect(isSuggestible(getRecipe('marmorkuchen')!)).toBe(false)
    expect(isSuggestible(getRecipe('kraeuterbutter')!)).toBe(false)
    const a = suggestWeek({ recipes: RECIPES, days, kcalTarget: 2000, macros, existing: [], random: mulberry32(42) })
    const b = suggestWeek({ recipes: RECIPES, days, kcalTarget: 2000, macros, existing: [], random: mulberry32(42) })
    expect(a).toEqual(b)
  })
})

describe('Portionen und Summen', () => {
  it('wählt Portionen in 0,5er-Schritten zwischen 1 und 2', () => {
    expect(servingsFor(700, 450)).toBe(1.5)
    expect(servingsFor(200, 450)).toBe(1)
    expect(servingsFor(2000, 450)).toBe(2)
  })
  it('berechnet Tages- und Wochensummen', () => {
    const items = [
      asItem({ ...recipePlanItem(getRecipe('shakshuka')!, days[0], 'breakfast', 1) }),
      asItem({ ...recipePlanItem(getRecipe('shakshuka')!, days[0], 'lunch', 2) }),
      asItem({ ...recipePlanItem(getRecipe('linsensuppe')!, days[2], 'dinner', 1) }),
    ]
    const shak = getRecipe('shakshuka')!.nutrition.kcal
    const suppe = getRecipe('linsensuppe')!.nutrition.kcal
    expect(dayTotals(items, days[0]).kcal).toBe(shak * 3)
    const s = weekSummary(items, days)
    expect(s.total.kcal).toBe(shak * 3 + suppe)
    expect(s.plannedDays).toBe(2)
    expect(s.avgPerPlannedDay.kcal).toBe((shak * 3 + suppe) / 2)
  })
})

describe('Wochenvorschlag mit Heißluftfritteuse', () => {
  it('wählt mit Vorliebe mehr Heißluftfritteusen-Rezepte', () => {
    let withPref = 0
    let without = 0
    for (let seed = 1; seed <= 10; seed++) {
      const base = { recipes: RECIPES, days, kcalTarget: 2000, macros, existing: [] }
      withPref += suggestWeek({ ...base, preferAirfryer: true, random: mulberry32(seed) }).filter((i) => getRecipe(i.recipe_id)?.airfryer).length
      without += suggestWeek({ ...base, random: mulberry32(seed) }).filter((i) => getRecipe(i.recipe_id)?.airfryer).length
    }
    expect(withPref).toBeGreaterThan(without)
  })
})

describe('Wochenvorschlag mit Ernährungsweise und Saison', () => {
  it('nutzt nur vegetarische Rezepte, wenn so vorgefiltert', async () => {
    const { matchesDiet } = await import('./recipes')
    const veg = RECIPES.filter((r) => matchesDiet(r, 'vegetarian'))
    const res = suggestWeek({ recipes: veg, days, kcalTarget: 2000, macros, existing: [], random: mulberry32(9) })
    expect(res.length).toBeGreaterThanOrEqual(21)
    res.forEach((i) => expect(getRecipe(i.recipe_id)!.diet.vegetarian).toBe(true))
    const vegan = RECIPES.filter((r) => matchesDiet(r, 'vegan'))
    suggestWeek({ recipes: vegan, days, kcalTarget: 2000, macros, existing: [], random: mulberry32(9) }).forEach((i) =>
      expect(getRecipe(i.recipe_id)!.diet.vegan).toBe(true),
    )
  })
  it('bevorzugt im November leicht saisonale Rezepte', async () => {
    const { seasonScore } = await import('./season')
    let withSeason = 0
    let without = 0
    for (let seed = 1; seed <= 10; seed++) {
      const base = { recipes: RECIPES, days, kcalTarget: 2000, macros, existing: [] }
      withSeason += suggestWeek({ ...base, month: 11, random: mulberry32(seed) }).reduce((s, i) => s + Math.max(0, seasonScore(getRecipe(i.recipe_id)!, 11).score), 0)
      without += suggestWeek({ ...base, random: mulberry32(seed) }).reduce((s, i) => s + Math.max(0, seasonScore(getRecipe(i.recipe_id)!, 11).score), 0)
    }
    expect(withSeason).toBeGreaterThan(without)
  })
})
