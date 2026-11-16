import { describe, expect, it } from 'vitest'
import type { LogEntry, MealType } from '../types'
import { fmtShare, periodInsights } from './insights'

let id = 0
function entry(date: string, meal: MealType, name: string, kcal: number, macros: [number, number, number] = [0, 0, 0]): LogEntry {
  const [protein, carbs, fat] = macros
  return { id: `e${++id}`, date, meal, name, amount: 1, unit: 'serving', grams: null, food_id: null, dish_id: null, recipe_id: null, veggies: [], kcal, protein, carbs, fat }
}

// 2026-11-09 ist ein Montag, 2026-11-15 ein Sonntag
const WEEK: LogEntry[] = [
  entry('2026-11-09', 'breakfast', 'Brötchen', 160, [5, 31, 1]),
  entry('2026-11-09', 'breakfast', 'Cappuccino', 80, [4, 6, 4]),
  entry('2026-11-09', 'lunch', 'Döner Kebab', 750, [42, 74, 33]),
  entry('2026-11-10', 'breakfast', ' brötchen ', 160, [5, 31, 1]),
  entry('2026-11-10', 'breakfast', 'Cappuccino', 80, [4, 6, 4]),
  entry('2026-11-10', 'dinner', 'Spaghetti Bolognese', 600, [28, 72, 22]),
  entry('2026-11-15', 'snack', 'Cappuccino', 80, [4, 6, 4]),
  entry('2026-11-15', 'snack', 'Wasser', 0),
]

describe('Einblicke in einen Zeitraum', () => {
  const ins = periodInsights(WEEK)

  it('fasst gleiche Lebensmittel zusammen und sortiert nach kcal bzw. Häufigkeit', () => {
    expect(ins.entries).toBe(8)
    expect(ins.totalKcal).toBe(1910)
    expect(ins.byKcal.map((f) => [f.name, f.count, f.kcal])).toEqual([
      ['Döner Kebab', 1, 750],
      ['Spaghetti Bolognese', 1, 600],
      ['Brötchen', 2, 320],
      ['Cappuccino', 3, 240],
    ])
    expect(ins.byKcal[0].share).toBeCloseTo(750 / 1910, 5)
    // Häufigkeit: auch Einträge ohne kcal zählen mit
    expect(ins.byCount.map((f) => f.name)).toEqual(['Cappuccino', 'Brötchen', 'Döner Kebab', 'Spaghetti Bolognese', 'Wasser'])
    expect(periodInsights(WEEK, 2).byCount).toHaveLength(2)
  })

  it('verteilt die kcal auf die Mahlzeiten – in der üblichen Reihenfolge', () => {
    expect(ins.meals.map((m) => [m.meal, m.kcal])).toEqual([
      ['breakfast', 480],
      ['lunch', 750],
      ['dinner', 600],
      ['snack', 80],
    ])
    expect(ins.meals.reduce((s, m) => s + m.share, 0)).toBeCloseTo(1, 10)
  })

  it('mittelt je Wochentag nur über Tage mit Einträgen', () => {
    expect(ins.weekdays.map((w) => [w.weekday, Math.round(w.avgKcal), w.days])).toEqual([
      [0, 990, 1],
      [1, 840, 1],
      [2, 0, 0],
      [3, 0, 0],
      [4, 0, 0],
      [5, 0, 0],
      [6, 80, 1],
    ])
    const twoMondays = periodInsights([entry('2026-11-02', 'lunch', 'Suppe', 400), entry('2026-11-09', 'lunch', 'Suppe', 600)])
    expect(twoMondays.weekdays[0]).toMatchObject({ avgKcal: 500, days: 2 })
  })

  it('berechnet die Anteile der Energie aus Eiweiß, Kohlenhydraten und Fett', () => {
    const { energy } = ins
    expect(energy).not.toBeNull()
    expect(energy!.protein + energy!.carbs + energy!.fat).toBeCloseTo(1, 10)
    const one = periodInsights([entry('2026-11-09', 'lunch', 'Test', 170, [10, 10, 10])]).energy!
    expect(one.protein).toBeCloseTo(40 / 170, 5)
    expect(one.fat).toBeCloseTo(90 / 170, 5)
    expect(periodInsights([entry('2026-11-09', 'lunch', 'Nur kcal', 300)]).energy).toBeNull()
  })

  it('kommt ohne Einträge aus', () => {
    const empty = periodInsights([])
    expect(empty).toMatchObject({ entries: 0, totalKcal: 0, byKcal: [], byCount: [], energy: null })
    expect(empty.meals.every((m) => m.share === 0)).toBe(true)
  })

  it('schreibt Anteile verständlich', () => {
    expect(fmtShare(0.234)).toBe('23 %')
    expect(fmtShare(0.003)).toBe('< 1 %')
    expect(fmtShare(0)).toBe('0 %')
    expect(fmtShare(1)).toBe('100 %')
  })
})
