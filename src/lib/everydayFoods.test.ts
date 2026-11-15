import { describe, expect, it } from 'vitest'
import { EVERYDAY_FOODS } from '../data/everydayFoods'
import { INGREDIENT_LIST } from '../data/ingredients'
import type { Food } from '../types'
import { everydayFoodToNew, everydayHint, searchQuickFoods, suggestFoods } from './basicFoods'
import { nutrientsForFoodAmount } from './nutrition'

describe('Alltägliches: Werte und Mengen', () => {
  it('hat stimmige Nährwerte: Energie passt zu Eiweiß, Kohlenhydraten, Fett und Alkohol', () => {
    for (const f of EVERYDAY_FOODS) {
      const fromMacros = f.protein * 4 + f.carbs * 4 + f.fat * 9 + f.alcohol * 7
      expect(Math.abs(f.kcal - fromMacros), `${f.name}: ${f.kcal} kcal, aus den Makros ${fromMacros.toFixed(1)}`).toBeLessThanOrEqual(Math.max(12, f.kcal * 0.12))
      expect(f.protein + f.carbs + f.fat + f.alcohol, f.name).toBeLessThanOrEqual(100)
      for (const v of [f.kcal, f.protein, f.carbs, f.fat, f.alcohol]) expect(v, f.name).toBeGreaterThanOrEqual(0)
    }
  })

  it('kennt für alles eine typische Menge', () => {
    for (const f of EVERYDAY_FOODS) {
      const grams = f.piece ?? f.portion
      expect(grams, f.name).toBeGreaterThan(0)
      expect(grams!, f.name).toBeLessThanOrEqual(600)
      expect(f.measure.trim(), f.name).not.toBe('')
      if (f.alcohol > 0) expect(f.liquid, `${f.name}: Alkohol nur bei Getränken`).toBe(true)
    }
  })

  it('hat eindeutige Namen – auch gegenüber den Grundnahrungsmitteln', () => {
    const names = EVERYDAY_FOODS.map((f) => f.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    const table = new Set(INGREDIENT_LIST.map((i) => i.name.toLowerCase()))
    for (const n of names) expect(table.has(n), n).toBe(false)
  })

  it('deckt den Alltag ab: Backwaren, Imbiss, Süßes und Getränke', () => {
    expect(EVERYDAY_FOODS.length).toBeGreaterThanOrEqual(140)
    expect(EVERYDAY_FOODS.filter((f) => f.liquid).length).toBeGreaterThanOrEqual(25)
  })
})

describe('Sofort-Suche beim Erfassen', () => {
  const first = (q: string) => searchQuickFoods(q)[0]

  it('findet Gerichte mit typischer Menge und kcal für diese Menge', () => {
    const doener = first('Döner')
    expect(doener).toMatchObject({ name: 'Döner Kebab', subtitle: '1 Döner ≈ 350 g', kcal: 753, kcalLabel: 'kcal', typicalGrams: 350, typicalLabel: '1 Döner' })
    expect(doener.food).toMatchObject({ source: 'custom', barcode: null, kcal_100: 215, serving_g: 350, piece_g: null })
    const eaten = nutrientsForFoodAmount({ ...doener.food, id: 'd' } as Food, 1, 'serving')!
    expect(eaten.kcal).toBeCloseTo(752.5, 1)
  })

  it('versteht regionale Namen, Umlaute und ß', () => {
    expect(first('Semmel').name).toBe('Brötchen')
    expect(first('schrippe').food.piece_g).toBe(60)
    expect(first('breze').name).toBe('Laugenbrezel')
    expect(first('Bulette').name).toBe('Frikadelle')
    expect(first('Fleischkäse').name).toBe('Leberkäse')
    expect(searchQuickFoods('weiss').map((h) => h.name)).toEqual(expect.arrayContaining(['Weißbier', 'Weißwein', 'Weißwurst']))
    expect(first('broetchen').name).toBe('Brötchen')
    expect(first('Doener').name).toBe('Döner Kebab')
    expect(first('Muesli').name).toBe('Müsli')
  })

  it('stellt genaue Treffer nach vorn – auch über beide Listen hinweg', () => {
    expect(first('Apfel')).toMatchObject({ name: 'Apfel', subtitle: '1 Stück ≈ 150 g', kcal: 81, kcalLabel: 'kcal' })
    expect(first('Bier')).toMatchObject({ name: 'Bier', subtitle: '1 Flasche (0,5 l)', kcal: 210, typicalLabel: '1 Flasche' })
    expect(first('Cola')).toMatchObject({ name: 'Cola', subtitle: '1 Dose = 330 ml', kcal: 139 })
    expect(searchQuickFoods('Kaffee').slice(0, 2).map((h) => h.name)).toEqual(['Kaffee (schwarz)', 'Kaffee mit Milch'])
    expect(searchQuickFoods('pizza').map((h) => h.name)).toEqual(expect.arrayContaining(['Pizza Margherita', 'Pizza Salami']))
  })

  it('zeigt Grundnahrungsmittel ohne Stückmaß pro 100 g und lässt Salz weg', () => {
    expect(first('Magerquark')).toMatchObject({ subtitle: 'Grundnahrungsmittel', kcalLabel: 'kcal/100 g', typicalGrams: null })
    expect(first('Olivenöl')).toMatchObject({ subtitle: '1 EL ≈ 10 g', kcalLabel: 'kcal', typicalLabel: '1 EL' })
    expect(searchQuickFoods('salz').map((h) => h.name)).not.toContain('Salz')
    expect(searchQuickFoods('salz').map((h) => h.name)).toContain('Salzstangen')
    expect(searchQuickFoods('a')).toEqual([])
    expect(searchQuickFoods('xyzq')).toEqual([])
  })

  it('beschreibt Mengen verständlich', () => {
    const byName = (n: string) => EVERYDAY_FOODS.find((f) => f.name === n)!
    expect(everydayHint(byName('Speiseeis'))).toBe('1 Kugel ≈ 50 g')
    expect(everydayHint(byName('Cappuccino'))).toBe('1 Tasse = 200 ml')
    expect(everydayHint(byName('Rotwein'))).toBe('1 Glas (0,2 l)')
    expect(everydayFoodToNew(byName('Speiseeis'))).toMatchObject({ piece_g: 50, serving_g: null })
  })
})

describe('Vorschläge zu frei eingetippten Namen', () => {
  it('nimmt den ganzen Namen, sonst die einzelnen Wörter ohne Füllwörter', () => {
    expect(suggestFoods('Cappuccino')[0].name).toBe('Cappuccino')
    expect(suggestFoods('Döner beim Imbiss')[0].name).toBe('Döner Kebab')
    expect(suggestFoods('Pizza vom Italiener').map((h) => h.name)).toEqual(expect.arrayContaining(['Pizza Margherita']))
    expect(suggestFoods('Omas Apfelkuchen')[0].name).toBe('Apfelkuchen')
    expect(suggestFoods('mit und vom')).toEqual([])
    expect(suggestFoods('')).toEqual([])
    // jeder Treffer nur einmal, höchstens so viele wie verlangt
    const hits = suggestFoods('Kaffee mit Kuchen', 3)
    expect(hits).toHaveLength(3)
    expect(new Set(hits.map((h) => h.key)).size).toBe(3)
  })
})
