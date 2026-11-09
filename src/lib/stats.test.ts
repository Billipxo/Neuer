import { describe, expect, it } from 'vitest'
import { dailySeries, periodStats, waterSeries, weightSeries } from './stats'
import type { LogEntry } from '../types'

const e = (date: string, kcal: number): LogEntry => ({
  id: Math.random().toString(36), date, meal: 'lunch', name: 'x', amount: 1, unit: 'serving', grams: null,
  kcal, protein: 10, carbs: 20, fat: 5, food_id: null, dish_id: null, recipe_id: null, veggies: [],
})
const days = ['2026-11-09', '2026-11-10', '2026-11-11']

describe('Auswertung', () => {
  it('erstellt Tageswerte inkl. leerer Tage', () => {
    const s = dailySeries([e('2026-11-09', 1000), e('2026-11-09', 900), e('2026-11-11', 2500)], days)
    expect(s.map((d) => d.kcal)).toEqual([1900, 0, 2500])
    expect(s.map((d) => d.logged)).toEqual([true, false, true])
    expect(s[0].label).toBe('Mo')
  })
  it('mittelt nur über protokollierte Tage', () => {
    const s = dailySeries([e('2026-11-09', 1900), e('2026-11-11', 2500)], days)
    const st = periodStats(s, 2000)
    expect(st.loggedDays).toBe(2)
    expect(st.avg.kcal).toBe(2200)
    expect(st.daysInTarget).toBe(1)
  })
  it('summiert Wasser und filtert Gewicht', () => {
    expect(waterSeries([{ id: '1', date: '2026-11-10', ml: 250 }, { id: '2', date: '2026-11-10', ml: 500 }], days).map((d) => d.ml)).toEqual([0, 750, 0])
    expect(
      weightSeries(
        [
          { id: 'a', date: '2026-11-12', kg: 80 },
          { id: 'b', date: '2026-11-09', kg: 81 },
          { id: 'c', date: '2026-10-01', kg: 85 },
        ],
        '2026-11-01',
        '2026-11-30',
      ),
    ).toEqual([
      { date: '2026-11-09', label: '9.11.', kg: 81 },
      { date: '2026-11-12', label: '12.11.', kg: 80 },
    ])
  })
})
