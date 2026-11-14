import { describe, expect, it } from 'vitest'
import type { RawRecipe, RecipeIngredient } from '../types'
import {
  FEW_INGREDIENTS_MAX,
  KCAL_HEARTY_FROM,
  KCAL_LIGHT_MAX,
  MEAT_MUCH_FROM,
  RECIPES,
  buildRecipe,
  filterRecipes,
  matchesKcal,
  matchesMeat,
  pickRandom,
  recipeFacts,
  sortRecipes,
} from './recipes'

const ing = (name: string, amount: number | null, unit = 'g'): RecipeIngredient => ({ name, amount, unit, category: 'sonstiges' })

function recipe(id: string, ingredients: RecipeIngredient[], extra: Partial<RawRecipe> = {}) {
  return buildRecipe({
    id,
    title: id,
    chapter: 'vegetarisch',
    meal: ['dinner'],
    time_min: 20,
    servings: 2,
    tags: [],
    ingredients,
    steps: ['Kochen.'],
    ...extra,
  } as RawRecipe)
}

const veggie = recipe('gemuesepfanne', [ing('Paprika', 2, 'Stück'), ing('Zwiebel', 1, 'Stück'), ing('Reis', 150), ing('Olivenöl', 1, 'EL'), ing('Salz', null)])
const carbonara = recipe('schinkennudeln', [ing('Spaghetti', 200), ing('Kochschinken (mager)', 100), ing('Zwiebel', 1, 'Stück'), ing('Salz', null)], { time_min: 15 })
const chicken = recipe('haehnchenpfanne', [ing('Hähnchenbrust', 300), ing('Paprika', 2, 'Stück'), ing('Reis', 150), ing('Olivenöl', 1, 'EL')], { time_min: 25 })
const salmon = recipe('ofenlachs', [ing('Lachsfilet', 2, 'Stück'), ing('Reis', 150)], { time_min: 10, rest_min: 30 })
const ALL = [veggie, carbonara, chicken, salmon]
const ids = (list: { id: string }[]) => list.map((r) => r.id)

describe('Kennzahlen eines Rezepts', () => {
  it('rechnet Fleisch und Fisch pro Portion aus den Zutaten', () => {
    expect(recipeFacts(veggie)).toMatchObject({ hasMeat: false, hasFish: false, meat: 0, fish: 0 })
    expect(recipeFacts(carbonara)).toMatchObject({ hasMeat: true, meat: 50, fish: 0 })
    expect(recipeFacts(chicken)).toMatchObject({ hasMeat: true, meat: 150, fish: 0 })
    // 2 Stück Lachsfilet zu je 125 g auf 2 Portionen
    expect(recipeFacts(salmon)).toMatchObject({ hasMeat: false, hasFish: true, meat: 0, fish: 125 })
    // Fleisch ohne Mengenangabe („Speck nach Belieben“) zählt trotzdem als Fleisch
    const pinch = recipe('mit-speck', [ing('Paprika', 2, 'Stück'), ing('Frühstücksspeck', null)])
    expect(recipeFacts(pinch)).toMatchObject({ hasMeat: true, meat: 0 })
    expect(matchesMeat(pinch, 'none')).toBe(false)
    expect(matchesMeat(pinch, 'little')).toBe(true)
  })

  it('zählt Zutaten ohne Grundvorrat und rechnet Wartezeit zur Gesamtzeit', () => {
    // Paprika, Zwiebel, Reis – Olivenöl und Salz zählen nicht
    expect(recipeFacts(veggie).ingredients).toBe(3)
    expect(recipeFacts(chicken).ingredients).toBe(3)
    expect(recipeFacts(salmon)).toMatchObject({ ingredients: 2, totalTime: 40 })
    expect(recipeFacts(veggie).totalTime).toBe(20)
  })
})

