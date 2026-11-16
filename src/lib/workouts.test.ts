import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../data/exercises'
import { DURATIONS, generateWorkout, itemAmount, workoutSteps, type Focus, type Level, type Place } from './workouts'

const PLACES: Place[] = ['zuhause', 'hanteln', 'studio']
const FOCI: Focus[] = ['ganzkoerper', 'beine-po', 'oberkoerper', 'rumpf', 'ausdauer', 'beweglichkeit']
const LEVELS: Level[] = ['einsteiger', 'fortgeschritten']
const HOME_EQUIPMENT = ['koerper', 'matte', 'stuhl']

function* all() {
  for (const place of PLACES) for (const focus of FOCI) for (const level of LEVELS) for (const minutes of DURATIONS) for (const seed of [1, 2, 3]) yield { place, focus, level, minutes, seed }
}

describe('Übungen', () => {
  it('haben eindeutige Schlüssel, Hinweise und passende Angaben', () => {
    expect(new Set(EXERCISES.map((e) => e.key)).size).toBe(EXERCISES.length)
    for (const e of EXERCISES) {
      expect(e.cues.length, e.name).toBeGreaterThanOrEqual(2)
      expect(e.muscles.length, e.name).toBeGreaterThan(0)
      expect(e.equipment.length, e.name).toBeGreaterThan(0)
    }
    expect(EXERCISES.filter((e) => e.warmup).length).toBeGreaterThanOrEqual(6)
    expect(EXERCISES.filter((e) => e.cooldown).length).toBeGreaterThanOrEqual(6)
  })
})

