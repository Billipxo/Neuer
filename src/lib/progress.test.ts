import { describe, expect, it } from 'vitest'
import type { LogEntry, WeightLog } from '../types'
import { fmtSignedKg, goalProgress, reviewLines, weekReview, weightTrend } from './progress'
import { weekDaysISO } from './dates'

const w = (date: string, kg: number): WeightLog => ({ id: date, date, kg })
const entry = (date: string, kcal: number, recipe_id: string | null = null): LogEntry => ({
  id: Math.random().toString(36), date, meal: 'lunch', name: recipe_id ? 'Bolognese' : 'x', amount: 1, unit: 'serving', grams: null,
  kcal, protein: 100, carbs: 200, fat: 60, food_id: null, dish_id: null, recipe_id, veggies: recipe_id ? ['Tomate', 'Karotte'] : [],
})
const macros = { protein: 25, carbs: 45, fat: 30 }

describe('Gewichtstrend', () => {
  const weekly = [w('2026-11-01', 85), w('2026-11-08', 84.5), w('2026-11-15', 84), w('2026-11-22', 83.5)]
  it('glättet und berechnet die Veränderung pro Woche', () => {
    const t = weightTrend(weekly)
    expect(t.first!.kg).toBe(85)
    expect(t.latest!.kg).toBe(83.5)
    expect(t.smoothed).toBe(83.5)
    expect(t.weeklyChange).toBeCloseTo(-0.5, 2)
    expect(t.totalChange).toBeCloseTo(-1.5, 2)
    expect(weightTrend([]).latest).toBeNull()
    expect(weightTrend([w('2026-11-01', 85)]).weeklyChange).toBeNull()
    // zwei Einträge am selben Tag: der letzte zählt, Tagesschwankungen werden gemittelt
    const t2 = weightTrend([w('2026-11-20', 84.4), w('2026-11-21', 83.8), w('2026-11-22', 84.0)])
    expect(t2.smoothed).toBeCloseTo(84.07, 2)
    expect(t2.weeklyChange).toBeNull()
  })
  it('rechnet den Weg zum Ziel – ohne Versprechen', () => {
    const t = weightTrend(weekly)
    const g = goalProgress(t, 80)!
    expect(g.remaining).toBeCloseTo(3.5, 2)
    expect(g.share).toBeCloseTo(0.3, 2)
    expect(g.weeksAtTrend).toBe(7)
    expect(g.reached).toBe(false)
    expect(goalProgress(t, null)).toBeNull()
    expect(goalProgress(weightTrend([]), 80)).toBeNull()
    // Trend führt vom Ziel weg → keine Hochrechnung
    expect(goalProgress(t, 90)!.weeksAtTrend).toBeNull()
    expect(goalProgress(weightTrend([w('2026-11-22', 80.2)]), 80)!.reached).toBe(true)
    expect(fmtSignedKg(-0.46)).toBe('−0,5 kg')
    expect(fmtSignedKg(0.04)).toBe('±0 kg')
  })
})

describe('Wochenrückblick', () => {
  const days = weekDaysISO('2026-11-09')
  const base = {
    days,
    log: [entry('2026-11-09', 1900, 'bolo'), entry('2026-11-10', 2100), entry('2026-11-11', 1900, 'bolo')],
    water: [{ id: '1', date: '2026-11-09', ml: 2200 }],
    weights: [w('2026-11-07', 85), w('2026-11-13', 84.4)],
    kcalTarget: 2000,
    waterTarget: 2000,
    macros,
  }
  it('zählt Tage, Schnitt, Wasser, Gewicht und Rezepte', () => {
    const r = weekReview(base)
    expect(r.loggedDays).toBe(3)
    expect(r.avgKcal).toBeCloseTo(1966.7, 0)
    expect(r.avgProtein).toBe(100)
    expect(r.daysInTarget).toBe(3)
    expect(r.waterDays).toBe(1)
    expect(r.veggieKinds).toBe(2)
    expect(r.weightChange).toBeCloseTo(-0.6, 2)
    expect(r.topRecipe).toEqual({ name: 'Bolognese', count: 2 })
  })
  it('formuliert neutral', () => {
    const lines = reviewLines(weekReview(base))
    expect(lines[0]).toBe('An 3 von 7 Tagen protokolliert.')
    expect(lines).toContain('Im Schnitt 1.967 kcal pro Tag – Ziel 2.000.')
    expect(lines).toContain('Wasserziel an 1 Tag erreicht.')
    expect(lines).toContain('Gewicht: −0,6 kg gegenüber der Vorwoche.')
    expect(lines).toContain('Meistgekocht: Bolognese (2×).')
    expect(lines.join(' ')).not.toMatch(/zu viel|schlecht|leider/i)
    expect(reviewLines(weekReview({ ...base, log: [], water: [] }))[0]).toMatch(/noch nichts protokolliert/)
  })
})
