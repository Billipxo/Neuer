import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../types'
import { RECIPES, getRecipe } from './recipes'
import { mulberry32 } from './random'
import { MEAL_UNTIL, ideaTimeBudget, nextFreeMeal } from './mealTiming'
import { MIN_SNACK_ROOM, totalMinutes, trainingDaySnacks, trainingMealIdeas } from './trainingMeals'

describe('Zeit für Rezeptideen', () => {
  it('nimmt die nächste freie Hauptmahlzeit, die zur Uhrzeit noch passt', () => {
    expect(nextFreeMeal(['breakfast', 'lunch', 'dinner'], 8)).toBe('breakfast')
    expect(nextFreeMeal(['breakfast', 'lunch', 'dinner'], 12)).toBe('lunch')
    expect(nextFreeMeal(['lunch'], 16)).toBeUndefined()
    expect(nextFreeMeal(['dinner'], 21)).toBe('dinner')
    expect(nextFreeMeal(['dinner'], MEAL_UNTIL.dinner)).toBeUndefined()
  })
  it('wird später am Tag knapper – zwischen 20 und 60 Minuten', () => {
    expect(ideaTimeBudget('dinner', 17 * 60)).toBe(60)
    expect(ideaTimeBudget('dinner', 20 * 60 + 45)).toBe(45)
    expect(ideaTimeBudget('dinner', 21 * 60 + 30)).toBe(20)
    expect(ideaTimeBudget('breakfast', 7 * 60)).toBe(60)
    expect(ideaTimeBudget('lunch', 14 * 60)).toBe(30)
  })
})

describe('Proteinreiche Ideen passend zum Training', () => {
  it('schlägt abends nur Rezepte vor, die im Zeitbudget fertig sind', () => {
    const ideas = trainingMealIdeas(RECIPES, { meal: 'dinner', remainingKcal: 2000, openMeals: 3, maxMinutes: 30 })
    expect(ideas).toHaveLength(3)
    for (const r of ideas) {
      expect(r.tags).toContain('proteinreich')
      expect(r.meal).toContain('dinner')
      expect(totalMinutes(r), r.id).toBeLessThanOrEqual(30)
    }
  })
  it('füllt mit den schnellsten übrigen auf, wenn zu wenig schnell genug sind', () => {
    const slow = RECIPES.filter((r) => r.tags.includes('proteinreich') && r.meal.includes('dinner') && totalMinutes(r) > 30).slice(0, 5)
    const quick = RECIPES.find((r) => r.tags.includes('proteinreich') && r.meal.includes('dinner') && totalMinutes(r) <= 30)!
    const ideas = trainingMealIdeas([...slow, quick], { meal: 'dinner', remainingKcal: 2000, openMeals: 3, maxMinutes: 30 })
    expect(ideas[0]).toBe(quick)
    expect(ideas).toHaveLength(3)
    expect(totalMinutes(ideas[1])).toBeLessThanOrEqual(totalMinutes(ideas[2]))
    // nur Rezepte, die in die offenen kcal passen – ohne offene kcal keine Ideen
    for (const r of trainingMealIdeas(RECIPES, { meal: 'lunch', remainingKcal: 300, openMeals: 1, maxMinutes: 60 })) {
      expect(r.nutrition.kcal, r.id).toBeLessThanOrEqual(300)
    }
    expect(trainingMealIdeas(RECIPES, { meal: 'lunch', remainingKcal: 0, openMeals: 1, maxMinutes: 60 })).toEqual([])
  })
})

describe('Snacks für nachträglich geplantes Training', () => {
  const days = ['2026-11-23', '2026-11-25', '2026-11-27']
  it('ergänzt je Trainingstag mit Platz einen passenden Snack – an Krafttagen proteinreich', () => {
    let proteinOnStrength = 0
    for (let seed = 1; seed <= 8; seed++) {
      const res = trainingDaySnacks({
        recipes: RECIPES,
        room: { [days[0]]: 300, [days[1]]: 120, [days[2]]: 600 },
        proteinDays: [days[0]],
        existing: [],
        random: mulberry32(seed),
      })
      // zu wenig Platz am Mittwoch – dort nichts
      expect(res.map((i) => i.date)).toEqual([days[0], days[2]])
      for (const item of res) {
        const r = getRecipe(item.recipe_id)!
        expect(item.meal).toBe('snack')
        expect(r.meal).toContain('snack')
        expect(item.servings).toBe(1)
      }
      // höchstens so viel wie Platz ist (mit etwas Spielraum), große Lücken werden nicht mit Riesen-Snacks gefüllt
      expect(res[0].kcal).toBeLessThanOrEqual(330)
      expect(res[1].kcal).toBeLessThanOrEqual(440)
      if (getRecipe(res[0].recipe_id)!.tags.includes('proteinreich')) proteinOnStrength++
    }
    expect(proteinOnStrength).toBeGreaterThanOrEqual(6)
    expect(MIN_SNACK_ROOM).toBe(150)
  })
  it('wiederholt keine Snacks, die schon im Plan stehen', () => {
    const first = trainingDaySnacks({ recipes: RECIPES, room: { [days[0]]: 300 }, proteinDays: [days[0]], existing: [], random: mulberry32(3) })
    const existing = first.map((i, n) => ({ ...i, id: `p${n}` }) as PlanItem)
    const second = trainingDaySnacks({ recipes: RECIPES, room: { [days[0]]: 300 }, proteinDays: [days[0]], existing, random: mulberry32(3) })
    expect(second[0].recipe_id).not.toBe(first[0].recipe_id)
    expect(trainingDaySnacks({ recipes: [], room: { [days[0]]: 300 }, proteinDays: [], existing: [] })).toEqual([])
  })
})
