import { describe, expect, it } from 'vitest'
import { parseDecimal, fmtInt, fmt1 } from './format'
import { rescaleEntry, groupByMeal, totalsByDate } from './log'
import { toPer100 } from './customFood'
import { detectVeggies } from './veggies'
import { normalizeOffProduct } from './openFoodFacts'
import { matches, applyOrder } from '../data/store'
import { rangeISO, weekStartISO, weekDaysISO } from './dates'
import type { LogEntry } from '../types'

const entry = (p: Partial<LogEntry>): LogEntry => ({
  id: Math.random().toString(),
  date: '2026-11-09',
  meal: 'lunch',
  name: 'x',
  amount: 100,
  unit: 'g',
  grams: 100,
  kcal: 100,
  protein: 10,
  carbs: 10,
  fat: 1,
  food_id: null,
  dish_id: null,
  recipe_id: null,
  veggies: [],
  ...p,
})

describe('Format', () => {
  it('formatiert deutsch', () => {
    expect(fmtInt(2150)).toBe('2.150')
    expect(fmt1(12.55)).toBe('12,6')
  })
  it('parst Komma und Punkt', () => {
    expect(parseDecimal('1,5')).toBe(1.5)
    expect(parseDecimal('1.5')).toBe(1.5)
    expect(parseDecimal('1.234,5')).toBe(1234.5)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
  })
})

describe('Protokoll', () => {
  it('skaliert Einträge proportional', () => {
    expect(rescaleEntry(entry({}), 50)).toEqual({ amount: 50, grams: 50, kcal: 50, protein: 5, carbs: 5, fat: 0.5 })
  })
  it('gruppiert nach Mahlzeit und Datum', () => {
    const list = [entry({ meal: 'breakfast' }), entry({ meal: 'snack', date: '2026-11-10' })]
    expect(groupByMeal(list).breakfast).toHaveLength(1)
    expect(groupByMeal(list).dinner).toHaveLength(0)
    expect(totalsByDate(list).get('2026-11-10')?.kcal).toBe(100)
  })
})

describe('Eigene Lebensmittel', () => {
  it('rechnet Portionsangaben auf 100 g um', () => {
    expect(toPer100({ kcal: 150, protein: 5, carbs: 20, fat: 5 }, 'serving', 50)).toEqual({ kcal: 300, protein: 10, carbs: 40, fat: 10 })
    expect(toPer100({ kcal: 150, protein: 5, carbs: 20, fat: 5 }, 'serving', null)).toBeNull()
  })
})

describe('Gemüse-Erkennung', () => {
  it('findet Gemüsesorten im Text', () => {
    expect(detectVeggies('Tomaten-Paprika-Sauce')).toEqual(['Paprika', 'Tomate'])
    expect(detectVeggies('Vollmilch')).toEqual([])
    expect(detectVeggies('Möhren', 'Brokkoli')).toEqual(['Brokkoli', 'Karotte'])
  })
})

describe('Open Food Facts', () => {
  it('normalisiert Produkte', () => {
    expect(
      normalizeOffProduct({
        code: '123',
        product_name: 'Joghurt',
        brands: 'Marke A, Marke B',
        serving_quantity: '150',
        nutriments: { 'energy-kcal_100g': 61.4, proteins_100g: 3.5, carbohydrates_100g: 4.7, fat_100g: 3.2 },
      }),
    ).toMatchObject({ name: 'Joghurt', brand: 'Marke A', kcal_100: 61, serving_g: 150, barcode: '123' })
  })
  it('rechnet kJ um und verwirft unvollständige Produkte', () => {
    expect(normalizeOffProduct({ product_name: 'X', nutriments: { energy_100g: 418.4 } })?.kcal_100).toBe(100)
    expect(normalizeOffProduct({ product_name: 'X', nutriments: {} })).toBeNull()
    expect(normalizeOffProduct({ nutriments: { 'energy-kcal_100g': 1 } })).toBeNull()
  })
})

describe('Lokaler Speicher – Abfragen', () => {
  it('filtert und sortiert', () => {
    const rows = [
      { id: 'a', date: '2026-11-01', n: 2 },
      { id: 'b', date: '2026-11-05', n: 1 },
      { id: 'c', date: '2026-11-09', n: 3 },
    ]
    expect(rows.filter((r) => matches(r, { gte: { date: '2026-11-02' }, lte: { date: '2026-11-09' } })).map((r) => r.id)).toEqual(['b', 'c'])
    expect(applyOrder(rows, [{ column: 'n', ascending: false }]).map((r) => r.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('Datumsfunktionen', () => {
  it('liefert Wochen und Bereiche', () => {
    expect(weekStartISO('2026-11-12')).toBe('2026-11-09')
    expect(weekDaysISO('2026-11-09')).toHaveLength(7)
    expect(weekDaysISO('2026-11-09')[6]).toBe('2026-11-15')
    expect(rangeISO('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })
})