describe('Trainingsvorschläge', () => {
  it('passen zu Ort, Level und gewünschter Dauer – für alle Kombinationen', () => {
    for (const o of all()) {
      const w = generateWorkout(o)
      const label = `${o.place}/${o.focus}/${o.level}/${o.minutes}/${o.seed}`
      const exercises = w.blocks.flatMap((b) => b.items.map((i) => i.exercise))
      // Dauer: höchstens 15 % bzw. 4 Minuten daneben – Beweglichkeit darf kürzer sein
      const limit = Math.max(4, o.minutes * (o.focus === 'beweglichkeit' ? 0.2 : 0.15))
      expect(Math.abs(w.minutes - o.minutes), `${label}: ${w.minutes} Min.`).toBeLessThanOrEqual(limit)
      // Zu Hause ohne Geräte nur Körpergewicht, Matte, Stuhl; mit Hanteln zusätzlich Kurzhanteln
      if (o.place === 'zuhause') for (const e of exercises) expect(e.equipment.every((q) => HOME_EQUIPMENT.includes(q)), `${label}: ${e.name}`).toBe(true)
      if (o.place === 'hanteln') for (const e of exercises) expect(e.equipment.every((q) => [...HOME_EQUIPMENT, 'kurzhanteln'].includes(q)), `${label}: ${e.name}`).toBe(true)
      // Einsteiger bekommen keine anspruchsvollen Übungen
      if (o.level === 'einsteiger') for (const e of exercises) expect(e.level, `${label}: ${e.name}`).toBeLessThanOrEqual(2)
      // Keine Übung doppelt, Aufwärmen am Anfang, Abkühlen am Ende
      expect(new Set(exercises.map((e) => e.key)).size, label).toBe(exercises.length)
      expect(w.blocks[0].kind, label).toBe('warmup')
      expect(w.blocks.at(-1)!.kind, label).toBe('cooldown')
      // Hauptteil mit mindestens drei Übungen (Intervalle: ein Gerät)
      const main = w.blocks[1]
      expect(main.items.length, label).toBeGreaterThanOrEqual(main.kind === 'intervals' ? 1 : 3)
    }
  })

  it('nimmt im Studio Geräte und mit Hanteln die Hanteln', () => {
    const studio = generateWorkout({ place: 'studio', minutes: 45, focus: 'ganzkoerper', level: 'fortgeschritten', seed: 4 })
    const main = studio.blocks[1].items.map((i) => i.exercise)
    expect(main.some((e) => e.equipment.some((q) => ['maschine', 'kabelzug', 'langhantel', 'kurzhanteln'].includes(q)))).toBe(true)
    expect(studio.blocks[1].kind).toBe('sets')
    const hanteln = generateWorkout({ place: 'hanteln', minutes: 30, focus: 'oberkoerper', level: 'einsteiger', seed: 4 })
    expect(hanteln.blocks[1].items.filter((i) => i.exercise.equipment.includes('kurzhanteln')).length).toBeGreaterThanOrEqual(2)
    // Oberkörper heißt Oberkörper: Hauptmuskeln aus Brust, Rücken, Schultern, Armen, Rumpf
    for (const i of hanteln.blocks[1].items) expect(['brust', 'ruecken', 'schultern', 'arme', 'rumpf']).toContain(i.exercise.muscles[0])
  })

  it('wählt die Form nach Ort und Schwerpunkt', () => {
    expect(generateWorkout({ place: 'zuhause', minutes: 30, focus: 'ganzkoerper', level: 'einsteiger', seed: 1 }).blocks[1].kind).toBe('circuit')
    expect(generateWorkout({ place: 'studio', minutes: 30, focus: 'ausdauer', level: 'einsteiger', seed: 1 }).blocks[1].kind).toBe('intervals')
    expect(generateWorkout({ place: 'zuhause', minutes: 30, focus: 'beweglichkeit', level: 'einsteiger', seed: 1 }).activityKind).toBe('dehnen')
    expect(generateWorkout({ place: 'zuhause', minutes: 20, focus: 'ausdauer', level: 'fortgeschritten', seed: 1 }).activityKind).toBe('hiit')
    expect(generateWorkout({ place: 'hanteln', minutes: 30, focus: 'beine-po', level: 'einsteiger', seed: 1 }).activityKind).toBe('krafttraining')
  })

  it('liefert mit gleicher Zufallszahl dasselbe, mit anderer meist etwas anderes', () => {
    const a = generateWorkout({ place: 'zuhause', minutes: 30, focus: 'ganzkoerper', level: 'einsteiger', seed: 42 })
    const b = generateWorkout({ place: 'zuhause', minutes: 30, focus: 'ganzkoerper', level: 'einsteiger', seed: 42 })
    expect(b).toEqual(a)
    const names = (seed: number) =>
      generateWorkout({ place: 'zuhause', minutes: 30, focus: 'ganzkoerper', level: 'einsteiger', seed })
        .blocks[1].items.map((i) => i.exercise.key)
        .join()
    expect(new Set([1, 2, 3, 4, 5, 6].map(names)).size).toBeGreaterThan(3)
  })

  it('führt Schritt für Schritt: Seiten, Runden, Sätze und Pausen', () => {
    const w = generateWorkout({ place: 'zuhause', minutes: 20, focus: 'beine-po', level: 'einsteiger', seed: 3 })
    const steps = workoutSteps(w)
    const circuit = w.blocks[1]
    const workSteps = steps.filter((s) => s.block === circuit.title && s.phase === 'work')
    const expected = circuit.rounds * circuit.items.reduce((n, i) => n + (i.exercise.perSide ? 2 : 1), 0)
    expect(workSteps).toHaveLength(expected)
    expect(steps.some((s) => s.detail.includes('Seite 2'))).toBe(true)
    // Kein Schritt ohne Übung, keine Pause am Ende
    expect(steps.every((s) => s.exercise)).toBe(true)
    expect(steps.at(-1)!.phase).toBe('work')
    const sets = workoutSteps(generateWorkout({ place: 'studio', minutes: 30, focus: 'ganzkoerper', level: 'fortgeschritten', seed: 2 }))
    expect(sets.some((s) => /^Satz 1 von 3 · 8–12/.test(s.detail))).toBe(true)
    expect(sets.filter((s) => s.phase === 'rest').every((s) => s.next)).toBe(true)
  })

  it('beschreibt Mengen kurz', () => {
    const e = EXERCISES.find((x) => x.key === 'seitstuetz')!
    expect(itemAmount({ exercise: e, seconds: 30 })).toBe('30 s je Seite')
    expect(itemAmount({ exercise: EXERCISES[0], sets: 3, reps: '8–12' })).toBe('3 × 8–12')
    expect(itemAmount({ exercise: EXERCISES[0], seconds: 240 })).toBe('4 Min.')
  })
})
