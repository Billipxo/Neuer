import { describe, expect, it } from 'vitest'
import { filterRecipes, recommendRecipes, RECIPES, roundAmount, scaleIngredients, recipeVeggies, getRecipe } from './recipes'
import { CATEGORY_ORDER } from './shopping'
import { MEAL_TYPES } from '../types'

describe('Rezept-Datensatz', () => {
  it('enthält mindestens 150 vollständige Rezepte', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(150)
    for (const r of RECIPES) {
      expect(r.title).toBeTruthy()
      expect(r.servings).toBeGreaterThan(0)
      expect(r.ingredients.length).toBeGreaterThan(0)
      expect(r.steps.length).toBeGreaterThan(0)
      expect(r.meal.length).toBeGreaterThan(0)
      r.meal.forEach((m) => expect(MEAL_TYPES).toContain(m))
      r.ingredients.forEach((i) => expect(CATEGORY_ORDER).toContain(i.category))
      expect(r.tips?.length, r.id).toBeGreaterThan(0)
      // Schritte sind ausformuliert (keine Stichworte)
      r.steps.forEach((s) => expect(s.length, r.id).toBeGreaterThan(12))
      const { kcal, protein, carbs, fat } = r.nutrition
      // Makros sollten grob zu den kcal passen (±20 %)
      const fromMacros = protein * 4 + carbs * 4 + fat * 9
      expect(Math.abs(fromMacros - kcal) / kcal).toBeLessThan(0.2)
    }
  })
  it('hat eindeutige IDs', () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length)
  })
  it('deckt alle Mahlzeitenarten ab', () => {
    for (const m of MEAL_TYPES) expect(RECIPES.filter((r) => r.meal.includes(m)).length).toBeGreaterThanOrEqual(5)
  })
})

describe('Filter', () => {
  it('filtert nach Mahlzeit, kcal, Zeit und Stichwort', () => {
    const res = filterRecipes(RECIPES, { meal: 'breakfast', maxKcal: 400, maxTime: 10 })
    expect(res.length).toBeGreaterThan(0)
    res.forEach((r) => {
      expect(r.meal).toContain('breakfast')
      expect(r.nutrition.kcal).toBeLessThanOrEqual(400)
      expect(r.time_min).toBeLessThanOrEqual(10)
    })
    expect(filterRecipes(RECIPES, { keyword: 'lachs' }).map((r) => r.id)).toContain('ofenlachs-kartoffeln')
    expect(filterRecipes(RECIPES, { keyword: 'kurbis' }).map((r) => r.id)).toContain('kuerbissuppe-ingwer')
    expect(filterRecipes(RECIPES, { keyword: 'gibtesnicht' })).toHaveLength(0)
  })
})

describe('Empfehlungen', () => {
  it('liefert nur Rezepte innerhalb des Restbudgets', () => {
    const res = recommendRecipes(RECIPES, { remainingKcal: 500, meal: 'dinner', openMeals: 1 })
    expect(res.length).toBeGreaterThan(0)
    res.forEach((r) => expect(r.nutrition.kcal).toBeLessThanOrEqual(500))
    // das erste ist am nächsten an 500
    const diffs = res.map((r) => Math.abs(r.nutrition.kcal - 500))
    expect(diffs[0]).toBe(Math.min(...diffs))
  })
  it('liefert nichts ohne Restbudget', () => {
    expect(recommendRecipes(RECIPES, { remainingKcal: 0, meal: 'lunch', openMeals: 2 })).toEqual([])
  })
})

describe('Skalierung', () => {
  it('skaliert Zutaten nach Portionen', () => {
    const r = getRecipe('linsen-bolognese')!
    const scaled = scaleIngredients(r, 2)
    expect(scaled.find((i) => i.name === 'Vollkornspaghetti')?.amount).toBe(160)
    expect(scaled.find((i) => i.name === 'Zwiebel')?.amount).toBe(0.5)
  })
  it('rundet sinnvoll', () => {
    expect(roundAmount(123, 'g')).toBe(125)
    expect(roundAmount(12.4, 'g')).toBe(12)
    expect(roundAmount(0.33, 'Stück')).toBe(0.25)
  })
  it('erkennt Gemüse in Rezepten', () => {
    expect(recipeVeggies(getRecipe('ofenlachs-kartoffeln')!)).toEqual(expect.arrayContaining(['Brokkoli', 'Kartoffel']))
  })
})

describe('Heißluftfritteuse', async () => {
  const { airfryerRecipes, recipeSteps, hasAirfryerVariant, isAirfryerNative, sortRecipes, proteinDensity, toggleFavorite } = await import('./recipes')

  it('hat genug Rezepte und plausible Angaben', () => {
    const af = airfryerRecipes(RECIPES)
    expect(af.length).toBeGreaterThanOrEqual(15)
    for (const r of af) {
      expect(r.tags).toContain('heissluftfritteuse')
      expect(r.airfryer!.temp_c).toBeGreaterThanOrEqual(140)
      expect(r.airfryer!.temp_c).toBeLessThanOrEqual(210)
      expect(r.airfryer!.time_min).toBeLessThanOrEqual(r.time_min + 5)
      // Schritte nennen die Temperatur
      expect(recipeSteps(r, 'airfryer').join(' ')).toMatch(/°C/)
    }
    // jedes Rezept mit Tag hat auch Angaben
    RECIPES.filter((r) => r.tags.includes('heissluftfritteuse')).forEach((r) => expect(r.airfryer).toBeDefined())
  })
  it('unterscheidet Backofen-Variante und reine Heißluftfritteusen-Rezepte', () => {
    const lachs = getRecipe('ofenlachs-kartoffeln')!
    expect(hasAirfryerVariant(lachs)).toBe(true)
    expect(recipeSteps(lachs, 'oven')).toBe(lachs.steps)
    expect(recipeSteps(lachs, 'airfryer')).not.toBe(lachs.steps)
    const pommes = getRecipe('suesskartoffel-pommes')!
    expect(isAirfryerNative(pommes)).toBe(true)
    expect(recipeSteps(pommes, 'oven')).toBe(pommes.steps)
  })
  it('sortiert nach kcal, Zeit, Eiweiß und Empfehlung', () => {
    const kcal = sortRecipes(RECIPES, 'kcal').map((r) => r.nutrition.kcal)
    expect(kcal).toEqual([...kcal].sort((a, b) => a - b))
    const zeit = sortRecipes(RECIPES, 'zeit').map((r) => r.time_min)
    expect(zeit).toEqual([...zeit].sort((a, b) => a - b))
    const prot = sortRecipes(RECIPES, 'eiweiss').map(proteinDensity)
    expect(prot).toEqual([...prot].sort((a, b) => b - a))
    const rec = sortRecipes(RECIPES, 'empfohlen', { favorites: ['linsensuppe'], preferAirfryer: true })
    expect(rec[0].id).toBe('linsensuppe')
    expect(rec[1].airfryer).toBeDefined()
    expect(sortRecipes(RECIPES, 'empfohlen').map((r) => r.id)).toEqual(RECIPES.map((r) => r.id))
  })
  it('schaltet Favoriten um', () => {
    expect(toggleFavorite(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleFavorite(['a', 'b'], 'a')).toEqual(['b'])
  })
})
