import { describe, expect, it } from 'vitest'
import type { ActivityLog, TrainingPlan } from '../types'
import { ACTIVITY_TYPES } from '../data/activities'
import { estimateKcal } from './activity'
import { activityType } from '../data/activities'
import { generateWorkout } from './workouts'
import { weekDaysISO } from './dates'
import {
  ROTATION,
  activityFromPlan,
  isStrengthPlan,
  matchPlans,
  mealPlanHints,
  openPlansOn,
  planDetail,
  planFromSport,
  planFromSuggestion,
  planFromTraining,
  planKcal,
  planTrainingWeek,
  plannedExercises,
  plannedWorkout,
  sanitizePlanDetails,
  sportGroup,
  startLink,
  trainingWeekSummary,
  type NewTrainingPlan,
} from './trainingPlan'

const days = weekDaysISO('2026-11-16')
let n = 0
const plan = (p: Partial<NewTrainingPlan> & { date: string }, extra: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: `p${++n}`,
  kind: 'krafttraining',
  title: 'Training',
  minutes: 30,
  details: null,
  created_at: `2026-11-16T10:00:${String(n).padStart(2, '0')}Z`,
  ...p,
  ...extra,
})
const act = (a: Partial<ActivityLog> & { date: string; kind: string }): ActivityLog => ({
  id: `a${++n}`,
  name: a.kind,
  minutes: 30,
  steps: null,
  kcal: 100,
  ...a,
})

describe('Sportarten zuordnen', () => {
  it('kennt für jede Sportart aus dem Katalog eine Gruppe', () => {
    for (const t of ACTIVITY_TYPES) {
      if (t.custom) expect(sportGroup(t.key)).toBe('eigene')
      else expect(sportGroup(t.key), t.key).not.toBe('eigene')
    }
    expect(sportGroup('gibt-es-nicht')).toBe('eigene')
  })
  it('erkennt Krafttraining für die Abstimmung aufs Essen', () => {
    expect(isStrengthPlan({ kind: 'krafttraining' })).toBe(true)
    expect(isStrengthPlan({ kind: 'joggen' })).toBe(false)
    expect(isStrengthPlan({ kind: 'yoga' })).toBe(false)
  })
})

describe('Geplant und erledigt abgleichen', () => {
  it('zählt Sport derselben Art und ähnlichen Sport am selben Tag – jede Einheit nur einmal', () => {
    const run = plan({ date: days[0], kind: 'joggen', title: 'Joggen' })
    const strength = plan({ date: days[0], kind: 'krafttraining' })
    const cardio = plan({ date: days[1], kind: 'joggen' })
    const walk = plan({ date: days[2], kind: 'spazieren' })
    const done = matchPlans(
      [run, strength, cardio, walk],
      [
        act({ date: days[0], kind: 'krafttraining' }),
        act({ date: days[0], kind: 'joggen' }),
        // Radfahren statt Joggen: auch Ausdauer
        act({ date: days[1], kind: 'rad-zuegig' }),
        // Schritte erfüllen keinen geplanten Spaziergang – nur dieselbe Sportart
        act({ date: days[2], kind: 'schritte', steps: 8000, minutes: null }),
      ],
    )
    expect(done.get(run.id)?.kind).toBe('joggen')
    expect(done.get(strength.id)?.kind).toBe('krafttraining')
    expect(done.get(cardio.id)?.kind).toBe('rad-zuegig')
    expect(done.has(walk.id)).toBe(false)
  })
  it('ordnet zuerst nach gleicher Sportart zu, damit nichts „weggeschnappt“ wird', () => {
    const hiit = plan({ date: days[0], kind: 'hiit' })
    const run = plan({ date: days[0], kind: 'joggen' })
    const done = matchPlans([hiit, run], [act({ date: days[0], kind: 'joggen' }), act({ date: days[0], kind: 'hiit' })])
    expect(done.get(hiit.id)?.kind).toBe('hiit')
    expect(done.get(run.id)?.kind).toBe('joggen')
    // Zwei geplante Läufe, ein Lauf eingetragen: einer bleibt offen
    const a = plan({ date: days[3], kind: 'joggen' })
    const b = plan({ date: days[3], kind: 'joggen' })
    expect(matchPlans([a, b], [act({ date: days[3], kind: 'joggen' })]).size).toBe(1)
    expect(openPlansOn(days[3], [a, b], [act({ date: days[3], kind: 'joggen' })])).toHaveLength(1)
  })
  it('zählt Sport an einem anderen Tag nicht', () => {
    const p = plan({ date: days[0], kind: 'joggen' })
    expect(matchPlans([p], [act({ date: days[1], kind: 'joggen' })]).size).toBe(0)
    expect(openPlansOn(days[0], [p], [])).toEqual([p])
  })
  it('fasst die Woche ohne Wertung zusammen', () => {
    const plans = [plan({ date: days[0], minutes: 30 }), plan({ date: days[2], kind: 'joggen', minutes: 45 }), plan({ date: '2026-11-30' })]
    const s = trainingWeekSummary(plans, [act({ date: days[0], kind: 'krafttraining' })], days)
    expect(s).toEqual({ planned: 2, done: 1, minutes: 75 })
  })
})