describe('Filter im Kochbuch', () => {
  it('Fleisch & Fisch: ohne, wenig, viel, mit Fisch', () => {
    expect(ids(filterRecipes(ALL, { meat: 'none' }))).toEqual(['gemuesepfanne'])
    expect(ids(filterRecipes(ALL, { meat: 'little' }))).toEqual(['schinkennudeln'])
    expect(ids(filterRecipes(ALL, { meat: 'much' }))).toEqual(['haehnchenpfanne'])
    expect(ids(filterRecipes(ALL, { meat: 'fish' }))).toEqual(['ofenlachs'])
    // die Grenze selbst zählt als „viel“
    const edge = recipe('grenzfall', [ing('Hähnchenbrust', MEAT_MUCH_FROM * 2)])
    expect(matchesMeat(edge, 'much')).toBe(true)
    expect(matchesMeat(edge, 'little')).toBe(false)
  })

  it('Fertig in: Wartezeit zählt mit – anders als bei der reinen Zubereitungszeit', () => {
    expect(ids(filterRecipes(ALL, { maxTotalTime: 15 }))).toEqual(['schinkennudeln'])
    expect(ids(filterRecipes(ALL, { maxTotalTime: 30 }))).toEqual(['gemuesepfanne', 'schinkennudeln', 'haehnchenpfanne'])
    expect(ids(filterRecipes(ALL, { maxTime: 15 }))).toEqual(['schinkennudeln', 'ofenlachs'])
  })

  it('Kalorien in drei Stufen ohne Lücke und ohne Überschneidung', () => {
    for (const r of RECIPES) {
      const hits = (['light', 'medium', 'hearty'] as const).filter((k) => matchesKcal(r, k))
      expect(hits, r.title).toHaveLength(1)
    }
    expect(matchesKcal({ ...veggie, nutrition: { ...veggie.nutrition, kcal: KCAL_LIGHT_MAX } }, 'light')).toBe(true)
    expect(matchesKcal({ ...veggie, nutrition: { ...veggie.nutrition, kcal: KCAL_HEARTY_FROM } }, 'hearty')).toBe(true)
  })

  it('Wenige Zutaten und mehrere Eigenschaften zugleich', () => {
    expect(ids(filterRecipes(ALL, { maxIngredients: 2 }))).toEqual(['ofenlachs'])
    expect(ids(filterRecipes(ALL, { tags: ['vegetarisch'] }))).toEqual(['gemuesepfanne'])
    expect(filterRecipes(ALL, { tags: ['vegetarisch', 'proteinreich'] })).toEqual([])
    expect(ids(filterRecipes(ALL, { tags: [] }))).toEqual(ids(ALL))
  })

  it('kombiniert alles mit „und“', () => {
    expect(ids(filterRecipes(ALL, { meat: 'much', maxTotalTime: 30, maxIngredients: 3 }))).toEqual(['haehnchenpfanne'])
    expect(filterRecipes(ALL, { meat: 'much', maxTotalTime: 15 })).toEqual([])
  })
})

describe('Sortierung und Zufallsvorschlag', () => {
  it('sortiert nach „schnell fertig“ und nach wenigen Zutaten', () => {
    expect(ids(sortRecipes(ALL, 'zeit'))).toEqual(['schinkennudeln', 'gemuesepfanne', 'haehnchenpfanne', 'ofenlachs'])
    expect(ids(sortRecipes(ALL, 'zutaten'))).toEqual(['ofenlachs', 'schinkennudeln', 'gemuesepfanne', 'haehnchenpfanne'])
  })

  it('schlägt zufällig vor – möglichst nicht dasselbe Rezept noch einmal', () => {
    expect(pickRandom([], null)).toBeUndefined()
    expect(pickRandom([veggie], 'gemuesepfanne')?.id).toBe('gemuesepfanne')
    expect(pickRandom(ALL, null, () => 0)?.id).toBe('gemuesepfanne')
    expect(pickRandom(ALL, null, () => 0.999)?.id).toBe('ofenlachs')
    expect(pickRandom(ALL, 'gemuesepfanne', () => 0)?.id).toBe('schinkennudeln')
    for (let i = 0; i < 20; i++) expect(pickRandom(ALL, 'ofenlachs')?.id).not.toBe('ofenlachs')
  })
})

describe('Kochbuch: Die Filter teilen die Rezepte sinnvoll auf', () => {
  it('jedes Rezept ist ohne, mit wenig oder mit viel Fleisch – oder ein Fischgericht', () => {
    const count = (m: 'none' | 'little' | 'much' | 'fish') => RECIPES.filter((r) => matchesMeat(r, m)).length
    for (const r of RECIPES) {
      const { hasMeat, hasFish } = recipeFacts(r)
      const classes = (['none', 'little', 'much'] as const).filter((m) => matchesMeat(r, m))
      // Fischgerichte ohne Fleisch gehören nur zu „Mit Fisch“
      expect(classes.length, r.title).toBe(!hasMeat && hasFish ? 0 : 1)
      // „Vegetarisch“ im Filter heißt dasselbe wie die Kennzeichnung am Rezept
      expect(matchesMeat(r, 'none'), r.title).toBe(r.diet.vegetarian)
    }
    expect(count('none')).toBeGreaterThan(250)
    expect(count('little')).toBeGreaterThanOrEqual(15)
    expect(count('much')).toBeGreaterThanOrEqual(40)
    expect(count('fish')).toBeGreaterThanOrEqual(30)
  })

  it('bietet für jede Zeit-Stufe und für „wenige Zutaten“ eine brauchbare Auswahl', () => {
    expect(filterRecipes(RECIPES, { maxTotalTime: 15 }).length).toBeGreaterThan(60)
    expect(filterRecipes(RECIPES, { maxTotalTime: 30 }).length).toBeGreaterThan(200)
    const few = filterRecipes(RECIPES, { maxIngredients: FEW_INGREDIENTS_MAX }).length
    expect(few).toBeGreaterThan(100)
    expect(few).toBeLessThan(RECIPES.length * 0.6)
  })
})
