import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  GROUP_ORDER,
  computeStreaks,
  currentStreak,
  currentWeekStreak,
  derive,
  evaluate,
  longestStreak,
  longestWeekStreak,
  newlyUnlocked,
  streakLength,
  type AchievementInput,
} from './achievements'
import type { ActivityLog, LogEntry, PlanItem, TrainingDetails } from '../types'
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

const activity = (date: string, p: Partial<ActivityLog> = {}): ActivityLog => ({
  id: Math.random().toString(36), date, kind: 'joggen', name: 'Joggen', minutes: 30, steps: null, kcal: 200, details: null,
  created_at: `${date}T10:00:00Z`, ...p,
})
const training = (date: string, kg: number, reps = 10): ActivityLog =>
  activity(date, {
    kind: 'krafttraining',
    details: { exercises: [{ key: 'bankdruecken', name: 'Bankdrücken', sets: [{ reps, kg, seconds: null }, { reps, kg, seconds: null }] }] } as TrainingDetails,
  })

describe('Serien in Wochen und im Überblick', () => {
  it('zählt Sport-Wochen: die laufende Woche zählt, sobald sie dabei ist', () => {
    // Wochen ab Mo 26.10., 2.11., 9.11.; heute ist So 15.11. (Woche ab 9.11.)
    const dates = ['2026-10-27', '2026-11-04', '2026-11-05', '2026-11-12']
    expect(longestWeekStreak(dates)).toBe(3)
    expect(currentWeekStreak(dates, '2026-11-15')).toBe(3)
    // neue Woche ab 16.11. noch ohne Sport: Serie zählt bis zur letzten Woche
    expect(currentWeekStreak(dates, '2026-11-17')).toBe(3)
    // eine ganze Woche ohne Sport beendet die Serie
    expect(currentWeekStreak(dates, '2026-11-24')).toBe(0)
    expect(longestWeekStreak([])).toBe(0)
  })

  it('zeigt Serie und Rekord für Einträge, Wasserziel und Sport', () => {
    const log = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-13', '2026-11-14', '2026-11-15'].map((d) => entry(d))
    const water = ['2026-11-14', '2026-11-15'].map((d) => ({ id: d, date: d, ml: 2500 }))
    const activities = [activity('2026-11-03'), activity('2026-11-10')]
    const [l, w, sp] = computeStreaks(base({ log, water, activities }))
    expect(l).toMatchObject({ key: 'log', current: 3, best: 4, unit: 'day' })
    expect(w).toMatchObject({ key: 'water', current: 2, best: 2 })
    expect(sp).toMatchObject({ key: 'sport', current: 2, best: 2, unit: 'week' })
    expect(streakLength(1, 'day')).toBe('1 Tag')
    expect(streakLength(3, 'week')).toBe('3 Wochen')
  })
})

describe('Neue Erfolge', () => {
  it('behält die bisherigen Schlüssel und ordnet jedes Abzeichen einem Bereich zu', () => {
    const keys = ACHIEVEMENTS.map((a) => a.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const old of ['first_entry', 'first_in_target', 'streak_3', 'streak_7', 'balanced_week', 'veggies_10', 'first_recipe', 'first_variant', 'first_week_planned', 'water_5']) {
      expect(keys).toContain(old)
    }
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40)
    for (const a of ACHIEVEMENTS) {
      expect(GROUP_ORDER).toContain(a.group)
      expect(a.praise.length, a.key).toBeGreaterThan(10)
      // keine Gesundheitsversprechen und kein Druck
      expect(`${a.title} ${a.description} ${a.praise}`, a.key).not.toMatch(/gesund|abnehm|schlank|verbrenn|schuld|verloren|versäum/i)
    }
    for (const g of GROUP_ORDER) expect(ACHIEVEMENTS.filter((a) => a.group === g).length, g).toBeGreaterThanOrEqual(4)
  })

  it('zählt vollständige Tage, Eiweißziel, Vielfalt und verschiedene Rezepte', () => {
    // Eiweißziel bei 2000 kcal und 25 %: 125 g
    const day = (date: string) => [
      entry(date, { meal: 'breakfast', kcal: 500, protein: 40, name: 'Müsli', recipe_id: 'overnight-oats' }),
      entry(date, { meal: 'lunch', kcal: 800, protein: 50, name: 'Hähnchen' }),
      entry(date, { meal: 'dinner', kcal: 700, protein: 40, name: `Brot ${date}`, veggies: ['Tomate', `Gemüse ${date}`] }),
    ]
    const log = ['2026-11-10', '2026-11-11', '2026-11-12'].flatMap(day)
    const d = derive(base({ log }))
    expect(d.completeDays).toBe(3)
    expect(d.proteinDays).toBe(3)
    expect(d.distinctFoods).toBe(2 + 3)
    expect(d.distinctVeggies).toBe(1 + 3)
    expect(d.distinctRecipes).toBe(1)
  })

  it('zählt gut geplante Wochen', () => {
    const plan = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09'].map(
      (date) => ({ id: date, date, meal: 'lunch', kind: 'text', recipe_id: null, dish_id: null, title: 'x', servings: 1, kcal: 0, protein: 0, carbs: 0, fat: 0 }) as PlanItem,
    )
    expect(derive(base({ plan })).wellPlannedWeeks).toBe(1)
  })

  it('erkennt Sport, Schritte, Trainings, bewegtes Gewicht und neue Bestwerte', () => {
    const activities = [
      activity('2026-10-20', { minutes: 300 }),
      activity('2026-10-21', { kind: 'schritte', name: 'Schritte', minutes: null, steps: 6000 }),
      activity('2026-10-21', { kind: 'schritte', name: 'Schritte', minutes: null, steps: 5000 }),
      training('2026-11-01', 60),
      training('2026-11-08', 60, 8), // schlechter: kein neuer Bestwert
      training('2026-11-12', 65), // mehr Gewicht: neuer Bestwert
      activity('2026-11-14', { minutes: 300 }),
    ]
    const d = derive(base({ activities }))
    expect(d.activities).toBe(7)
    expect(d.trainings).toBe(3)
    expect(d.maxStepsDay).toBe(11000)
    expect(d.sportMinutes).toBe(300 + 30 * 3 + 300)
    expect(d.volumeKg).toBe(2 * 10 * 60 + 2 * 8 * 60 + 2 * 10 * 65)
    expect(d.personalBests).toBe(1)
    const keys = newlyUnlocked(base({ activities }), []).map((x) => x.key)
    expect(keys).toEqual(expect.arrayContaining(['first_activity', 'first_training', 'personal_best', 'steps_10k', 'sport_hours_10']))
    expect(keys).not.toContain('activities_10')
    expect(keys).not.toContain('volume_10t')
  })

  it('kommt ohne Sportdaten aus (Datenbank ohne Sport)', () => {
    const r = evaluate(base({ activities: undefined }))
    expect(r.filter((x) => x.def.group === 'sport').every((x) => !x.reached)).toBe(true)
  })
})