describe('Abstimmung aufs Essen', () => {
  it('schätzt den Verbrauch wie beim Eintragen', () => {
    expect(planKcal({ kind: 'joggen', minutes: 30 }, 70)).toBe(estimateKcal(activityType('joggen')!, { minutes: 30 }, 70))
    expect(planKcal({ kind: 'eigene', minutes: 30 }, 70)).toBe(0)
    expect(planKcal({ kind: 'joggen', minutes: null }, 70)).toBe(0)
  })
  it('rechnet Training nur aufs Tagesziel, wenn das so eingestellt ist – Krafttage bekommen trotzdem mehr Eiweiß', () => {
    const plans = [plan({ date: days[0], kind: 'krafttraining', minutes: 45 }), plan({ date: days[3], kind: 'joggen', minutes: 30 })]
    const off = mealPlanHints(plans, days, { weightKg: 80, inBudget: false })
    expect(off.extraKcal).toEqual({})
    expect(off.proteinDays).toEqual([days[0]])
    expect(off.trainingDays).toEqual([days[0], days[3]])
    const on = mealPlanHints(plans, days, { weightKg: 80, inBudget: true })
    expect(on.extraKcal[days[0]]).toBe(planKcal(plans[0], 80))
    expect(on.extraKcal[days[3]]).toBe(planKcal(plans[1], 80))
    expect(on.extraKcal[days[1]]).toBeUndefined()
  })
})

describe('Training einplanen', () => {
  it('plant einen Vorschlag so ein, dass später genau dasselbe Training entsteht', () => {
    const o = { place: 'studio' as const, duration: 45, focus: 'oberkoerper' as const, level: 'fortgeschritten' as const, seed: 4711 }
    const p = planFromSuggestion(days[0], o)
    const w = generateWorkout({ place: o.place, minutes: o.duration, focus: o.focus, level: o.level, seed: o.seed })
    expect(p).toEqual({
      date: days[0],
      kind: w.activityKind,
      title: 'Oberkörper im Studio',
      minutes: w.minutes,
      details: { source: 'vorschlag', ...o },
    })
    expect(plannedWorkout({ details: p.details })).toEqual(w)
    expect(planDetail(p)).toBe(`ca. ${w.minutes} Min. · Fortgeschritten`)
  })
  it('plant ein früheres eigenes Training mit denselben Übungen ein', () => {
    const exercises = [{ key: 'bankdruecken', name: 'Bankdrücken', sets: [{ reps: 10, kg: 60, seconds: null }] }]
    const p = planFromTraining(days[1], { kind: 'krafttraining', name: 'Push-Tag', minutes: 50, details: { exercises, note: 'gut' } })
    expect(p).toEqual({ date: days[1], kind: 'krafttraining', title: 'Push-Tag', minutes: 50, details: { source: 'vorlage', exercises } })
    expect(plannedExercises(p)).toEqual({ exercises })
    expect(planDetail(p)).toBe('50 Min. · 1 Übung')
    // ohne Übungen bleibt es eine einfache Sporteinheit
    expect(planFromTraining(days[1], { kind: 'joggen', name: 'Joggen', minutes: 30, details: null }).details).toBeNull()
  })
  it('plant eine Sportart mit Dauer ein', () => {
    expect(planFromSport(days[2], 'schwimmen', 40)).toEqual({ date: days[2], kind: 'schwimmen', title: 'Schwimmen', minutes: 40, details: null })
    expect(planFromSport(days[2], 'eigene', 0, '  Tanzkurs ')).toEqual({
      date: days[2],
      kind: 'eigene',
      title: 'Tanzkurs',
      minutes: null,
      details: null,
    })
    expect(planFromSport(days[2], 'unbekannt', 30).kind).toBe('eigene')
  })
})

