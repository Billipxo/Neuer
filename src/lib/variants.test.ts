import { describe, expect, it } from 'vitest'
import { getRecipe } from './recipes'
import { INGREDIENTS } from '../data/ingredients'
import {
  SWAP_RULES,
  swapSuggestions,
  customIngredient,
  customKindOf,
  draftFromRecipe,
  draftProblems,
  emptyDraft,
  formatDiff,
  ingredientCategory,
  ingredientFromTable,
  ingredientKcal,
  nutritionDiff,
  searchIngredients,
  suggestChapter,
  swapIngredient,
  unitOptions,
  variantToRecipe,
} from './variants'

const bolo = getRecipe('spaghetti-bolognese')!

describe('Rezept abwandeln', () => {
  it('übernimmt Zutaten, Schritte und Portionen des Originals', () => {
    const d = draftFromRecipe(bolo)
    expect(d.base_recipe_id).toBe('spaghetti-bolognese')
    expect(d.title).toContain('Spaghetti Bolognese')
    expect(d.ingredients).toEqual(bolo.ingredients)
    expect(d.steps).toEqual(bolo.steps)
    expect(d.servings).toBe(bolo.servings)
    // Kopie, nicht dieselben Objekte
    expect(d.ingredients[0]).not.toBe(bolo.ingredients[0])
  })

  it('berechnet die Nährwerte der Variante neu', () => {
    const d = draftFromRecipe(bolo)
    const hack = d.ingredients.find((i) => i.name === 'Rinderhack (mager)')!
    hack.amount = hack.amount! / 2
    const v = variantToRecipe({ ...d, id: 'v1' }, bolo)
    expect(v.nutrition.kcal).toBeLessThan(bolo.nutrition.kcal)
    expect(v.nutrition.protein).toBeLessThan(bolo.nutrition.protein)
    expect(v.tags).toContain('variante')
    expect(v.tags).not.toContain('klassiker')
    expect(v.chapter).toBe('pasta')
    expect(v.tips).toEqual(bolo.tips)
    const diff = nutritionDiff(v, bolo)
    expect(diff.kcal).toBeLessThan(0)
    expect(formatDiff(diff)[0]).toMatch(/^−\d+ kcal$/)
  })

  it('kennzeichnet eine Variante ohne Fleisch als vegetarisch', () => {
    const d = draftFromRecipe(bolo)
    d.ingredients = d.ingredients.filter((i) => i.name !== 'Rinderhack (mager)')
    d.ingredients.push(ingredientFromTable({ ...searchIngredients('Tellerlinsen')[0] }))
    const v = variantToRecipe({ ...d, id: 'v2' }, bolo)
    expect(v.diet.vegetarian).toBe(true)
    expect(v.tags).toContain('vegetarisch')
  })

  it('rechnet eigene Zutaten mit eigenen Nährwerten', () => {
    const d = emptyDraft()
    d.title = 'Mein Brot'
    d.servings = 2
    d.steps = ['Alles verrühren und 10 Minuten backen.']
    d.ingredients = [customIngredient({ name: 'Eiweißbrot (Bäcker)', kcal: 250, protein: 20, carbs: 10, fat: 12, kind: 'plant', glutenFree: false })]
    d.ingredients[0].amount = 200
    const v = variantToRecipe({ ...d, id: 'v3' }, undefined)
    expect(v.nutrition.kcal).toBe(250)
    expect(v.nutrition.protein).toBe(20)
    expect(v.diet.vegan).toBe(true)
    expect(v.diet.glutenFree).toBe(false)
    expect(v.tags).toContain('eigen')
    expect(draftProblems(d)).toEqual([])
  })

  it('kennzeichnet eigene Zutaten mit Fleisch oder Milch', () => {
    const meat = customIngredient({ name: 'Bratwurst vom Metzger', kcal: 280, protein: 13, carbs: 1, fat: 25, kind: 'meat', glutenFree: true, unit_g: 80 })
    expect(meat.unit).toBe('Stück')
    expect(meat.amount).toBe(1)
    expect(ingredientKcal(meat)).toBe(224)
    expect(customKindOf(meat.custom!.flags)).toMatchObject({ kind: 'meat', glutenFree: true, extra: [] })
    const d = { ...emptyDraft(), title: 'Wurst', steps: ['Braten, 10 Minuten.'], ingredients: [meat] }
    expect(suggestChapter(d.ingredients)).toBe('fleisch')
    expect(variantToRecipe({ ...d, id: 'v4' }, undefined).diet.vegetarian).toBe(false)
    const dairy = customIngredient({ name: 'Schmand', kcal: 240, protein: 3, carbs: 3, fat: 24, kind: 'dairy_egg', glutenFree: true })
    expect(customKindOf(dairy.custom!.flags)).toMatchObject({ kind: 'dairy_egg', glutenFree: true })
    const nussmus = customIngredient({ name: 'Mandelmus', kcal: 620, protein: 25, carbs: 5, fat: 55, kind: 'plant', glutenFree: true, extra: ['nuts'] })
    expect(nussmus.custom!.flags).toBe('N')
    expect(customKindOf(nussmus.custom!.flags).extra).toEqual(['nuts'])
    const mitNuss = variantToRecipe({ ...emptyDraft(), title: 'Mus', steps: ['Rühren.'], ingredients: [{ ...nussmus, amount: 50 }], id: 'v6' }, undefined)
    expect(mitNuss.diet.allergens).toEqual(['nuts'])
    expect(unitOptions(dairy)).toEqual(['g', 'ml', 'EL', 'TL'])
  })

  it('tauscht Zutaten und behält passende Mengen', () => {
    const sahne = { name: 'Sahne', amount: 100, unit: 'ml', category: 'milch' as const }
    const kochsahne = ingredientFromTable(searchIngredients('Kochsahne')[0])
    expect(swapIngredient(sahne, kochsahne)).toMatchObject({ name: 'Kochsahne 15 %', amount: 100, unit: 'ml' })
    const zwiebel = { name: 'Zwiebel', amount: 1, unit: 'Stück', category: 'obst_gemuese' as const }
    const lauch = ingredientFromTable(searchIngredients('Lauch')[0])
    expect(swapIngredient(zwiebel, lauch)).toMatchObject({ name: 'Lauch', amount: 1, unit: 'Stück' })
    const oel = ingredientFromTable(searchIngredients('Olivenöl')[0])
    // Stück passt nicht zu Öl → Standardmenge der neuen Zutat
    expect(swapIngredient(zwiebel, oel)).toMatchObject({ name: 'Olivenöl', amount: 1, unit: 'EL' })
  })

  it('findet Zutaten in der Nährwerttabelle', () => {
    expect(searchIngredients('zwieb')[0].name).toBe('Zwiebel')
    expect(searchIngredients('Kase').map((i) => i.name)).toContain('Bergkäse')
    expect(searchIngredients('')).toEqual([])
    expect(unitOptions({ name: 'Zwiebel' })[0]).toBe('Stück')
    expect(unitOptions({ name: 'Olivenöl' })).toEqual(['EL', 'TL', 'g', 'ml'])
    expect(ingredientCategory('Zwiebel')).toBe('obst_gemuese')
    expect(ingredientCategory('Parmesan')).toBe('milch')
    expect(ingredientCategory('Unbekanntes Zeug')).toBe('sonstiges')
  })

  it('nennt fehlende Angaben', () => {
    const problems = draftProblems(emptyDraft())
    expect(problems.join(' ')).toMatch(/Titel/)
    expect(problems.join(' ')).toMatch(/Zutat/)
    expect(problems.join(' ')).toMatch(/schritt/i)
    const d = { ...emptyDraft(), title: 'x', steps: ['ok'], ingredients: [{ name: 'Mondstaub', amount: 10, unit: 'g', category: 'sonstiges' as const }] }
    expect(draftProblems(d).join(' ')).toMatch(/Nicht berechenbar: Mondstaub/)
  })

  it('übernimmt bei Backofen-Rezepten mit Heißluft-Variante die gewählte Zubereitungsart', () => {
    const lachs = getRecipe('ofenlachs-kartoffeln')!
    expect(lachs.airfryer?.steps).toBeDefined()
    const af = draftFromRecipe(lachs, 'airfryer')
    expect(af.steps).toEqual(lachs.airfryer!.steps)
    expect(af.airfryer).toEqual({ temp_c: lachs.airfryer!.temp_c, time_min: lachs.airfryer!.time_min })
    const oven = draftFromRecipe(lachs, 'oven')
    expect(oven.steps).toEqual(lachs.steps)
    expect(oven.airfryer).toBeNull()
    expect(variantToRecipe({ ...af, id: 'v5' }, lachs).tags).toContain('heissluftfritteuse')
  })

  it('schlägt leichtere oder vollwertigere Alternativen vor', () => {
    for (const r of SWAP_RULES) {
      expect(INGREDIENTS.has(r.from), r.from).toBe(true)
      expect(INGREDIENTS.has(r.to), r.to).toBe(true)
    }
    const gratin = swapSuggestions(draftFromRecipe(getRecipe('kartoffelgratin')!))
    const sahne = gratin.find((x) => x.from.name === 'Sahne')!
    expect(sahne.to).toMatchObject({ name: 'Kochsahne 15 %', amount: 100, unit: 'ml' })
    expect(sahne.kcalDelta).toBeLessThan(0)
    // größte Ersparnis zuerst
    for (let i = 1; i < gratin.length; i++) expect(gratin[i].kcalDelta).toBeGreaterThanOrEqual(gratin[i - 1].kcalDelta)
    const bolognese = swapSuggestions(draftFromRecipe(bolo), 10)
    const linsen = bolognese.find((x) => x.to.name === 'Tellerlinsen')!
    expect(linsen.to).toMatchObject({ amount: 160, unit: 'g' })
    expect(linsen.kcalDelta).toBeLessThan(0)
    // Vollkornspaghetti sind schon drin → kein Vorschlag dafür
    expect(bolognese.some((x) => x.to.name === 'Vollkornspaghetti')).toBe(false)
    expect(swapSuggestions(emptyDraft())).toEqual([])
  })
})
