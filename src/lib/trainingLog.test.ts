import { describe, expect, it } from 'vitest'
import type { ActivityLog, TrainingDetails } from '../types'
import { EXERCISES, MORE_EXERCISES, exercise } from '../data/exercises'
import { generateWorkout } from './workouts'
import {
  LOG_EXERCISES,
  MAX_SETS,
  bestSet,
  dayInSentence,
  defaultTrainingName,
  detailsFromWorkout,
  exerciseStats,
  exerciseSummary,
  isMissingDetailsColumn,
  lastPerformance,
  measureOf,
  newExercise,
  newSet,
  recentExercises,
  sameExercise,
  sanitizeDetails,
  searchExercises,
  setLabel,
  templateFrom,
  trainingSummary,
  trainingVolume,
  trainingsOf,
} from './trainingLog'

const set = (reps: number | null, kg: number | null = null, seconds: number | null = null) => ({ reps, kg, seconds })
const log = (id: string, date: string, details: TrainingDetails | null, created = '2026-11-01T10:00:00Z'): ActivityLog => ({
  id,
  date,
  kind: 'krafttraining',
  name: 'Training',
  minutes: 45,
  steps: null,
  kcal: 200,
  details,
  created_at: created,
})

const push: TrainingDetails = {
  exercises: [
    { key: 'bankdruecken', name: 'Bankdrücken', sets: [set(10, 60), set(10, 60), set(10, 60)] },
    { key: 'lh-kniebeuge', name: 'Kniebeugen mit Langhantel', sets: [set(8, 80), set(8, 80)] },
    { key: 'unterarmstuetz', name: 'Unterarmstütz (Plank)', sets: [set(null, null, 45), set(null, null, 45), set(null, null, 60)] },
  ],
}

describe('Trainingstagebuch: Anzeige', () => {
  it('beschreibt Sätze und Übungen lesbar', () => {
    expect(setLabel(set(10, 60))).toBe('10 × 60 kg')
    expect(setLabel(set(12, 22.5))).toBe('12 × 22,5 kg')
    expect(setLabel(set(15))).toBe('15 Wdh.')
    expect(setLabel(set(null, null, 45))).toBe('45 s')
    expect(setLabel(set(null, null, 600))).toBe('10 Min.')
    expect(setLabel(set(null, null, 90))).toBe('1:30 Min.')
    expect(exerciseSummary(push.exercises[0])).toBe('3 Sätze à 10 × 60 kg')
    expect(exerciseSummary(push.exercises[2])).toBe('45 s · 45 s · 1 Min.')
    expect(exerciseSummary({ sets: [set(10, 60)] })).toBe('10 × 60 kg')
    expect(exerciseSummary({ sets: [] })).toBe('')
  })

  it('fasst ein Training zusammen – mit bewegtem Gewicht', () => {
    expect(trainingVolume(push)).toBe(3 * 600 + 2 * 640)
    expect(trainingSummary(push)).toBe('3 Übungen · 8 Sätze · 3.080 kg bewegt')
    expect(trainingSummary({ exercises: [{ key: null, name: 'Dehnen', sets: [] }] })).toBe('1 Übung')
  })

  it('findet einen Namen, wenn keiner eingetragen ist', () => {
    expect(defaultTrainingName({ exercises: [] }, 'Krafttraining')).toBe('Krafttraining')
    expect(defaultTrainingName({ exercises: push.exercises.slice(0, 1) }, 'x')).toBe('Bankdrücken')
    expect(defaultTrainingName({ exercises: push.exercises.slice(0, 2) }, 'x')).toBe('Bankdrücken und Kniebeugen mit Langhantel')
    expect(defaultTrainingName(push, 'x')).toBe('Bankdrücken, Kniebeugen mit Langhantel und Unterarmstütz (Plank)')
    const four = { exercises: [...push.exercises, { key: null, name: 'Klimmzüge', sets: [] }] }
    expect(defaultTrainingName(four, 'x')).toBe('Bankdrücken, Kniebeugen mit Langhantel, Unterarmstütz (Plank) …')
  })
})

describe('Trainingstagebuch: Tage im Satz', () => {
  it('sagt „heute“, „gestern“ oder kurz den Tag', () => {
    expect(dayInSentence('2026-11-16', '2026-11-16')).toBe('heute')
    expect(dayInSentence('2026-11-15', '2026-11-16')).toBe('gestern')
    expect(dayInSentence('2026-11-10', '2026-11-16')).toMatch(/^Di\.? 10\.11\.$/)
  })
})