describe('Trainingstage planen', () => {
  const base = { place: 'zuhause' as const, duration: 30, level: 'einsteiger' as const, focus: 'abwechselnd' as const, existing: [], seed: 7 }
  it('wechselt die Schwerpunkte je nach Anzahl der Tage ab', () => {
    const res = planTrainingWeek({ ...base, dates: [days[4], days[0], days[2]] })
    expect(res.map((p) => p.date)).toEqual([days[0], days[2], days[4]])
    expect(res.map((p) => (p.details?.source === 'vorschlag' ? p.details.focus : null))).toEqual([...ROTATION[3]])
    expect(res.map((p) => p.title)).toEqual(['Ganzkörper zu Hause', 'Ausdauer zu Hause', 'Ganzkörper zu Hause'])
    // jeder Tag ein anderes Training
    expect(new Set(res.map((p) => (p.details?.source === 'vorschlag' ? p.details.seed : 0))).size).toBe(3)
    for (let k = 1; k <= 7; k++) expect(ROTATION[k]).toHaveLength(k)
  })
  it('lässt Tage mit schon geplantem Training unverändert und ist reproduzierbar', () => {
    const all = planTrainingWeek({ ...base, dates: [days[0], days[2], days[4]] })
    const res = planTrainingWeek({ ...base, dates: [days[0], days[2], days[4]], existing: [{ date: days[2] }] })
    expect(res.map((p) => p.date)).toEqual([days[0], days[4]])
    // die übrigen Tage bekommen dasselbe wie ohne den belegten Tag
    expect(res).toEqual([all[0], all[2]])
    expect(planTrainingWeek({ ...base, dates: [] })).toEqual([])
  })
  it('plant keine vergangenen Tage mehr ein – die Abfolge beginnt beim ersten kommenden Tag', () => {
    const res = planTrainingWeek({ ...base, dates: [days[0], days[2], days[4]], notBefore: days[1] })
    expect(res).toEqual(planTrainingWeek({ ...base, dates: [days[2], days[4]] }))
    expect(res.map((p) => p.title)).toEqual(['Ganzkörper zu Hause', 'Ausdauer zu Hause'])
  })
  it('nimmt auf Wunsch immer denselben Schwerpunkt', () => {
    const res = planTrainingWeek({ ...base, focus: 'beweglichkeit', dates: [days[1], days[3]] })
    expect(res.every((p) => p.kind === 'dehnen' && p.title === 'Beweglichkeit zu Hause')).toBe(true)
  })
})

describe('Geplantes Training durchführen', () => {
  it('prüft gespeicherte Angaben und lässt Unbekanntes weg', () => {
    const ok = { source: 'vorschlag', place: 'hanteln', focus: 'rumpf', level: 'einsteiger', duration: 20, seed: 12 }
    expect(sanitizePlanDetails(ok)).toEqual(ok)
    expect(sanitizePlanDetails({ ...ok, place: 'toString' })).toBeNull()
    expect(sanitizePlanDetails({ ...ok, duration: 25 })).toBeNull()
    expect(sanitizePlanDetails({ ...ok, seed: -1 })).toBeNull()
    expect(sanitizePlanDetails({ ...ok, seed: 1.5 })).toBeNull()
    expect(
      sanitizePlanDetails({ source: 'vorlage', exercises: [{ name: ' Kniebeuge ', key: 'kniebeuge', sets: [{ reps: 10 }] }, { name: '' }] }),
    ).toEqual({
      source: 'vorlage',
      exercises: [{ key: 'kniebeuge', name: 'Kniebeuge', sets: [{ reps: 10, kg: null, seconds: null }] }],
    })
    expect(sanitizePlanDetails({ source: 'vorlage', exercises: [] })).toBeNull()
    expect(sanitizePlanDetails([1, 2])).toBeNull()
    expect(sanitizePlanDetails(null)).toBeNull()
    expect(plannedWorkout({ details: null })).toBeNull()
  })
  it('„Erledigt“ trägt das Geplante als Sport ein – mit Übungen, soweit bekannt', () => {
    const suggested = {
      ...planFromSuggestion(days[0], { place: 'zuhause', duration: 20, focus: 'ganzkoerper', level: 'einsteiger', seed: 3 }),
      id: 'x',
    }
    const a = activityFromPlan(suggested, 70)
    expect(a.name).toBe('Training: Ganzkörper zu Hause')
    expect(a.kind).toBe('krafttraining')
    expect(a.kcal).toBe(planKcal(suggested, 70))
    expect(a.details?.exercises.length).toBeGreaterThan(2)

    const sport = { ...planFromSport(days[1], 'joggen', 45), id: 'y' }
    const b = activityFromPlan(sport, 70, days[2])
    expect(b).toEqual({ date: days[2], kind: 'joggen', name: 'Joggen (ca. 8 km/h)', minutes: 45, steps: null, kcal: planKcal(sport, 70) })

    const exercises = [{ key: null, name: 'Klimmzüge', sets: [{ reps: 8, kg: null, seconds: null }] }]
    const own = { ...planFromTraining(days[1], { kind: 'krafttraining', name: 'Rücken', minutes: 40, details: { exercises } }), id: 'z' }
    expect(activityFromPlan(own, 70).details).toEqual({ exercises })
  })
  it('führt zum geführten Training oder ins Trainingstagebuch', () => {
    const suggested = {
      ...planFromSuggestion(days[0], { place: 'studio', duration: 30, focus: 'ausdauer', level: 'einsteiger', seed: 1 }),
      id: 'abc',
    }
    expect(startLink(suggested, days[0])).toBe('/training?plan=abc')
    const own = {
      ...planFromTraining(days[3], {
        kind: 'krafttraining',
        name: 'Beine',
        minutes: 40,
        details: { exercises: [{ key: null, name: 'Kniebeuge', sets: [] }] },
      }),
      id: 'def',
    }
    // geplant für später: eingetragen wird heute
    expect(startLink(own, days[0])).toBe(`/training/eintragen?plan=def&datum=${days[0]}`)
    expect(startLink(own, days[5])).toBe(`/training/eintragen?plan=def&datum=${days[3]}`)
    expect(startLink({ ...planFromSport(days[0], 'joggen', 30), id: 'g' }, days[0])).toBeNull()
  })
})
