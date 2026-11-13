import { describe, expect, it } from 'vitest'
import { basicFoodFromIngredient, basicFoodHint, findStoredBasic, searchBasicFoods } from './basicFoods'
import { INGREDIENTS } from '../data/ingredients'
import type { Food } from '../types'
import { amountToGrams, nutrientsForFoodAmount } from './nutrition'

describe('Grundnahrungsmittel beim Erfassen', () => {
  it('findet Zutaten sofort und mit passenden Maßen', () => {
    const hits = searchBasicFoods('apf')
    expect(hits[0].info.name).toBe('Apfel')
    expect(hits[0].food).toMatchObject({ source: 'custom', kcal_100: 54, piece_g: 150, tbsp_g: null, barcode: null })
    expect(basicFoodHint(hits[0].info)).toBe('1 Stück ≈ 150 g')
    const oil = searchBasicFoods('olivenol')[0]
    expect(oil.info.name).toBe('Olivenöl')
    expect(oil.food).toMatchObject({ tbsp_g: 10, tsp_g: 4, piece_g: null })
    expect(basicFoodHint(oil.info)).toBe('1 EL ≈ 10 g')
    expect(basicFoodHint(INGREDIENTS.get('Magerquark')!)).toBe('Grundnahrungsmittel')
    expect(searchBasicFoods('a')).toEqual([])
    // Salz stört nur, Scheiben zählen als Stück
    expect(searchBasicFoods('salz').map((h) => h.info.name)).not.toContain('Salz')
    expect(basicFoodFromIngredient(INGREDIENTS.get('Vollkornbrot')!).piece_g).toBe(50)
  })

  it('rechnet Löffel und Stück in Gramm und Nährwerte um', () => {
    const oil = { ...basicFoodFromIngredient(INGREDIENTS.get('Olivenöl')!), id: 'oil' } as Food
    expect(amountToGrams(1, 'tbsp', oil)).toBe(10)
    expect(amountToGrams(2, 'tsp', oil)).toBe(8)
    expect(nutrientsForFoodAmount(oil, 1, 'tbsp')!.kcal).toBeCloseTo(90, 0)
    expect(amountToGrams(1, 'tbsp', { ...oil, tbsp_g: null })).toBeNull()
    const apfel = { ...basicFoodFromIngredient(INGREDIENTS.get('Apfel')!), id: 'a' } as Food
    expect(amountToGrams(2, 'piece', apfel)).toBe(300)
    expect(nutrientsForFoodAmount(apfel, 1, 'piece')!.kcal).toBeCloseTo(81, 0)
  })

  it('erkennt schon gespeicherte Grundnahrungsmittel', () => {
    const stored = { ...basicFoodFromIngredient(INGREDIENTS.get('Apfel')!), id: '1' } as Food
    expect(findStoredBasic([stored], 'apfel')?.id).toBe('1')
    expect(findStoredBasic([{ ...stored, barcode: '123' }], 'Apfel')).toBeUndefined()
    expect(findStoredBasic([{ ...stored, source: 'off' }], 'Apfel')).toBeUndefined()
  })
})