describe('Trainingstagebuch: Verlauf, letztes Mal und Bestwerte', () => {
  const older: TrainingDetails = { exercises: [{ key: 'bankdruecken', name: 'Bankdrücken', sets: [set(8, 65), set(6, 70)] }] }
  const custom: TrainingDetails = { exercises: [{ key: null, name: 'Seilklettern', sets: [set(3)] }] }
  const logs = [
    log('a', '2026-11-10', older),
    log('b', '2026-11-12', push),
    log('c', '2026-11-12', custom, '2026-11-12T18:00:00Z'),
    log('d', '2026-11-13', null),
  ]

  it('sortiert Trainings mit Übungen, neueste zuerst', () => {
    expect(trainingsOf(logs).map((l) => l.id)).toEqual(['c', 'b', 'a'])
  })

  it('erkennt dieselbe Übung über den Schlüssel oder den Namen', () => {
    expect(sameExercise({ key: 'bankdruecken', name: 'x' }, { key: 'bankdruecken', name: 'y' })).toBe(true)
    expect(sameExercise({ key: null, name: ' seilklettern ' }, { key: null, name: 'Seilklettern' })).toBe(true)
    expect(sameExercise({ key: 'bankdruecken', name: 'Bankdrücken' }, { key: 'kh-bankdruecken', name: 'Bankdrücken' })).toBe(false)
  })

  it('zeigt das letzte Mal – ohne das gerade bearbeitete Training', () => {
    expect(lastPerformance(logs, { key: 'bankdruecken', name: 'Bankdrücken' })).toMatchObject({ date: '2026-11-12', logId: 'b' })
    expect(lastPerformance(logs, { key: 'bankdruecken', name: 'Bankdrücken' }, { excludeId: 'b' })).toMatchObject({ date: '2026-11-10' })
    expect(lastPerformance(logs, { key: null, name: 'Seilklettern' })?.sets).toEqual([set(3)])
    expect(lastPerformance(logs, { key: 'burpee', name: 'Burpees' })).toBeNull()
  })

  it('findet den Bestwert: mehr Gewicht zählt vor mehr Wiederholungen', () => {
    expect(bestSet(logs, { key: 'bankdruecken', name: 'Bankdrücken' })).toEqual({ set: set(6, 70), date: '2026-11-10' })
    expect(bestSet(logs, { key: 'bankdruecken', name: 'Bankdrücken' }, 'a')).toEqual({ set: set(10, 60), date: '2026-11-12' })
    expect(bestSet(logs, { key: 'unterarmstuetz', name: 'Plank' })?.set).toEqual(set(null, null, 60))
  })

  it('kennt die zuletzt und am häufigsten trainierten Übungen', () => {
    expect(recentExercises(logs).map((e) => e.name)).toEqual(['Seilklettern', 'Bankdrücken', 'Kniebeugen mit Langhantel', 'Unterarmstütz (Plank)'])
    const stats = exerciseStats(logs)
    expect(stats[0]).toMatchObject({ key: 'bankdruecken', count: 2 })
    expect(stats[0].best?.set).toEqual(set(6, 70))
    expect(stats[0].last?.date).toBe('2026-11-12')
  })

  it('macht aus einem früheren Training eine Vorlage, ohne es zu verändern', () => {
    const t = templateFrom(push)
    t.exercises[0].sets[0].kg = 100
    expect(push.exercises[0].sets[0].kg).toBe(60)
    expect(t.exercises).toHaveLength(3)
  })
})

