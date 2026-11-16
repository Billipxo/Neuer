import { describe, expect, it } from 'vitest'
import { ACTIVITY_TYPES, activityType } from '../data/activities'
import { isMissingTableError, listTolerant } from '../data/store'
import { activityDetail, estimateKcal, searchActivities, summarizeActivities, targetWithActivity, weightOn } from './activity'
import { reviewLines, weekReview } from './progress'

describe('Sport: Verbrauch schätzen', () => {
  it('rechnet (MET − 1) × Gewicht × Stunden, Schritte mit 1/3000 kcal je kg', () => {
    expect(estimateKcal(activityType('joggen')!, { minutes: 30 }, 70)).toBe(245) // (8 − 1) × 70 × 0,5
    expect(estimateKcal(activityType('spazieren')!, { minutes: 60 }, 80)).toBe(160) // (3 − 1) × 80
    expect(estimateKcal(activityType('schritte')!, { steps: 10000 }, 70)).toBe(233)
    expect(estimateKcal(activityType('eigene')!, { minutes: 30 }, 70)).toBe(0)
    expect(estimateKcal(activityType('yoga')!, { minutes: 0 }, 70)).toBe(0)
  })

  it('jede Sportart hat einen eindeutigen Schlüssel und einen sinnvollen Richtwert', () => {
    expect(new Set(ACTIVITY_TYPES.map((a) => a.key)).size).toBe(ACTIVITY_TYPES.length)
    for (const a of ACTIVITY_TYPES) {
      if (a.steps || a.custom) continue
      expect(a.met, a.name).toBeGreaterThan(1.5)
      expect(a.met, a.name).toBeLessThan(14)
    }
  })

  it('nimmt das letzte Gewicht bis zum Tag, sonst das Profil, sonst 70 kg', () => {
    const logs = [
      { id: '1', date: '2026-11-01', kg: 82 },
      { id: '2', date: '2026-11-10', kg: 80 },
      { id: '3', date: '2026-11-20', kg: 79 },
    ]
    expect(weightOn('2026-11-15', logs, 90)).toEqual({ kg: 80, known: true })
    expect(weightOn('2026-10-01', logs, 90)).toEqual({ kg: 90, known: true })
    expect(weightOn('2026-10-01', [], null)).toEqual({ kg: 70, known: false })
  })

  it('findet Sportarten über Namen und Zweitnamen', () => {
    expect(searchActivities('Fitness')[0].key).toBe('krafttraining')
    expect(searchActivities('Spinning')[0].key).toBe('indoor-cycling')
    expect(searchActivities('rad').map((a) => a.key)).toContain('rad-zuegig')
    expect(searchActivities('').length).toBe(ACTIVITY_TYPES.length)
  })

  it('fasst zusammen und rechnet nur auf Wunsch aufs Tagesziel an', () => {
    const list = [
      { minutes: 30, steps: null, kcal: 245 },
      { minutes: null, steps: 8000, kcal: 187 },
    ]
    expect(summarizeActivities(list)).toEqual({ count: 2, minutes: 30, steps: 8000, kcal: 432 })
    expect(targetWithActivity(2000, 432, true)).toBe(2432)
    expect(targetWithActivity(2000, 432, false)).toBe(2000)
    expect(targetWithActivity(2000, 432, undefined)).toBe(2000)
    expect(activityDetail({ minutes: 45, steps: null })).toBe('45 Min.')
    expect(activityDetail({ minutes: null, steps: 12000 })).toBe('12.000 Schritte')
  })

  it('erscheint neutral im Wochenrückblick', () => {
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']
    const base = { days, log: [], water: [], weights: [], kcalTarget: 2000, waterTarget: 2000, macros: { protein: 25, carbs: 45, fat: 30 } }
    expect(weekReview(base).activity).toBeNull()
    // Auch ohne Essens-Einträge zählt der Sport
    expect(reviewLines(weekReview({ ...base, activities: [{ date: '2026-11-11', minutes: 20, steps: null, kcal: 100 }] }))).toEqual([
      'In dieser Woche ist noch nichts protokolliert – auch ein unvollständiger Tag zählt.',
      'Sport: 1 Einheit an 1 Tag · 20 Min. · ≈ 100 kcal.',
    ])
    const r = weekReview({
      ...base,
      log: [{ id: 'e', date: '2026-11-10', meal: 'lunch', name: 'x', amount: 1, unit: 'g', grams: 1, food_id: null, dish_id: null, recipe_id: null, veggies: [], kcal: 1800, protein: 90, carbs: 200, fat: 60 }],
      activities: [
        { date: '2026-11-10', minutes: 30, steps: null, kcal: 245 },
        { date: '2026-11-12', minutes: 45, steps: null, kcal: 300 },
        { date: '2026-11-12', minutes: null, steps: 9000, kcal: 210 },
        { date: '2026-11-20', minutes: 60, steps: null, kcal: 500 },
      ],
    })
    expect(r.activity).toEqual({ count: 3, days: 2, minutes: 75, kcal: 755 })
    expect(reviewLines(r)).toContain('Sport: 3 Einheiten an 2 Tagen · 75 Min. · ≈ 755 kcal.')
  })
})

describe('Fehlende Tabelle (Datenbank-Update noch nicht ausgeführt)', () => {
  it('erkennt die Meldungen von PostgREST und PostgreSQL', () => {
    expect(isMissingTableError(new Error("Could not find the table 'public.activity_logs' in the schema cache"))).toBe(true)
    expect(isMissingTableError(new Error('relation "public.activity_logs" does not exist'))).toBe(true)
    expect(isMissingTableError(new Error('Failed to fetch'))).toBe(false)
  })

  it('liefert bei optionalen Tabellen eine leere Liste statt eines Fehlers', async () => {
    const missing = { list: async () => Promise.reject(new Error("Could not find the table 'public.activity_logs' in the schema cache")) }
    await expect(listTolerant(missing, 'activity_logs')).resolves.toEqual([])
    await expect(listTolerant(missing, 'log_entries')).rejects.toThrow(/schema cache/)
    const offline = { list: async () => Promise.reject(new Error('Failed to fetch')) }
    await expect(listTolerant(offline, 'activity_logs')).rejects.toThrow(/fetch/)
  })
})
