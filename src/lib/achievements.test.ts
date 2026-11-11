import { describe, expect, it } from 'vitest'
import { currentStreak, derive, evaluate, longestStreak, newlyUnlocked, type AchievementInput } from './achievements'
import type { LogEntry, PlanItem } from '../types'
import { weekDaysISO } from './dates'

const entry = (date: string, p: Partial<LogEntry> = {}): LogEntry => ({
  id: Math.random().toString(36), date, meal: 'lunch', name: 'x', amount: 1, unit: 'serving', grams: null,
  // ausgewogen bei 2000 kcal Ziel und 25/45/30
  kcal: 2000, protein: 125, carbs: 225, fat: 67,
  food_id: null, dish_id: null, recipe_id: null, veggies: [], ...p,
})

const base = (p: Partial<AchievementInput> = {}): AchievementInput => ({
  today: '2026-11-15', kcalTarget: 2000, macros: { protein: 25, carbs: 45, fat: 30 }, waterTarget: 2000,
  log: [], plan: [], water: [], ...p,
})

describe('Serien', () => {
  it('berechnet die längste Serie', () => {
    expect(longestStreak([])).toBe(0)
    expect(longestStreak(['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05', '2026-11-06'])).toBe(3)
  })
  it('zählt die aktuelle Serie ohne Druck', () => {
    const dates = ['2026-11-12', '2026-11-13', '2026-11-14']
    expect(currentStreak(dates, '2026-11-15')).toBe(3) // heute noch offen → bis gestern
    expect(currentStreak([...dates, '2026-11-15'], '2026-11-15')).toBe(4)
    expect(currentStreak(dates, '2026-11-16')).toBe(0) // ein verpasster Tag setzt zurück
  })
})

describe('Erfolge', () => {
  it('ist ohne Daten nichts freigeschaltet', () => {
    expect(evaluate(base()).every((r) => !r.reached)).toBe(true)
  })
  it('erkennt Tag im Ziel, Serie und erstes Rezept', () => {
    const log = [entry('2026-11-10'), entry('2026-11-11', { kcal: 3000 }), entry('2026-11-12', { recipe_id: 'shakshuka' })]
    const keys = newlyUnlocked(base({ log }), []).map((d) => d.key)
    expect(keys).toEqual(expect.arrayContaining(['first_entry', 'first_in_target', 'streak_3', 'first_recipe']))
    expect(keys).not.toContain('streak_7')
    // bereits gespeicherte werden nicht erneut gemeldet
    expect(newlyUnlocked(base({ log }), ['first_entry', 'streak_3']).map((d) => d.key)).not.toContain('streak_3')
  })
  it('feiert die erste eigene Variante', () => {
    expect(newlyUnlocked(base({ ownRecipes: 1 }), []).map((d) => d.key)).toContain('first_variant')
    expect(newlyUnlocked(base(), []).map((d) => d.key)).not.toContain('first_variant')
  })
  it('zählt ausgewogene Tage und Gemüsesorten pro Woche', () => {
    const week = weekDaysISO('2026-11-09')
    const veg = ['Tomate', 'Gurke', 'Paprika', 'Zucchini', 'Karotte', 'Brokkoli', 'Spinat', 'Salat', 'Zwiebel', 'Lauch']
    const log = week.slice(0, 5).map((d, i) => entry(d, { veggies: veg.slice(i * 2, i * 2 + 2) }))
    const d = derive(base({ log }))
    expect(d.maxBalancedDaysInWeek).toBe(5)
    expect(d.maxVeggiesInWeek).toBe(10)
    const keys = newlyUnlocked(base({ log }), []).map((x) => x.key)
    expect(keys).toEqual(expect.arrayContaining(['balanced_week', 'veggies_10']))
  })
  it('erkennt eine vollständig geplante Woche und Wassertage', () => {
    const plan = weekDaysISO('2026-11-09').map(
      (date) => ({ id: date, date, meal: 'lunch', kind: 'text', recipe_id: null, dish_id: null, title: 'x', servings: 1, kcal: 0, protein: 0, carbs: 0, fat: 0 }) as PlanItem,
    )
    const water = ['01', '02', '03', '04', '05'].map((d) => ({ id: d, date: `2026-11-${d}`, ml: 2000 }))
    const keys = newlyUnlocked(base({ plan, water }), []).map((x) => x.key)
    expect(keys).toEqual(expect.arrayContaining(['first_week_planned', 'water_5']))
  })
})