describe('Trainingstagebuch: Eingaben', () => {
  it('misst Übungen passend: Wiederholungen, Sekunden oder Minuten', () => {
    expect(measureOf({ key: 'bankdruecken', sets: [] })).toBe('reps')
    expect(measureOf({ key: 'unterarmstuetz', sets: [] })).toBe('seconds')
    expect(measureOf({ key: 'laufband', sets: [] })).toBe('minutes')
    expect(measureOf({ key: null, sets: [set(10)] })).toBe('reps')
    expect(measureOf({ key: null, sets: [set(null, null, 40)] })).toBe('seconds')
    expect(measureOf({ key: null, sets: [set(null, null, 1200)] })).toBe('minutes')
  })

  it('legt Übungen mit einem ersten Satz an; ein weiterer Satz übernimmt den vorigen', () => {
    expect(newExercise(exercise('bankdruecken')!)).toEqual({ key: 'bankdruecken', name: 'Bankdrücken', sets: [set(10)] })
    expect(newExercise(exercise('laufband')!).sets).toEqual([set(null, null, 600)])
    expect(newExercise(null, '  Seilklettern  ')).toEqual({ key: null, name: 'Seilklettern', sets: [set(10)] })
    expect(newSet('reps', set(8, 70))).toEqual(set(8, 70))
  })

  it('findet Übungen – auch die zusätzlichen aus dem Studio – und filtert nach Muskelgruppen', () => {
    expect(searchExercises('bank')[0].name).toBe('Bankdrücken')
    expect(searchExercises('hammer').map((e) => e.key)).toContain('hammercurls')
    expect(searchExercises('', 'brust').every((e) => e.muscles.includes('brust'))).toBe(true)
    expect(searchExercises('xyz')).toEqual([])
  })

  it('hat eindeutige Übungen – die zusätzlichen erscheinen nicht in den Trainingsvorschlägen', () => {
    const keys = LOG_EXERCISES.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(MORE_EXERCISES.length).toBeGreaterThanOrEqual(20)
    for (const e of MORE_EXERCISES) expect(EXERCISES.includes(e)).toBe(false)
    expect(exercise('hammercurls')?.name).toBe('Hammercurls')
  })

  it('bereinigt Übungen: leere Sätze fallen weg, Werte werden begrenzt und gerundet', () => {
    const raw = {
      exercises: [
        { key: 'bankdruecken', name: '  Bankdrücken ', sets: [{ reps: '10', kg: '62,6' }, { reps: null, kg: null, seconds: null }, { reps: -3 }] },
        { key: 7, name: 'Eigene', sets: [{ seconds: 45.4 }, 'Quatsch'] },
        { name: '', sets: [{ reps: 5 }] },
        'kaputt',
      ],
      note: '  gut gelaufen  ',
    }
    expect(sanitizeDetails(raw)).toEqual({
      exercises: [
        { key: 'bankdruecken', name: 'Bankdrücken', sets: [set(10, 62.5)] },
        { key: null, name: 'Eigene', sets: [set(null, null, 45)] },
      ],
      note: 'gut gelaufen',
    })
    expect(sanitizeDetails(null)).toBeNull()
    expect(sanitizeDetails([1, 2])).toBeNull()
    expect(sanitizeDetails({ exercises: [] })).toBeNull()
    expect(sanitizeDetails({ exercises: [], note: 'nur Notiz' })).toEqual({ exercises: [], note: 'nur Notiz' })
    const many = { exercises: [{ name: 'X', sets: Array.from({ length: 50 }, () => ({ reps: 1 })) }] }
    expect(sanitizeDetails(many)?.exercises[0].sets).toHaveLength(MAX_SETS)
  })

  it('übernimmt ein geführtes Training ins Tagebuch – ohne Aufwärmen und Abkühlen', () => {
    const w = generateWorkout({ place: 'studio', minutes: 45, focus: 'ganzkoerper', level: 'einsteiger', seed: 42 })
    const d = detailsFromWorkout(w)
    expect(d.exercises.length).toBeGreaterThan(0)
    const main = w.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items.map((i) => i.exercise.key))
    for (const e of d.exercises) {
      expect(main).toContain(e.key)
      expect(e.sets.length).toBeGreaterThan(0)
      for (const s of e.sets) expect(s.reps !== null || s.seconds !== null).toBe(true)
    }
    expect(sanitizeDetails(d)).toEqual(d)
  })

  it('erkennt die fehlende Spalte für Übungen, aber nicht eine fehlende Tabelle', () => {
    expect(isMissingDetailsColumn(new Error("Could not find the 'details' column of 'activity_logs' in the schema cache"))).toBe(true)
    expect(isMissingDetailsColumn(new Error('column "details" of relation "activity_logs" does not exist'))).toBe(true)
    expect(isMissingDetailsColumn(new Error("Could not find the table 'public.activity_logs' in the schema cache"))).toBe(false)
  })
})
