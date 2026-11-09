import { describe, expect, it } from 'vitest'
import {
  amountToGrams,
  dishPerServing,
  isBalancedDay,
  isWithinTarget,
  macroGrams,
  macroShares,
  mifflinStJeor,
  motivationLine,
  nutrientsForFoodAmount,
  nutrientsForGrams,
  progress,
  suggestKcalTarget,
  sumNutrients,
  totalEnergyExpenditure,
} from './nutrition'
import type { Food } from '../types'

const food: Food = {
  id: '1',
  name: 'Haferflocken',
  brand: null,
  barcode: null,
  source: 'custom',
  kcal_100: 370,
  protein_100: 13.5,
  carbs_100: 58.7,
  fat_100: 7,
  serving_g: 40,
  piece_g: null,
  image_url: null,
  is_favorite: false,
  last_used_at: null,
  use_count: 0,
}

describe('Mifflin-St Jeor', () => {
  it('berechnet den Grundumsatz für Männer', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(mifflinStJeor({ sex: 'male', age: 30, height_cm: 180, weight_kg: 80 })).toBe(1780)
  })
  it('berechnet den Grundumsatz für Frauen', () => {
    // 10*65 + 6.25*168 - 5*40 - 161 = 1339
    expect(mifflinStJeor({ sex: 'female', age: 40, height_cm: 168, weight_kg: 65 })).toBe(1339)
  })
  it('multipliziert mit dem Aktivitätsfaktor', () => {
    expect(totalEnergyExpenditure({ sex: 'male', age: 30, height_cm: 180, weight_kg: 80 }, 'moderate')).toBeCloseTo(2759)
  })
  it('rundet den Vorschlag auf 10 kcal und berücksichtigt den Zu-/Abschlag', () => {
    const body = { sex: 'male' as const, age: 30, height_cm: 180, weight_kg: 80 }
    expect(suggestKcalTarget(body, 'moderate', 0)).toBe(2760)
    expect(suggestKcalTarget(body, 'moderate', -500)).toBe(2260)
    expect(suggestKcalTarget(body, 'sedentary', -5000)).toBe(0)
  })
})

describe('Makros', () => {
  it('rechnet Prozent in Gramm um', () => {
    expect(macroGrams(2000, { protein: 25, carbs: 45, fat: 30 })).toEqual({ protein: 125, carbs: 225, fat: 67 })
  })
  it('berechnet die Energieanteile', () => {
    const s = macroShares({ kcal: 0, protein: 25, carbs: 50, fat: 0 })
    expect(s.protein).toBeCloseTo(33.33, 1)
    expect(s.carbs).toBeCloseTo(66.67, 1)
    expect(macroShares({ kcal: 0, protein: 0, carbs: 0, fat: 0 })).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })
})

describe('Mengen', () => {
  it('rechnet Nährwerte für Gramm um', () => {
    expect(nutrientsForGrams({ kcal: 200, protein: 10, carbs: 20, fat: 5 }, 50)).toEqual({ kcal: 100, protein: 5, carbs: 10, fat: 2.5 })
  })
  it('unterstützt Portionen und Stück', () => {
    expect(amountToGrams(2, 'serving', food)).toBe(80)
    expect(amountToGrams(1, 'piece', food)).toBeNull()
    expect(amountToGrams(1, 'piece', { ...food, piece_g: 60 })).toBe(60)
    expect(amountToGrams(0, 'g', food)).toBe(0)
    expect(nutrientsForFoodAmount(food, 1, 'serving')?.kcal).toBeCloseTo(148)
  })
  it('summiert Nährwerte', () => {
    expect(sumNutrients([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
    expect(sumNutrients([{ kcal: 1, protein: 2, carbs: 3, fat: 4 }, { kcal: 1, protein: 1, carbs: 1, fat: 1 }])).toEqual({ kcal: 2, protein: 3, carbs: 4, fat: 5 })
  })
  it('berechnet Gerichte pro Portion', () => {
    const n = dishPerServing({
      servings: 2,
      ingredients: [
        { food_id: null, name: 'A', grams: 200, kcal_100: 100, protein_100: 10, carbs_100: 0, fat_100: 0 },
        { food_id: null, name: 'B', grams: 100, kcal_100: 50, protein_100: 0, carbs_100: 10, fat_100: 0 },
      ],
    })
    expect(n).toEqual({ kcal: 125, protein: 10, carbs: 5, fat: 0 })
  })
})

describe('Fortschritt und Ziele', () => {
  it('berechnet Rest und Verhältnis', () => {
    expect(progress(500, 2000)).toEqual({ consumed: 500, target: 2000, remaining: 1500, ratio: 0.25 })
    expect(progress(500, 0).ratio).toBe(0)
  })
  it('prüft ±10 % um das Ziel', () => {
    expect(isWithinTarget(1800, 2000)).toBe(true)
    expect(isWithinTarget(2200, 2000)).toBe(true)
    expect(isWithinTarget(1799, 2000)).toBe(false)
    expect(isWithinTarget(100, 0)).toBe(false)
  })
  it('erkennt ausgewogene Tage', () => {
    const pct = { protein: 25, carbs: 45, fat: 30 }
    // 125 g P (500), 225 g KH (900), 67 g F (603) ≈ 2003 kcal
    expect(isBalancedDay({ kcal: 2003, protein: 125, carbs: 225, fat: 67 }, 2000, pct)).toBe(true)
    expect(isBalancedDay({ kcal: 2000, protein: 20, carbs: 450, fat: 22 }, 2000, pct)).toBe(false)
    expect(isBalancedDay({ kcal: 1000, protein: 62, carbs: 112, fat: 33 }, 2000, pct)).toBe(false)
  })
  it('liefert sachliche Motivationszeilen', () => {
    expect(motivationLine(progress(0, 2000), 0)).toMatch(/erste Mahlzeit/)
    expect(motivationLine(progress(2000, 2000), 3)).toMatch(/im Bereich/)
    expect(motivationLine(progress(2600, 2000), 3)).toMatch(/völlig okay/)
  })
})
