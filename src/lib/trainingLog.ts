/**
 * Trainingstagebuch: selbst eingetragene Übungen mit Sätzen, Wiederholungen, Gewicht oder Zeit – gespeichert als
 * „details“ an einer Sporteinheit. Dazu „Letztes Mal“, Bestwerte und Vorlagen aus früheren Trainings.
 */
import type { ActivityLog, TrainingDetails, TrainingExercise, TrainingSet } from '../types'
import { EXERCISES, MORE_EXERCISES, exercise as catalogExercise, type Exercise, type Muscle } from '../data/exercises'
import type { Workout } from './workouts'
import { fmtInt } from './format'
import { fmtDayShort, shiftISO, todayISO } from './dates'

export const MAX_EXERCISES = 30
export const MAX_SETS = 20
export const MAX_NOTE = 500
export const MAX_NAME = 60

/** Übungen zum Eintragen: alle aus den Trainingsvorschlägen und weitere gängige aus dem Studio */
export const LOG_EXERCISES: readonly Exercise[] = [...EXERCISES, ...MORE_EXERCISES]

export const MUSCLE_LABELS: Record<Muscle, string> = {
  beine: 'Beine',
  po: 'Po',
  brust: 'Brust',
  ruecken: 'Rücken',
  schultern: 'Schultern',
  arme: 'Arme',
  rumpf: 'Bauch & Rumpf',
  ausdauer: 'Ausdauer',
  mobilitaet: 'Beweglichkeit',
}

/** Wie eine Übung gemessen wird: Wiederholungen (mit Gewicht), Sekunden (Halten) oder Minuten (Ausdauer) */
export type Measure = 'reps' | 'seconds' | 'minutes'

export function measureOf(e: Pick<TrainingExercise, 'key' | 'sets'>): Measure {
  const ex = e.key ? catalogExercise(e.key) : undefined
  if (ex?.kind === 'cardio') return 'minutes'
  if (ex?.timed) return 'seconds'
  if (ex) return 'reps'
  // Eigene Übung: wie bisher eingetragen
  const withTime = e.sets.some((s) => s.seconds !== null && s.reps === null)
  if (!withTime) return 'reps'
  return e.sets.every((s) => (s.seconds ?? 0) % 60 === 0 && (s.seconds ?? 0) >= 60) ? 'minutes' : 'seconds'
}

/** Erster Satz einer neuen Übung bzw. ein weiterer Satz (übernimmt den vorigen) */
export function newSet(measure: Measure, prev?: TrainingSet): TrainingSet {
  if (prev) return { ...prev }
  if (measure === 'minutes') return { reps: null, kg: null, seconds: 600 }
  if (measure === 'seconds') return { reps: null, kg: null, seconds: 30 }
  return { reps: 10, kg: null, seconds: null }
}

/** Übung aus dem Katalog oder eigene Übung mit einem ersten Satz */
export function newExercise(ex: Exercise | null, name = ''): TrainingExercise {
  const base = { key: ex?.key ?? null, name: (ex?.name ?? name).trim().slice(0, MAX_NAME), sets: [] as TrainingSet[] }
  const measure: Measure = ex?.kind === 'cardio' ? 'minutes' : ex?.timed ? 'seconds' : 'reps'
  return { ...base, sets: [newSet(measure)] }
}

const kgText = (kg: number) => `${String(Math.round(kg * 100) / 100).replace('.', ',')} kg`

function timeText(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  if (seconds % 60 === 0) return `${seconds / 60} Min.`
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} Min.`
}

/** „10 × 60 kg“, „12 Wdh.“, „45 s“, „10 Min.“ */
export function setLabel(s: TrainingSet): string {
  if (s.seconds !== null && s.reps === null) return s.kg ? `${timeText(s.seconds)} mit ${kgText(s.kg)}` : timeText(s.seconds)
  if (s.reps !== null && s.kg) return `${s.reps} × ${kgText(s.kg)}`
  if (s.reps !== null) return `${s.reps} Wdh.`
  if (s.kg) return kgText(s.kg)
  return ''
}

const sameSet = (a: TrainingSet, b: TrainingSet) => a.reps === b.reps && a.kg === b.kg && a.seconds === b.seconds

/** „3 Sätze à 10 × 60 kg“ oder „10 × 60 kg · 8 × 70 kg“ */
export function exerciseSummary(e: Pick<TrainingExercise, 'sets'>): string {
  const sets = e.sets.filter((s) => setLabel(s))
  if (!sets.length) return ''
  if (sets.length === 1) return setLabel(sets[0])
  if (sets.every((s) => sameSet(s, sets[0]))) return `${sets.length} Sätze à ${setLabel(sets[0])}`
  return sets.map(setLabel).join(' · ')
}

/** Bewegtes Gewicht: Wiederholungen × kg über alle Sätze */
export function trainingVolume(d: TrainingDetails): number {
  return d.exercises.reduce((sum, e) => sum + e.sets.reduce((s, x) => s + (x.reps ?? 0) * (x.kg ?? 0), 0), 0)
}

export function trainingSetCount(d: TrainingDetails): number {
  return d.exercises.reduce((n, e) => n + e.sets.length, 0)
}

/** „4 Übungen · 14 Sätze · 5.240 kg bewegt“ */
export function trainingSummary(d: TrainingDetails): string {
  const n = d.exercises.length
  const sets = trainingSetCount(d)
  const volume = Math.round(trainingVolume(d))
  const parts = [`${n} ${n === 1 ? 'Übung' : 'Übungen'}`]
  if (sets) parts.push(`${sets} ${sets === 1 ? 'Satz' : 'Sätze'}`)
  if (volume > 0) parts.push(`${fmtInt(volume)} kg bewegt`)
  return parts.join(' · ')
}

/** Name fürs Tagebuch, wenn keiner eingetragen ist: „Bankdrücken, Latzug und Kniebeugen“ */
export function defaultTrainingName(d: TrainingDetails, fallback: string): string {
  const names = d.exercises.map((e) => e.name).filter(Boolean)
  if (!names.length) return fallback
  const shown = names.slice(0, 3)
  const text = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} und ${shown[shown.length - 1]}`
  return (names.length > 3 ? `${shown.join(', ')} …` : text).slice(0, 80)
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Tag mitten im Satz: „heute“, „gestern“ oder kurz „Mo. 10.11.“ */
export function dayInSentence(date: string, today = todayISO()): string {
  if (date === today) return 'heute'
  if (date === shiftISO(today, -1)) return 'gestern'
  return fmtDayShort(date)
}

/** Dieselbe Übung? Katalog-Übungen über den Schlüssel, eigene über den Namen */
export function sameExercise(a: Pick<TrainingExercise, 'key' | 'name'>, b: Pick<TrainingExercise, 'key' | 'name'>): boolean {
  if (a.key && b.key) return a.key === b.key
  return norm(a.name) === norm(b.name)
}

/** Sporteinheiten mit Übungen, neueste zuerst */
export function trainingsOf(logs: readonly ActivityLog[]): (ActivityLog & { details: TrainingDetails })[] {
  return logs
    .filter((l): l is ActivityLog & { details: TrainingDetails } => !!l.details && Array.isArray(l.details.exercises) && l.details.exercises.length > 0)
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : (b.created_at ?? '').localeCompare(a.created_at ?? '')))
}

export interface PastPerformance {
  date: string
  logId: string
  sets: TrainingSet[]
}

/** Wann und wie die Übung zuletzt gemacht wurde – ohne das gerade bearbeitete Training */
export function lastPerformance(
  logs: readonly ActivityLog[],
  ex: Pick<TrainingExercise, 'key' | 'name'>,
  opts: { excludeId?: string; until?: string } = {},
): PastPerformance | null {
  for (const log of trainingsOf(logs)) {
    if (log.id === opts.excludeId || (opts.until && log.date > opts.until)) continue
    const found = log.details.exercises.find((e) => sameExercise(e, ex) && e.sets.length > 0)
    if (found) return { date: log.date, logId: log.id, sets: found.sets }
  }
  return null
}

/** Rangfolge eines Satzes: mehr Gewicht, dann mehr Wiederholungen bzw. längere Zeit */
function setRank(s: TrainingSet): [number, number] {
  return [s.kg ?? 0, s.reps ?? s.seconds ?? 0]
}

/** Ist Satz a besser als b? Mehr Gewicht, bei Gleichstand mehr Wiederholungen bzw. längere Zeit */
export function isBetterSet(a: TrainingSet, b: TrainingSet): boolean {
  const [ak, aa] = setRank(a)
  const [bk, ba] = setRank(b)
  return ak > bk || (ak === bk && aa > ba)
}

/** Bester Satz einer Übung in allen Trainings */
export function bestSet(logs: readonly ActivityLog[], ex: Pick<TrainingExercise, 'key' | 'name'>, excludeId?: string): { set: TrainingSet; date: string } | null {
  let best: { set: TrainingSet; date: string } | null = null
  for (const log of trainingsOf(logs)) {
    if (log.id === excludeId) continue
    for (const e of log.details.exercises) {
      if (!sameExercise(e, ex)) continue
      for (const s of e.sets) {
        if (!setLabel(s)) continue
        const [kg, amount] = setRank(s)
        const cur = best ? setRank(best.set) : null
        if (!cur || kg > cur[0] || (kg === cur[0] && amount > cur[1])) best = { set: s, date: log.date }
      }
    }
  }
  return best
}

/** Zuletzt trainierte Übungen (für die Auswahl), jede einmal */
export function recentExercises(logs: readonly ActivityLog[], limit = 8): Pick<TrainingExercise, 'key' | 'name'>[] {
  const out: Pick<TrainingExercise, 'key' | 'name'>[] = []
  for (const log of trainingsOf(logs)) {
    for (const e of log.details.exercises) {
      if (out.some((o) => sameExercise(o, e))) continue
      out.push({ key: e.key, name: e.name })
      if (out.length >= limit) return out
    }
  }
  return out
}

/** Am häufigsten trainierte Übungen mit Bestwert und letztem Mal */
export function exerciseStats(logs: readonly ActivityLog[], limit = 8) {
  const counts: { ex: Pick<TrainingExercise, 'key' | 'name'>; count: number }[] = []
  for (const log of trainingsOf(logs)) {
    for (const e of log.details.exercises) {
      const hit = counts.find((c) => sameExercise(c.ex, e))
      if (hit) hit.count++
      else counts.push({ ex: { key: e.key, name: e.name }, count: 1 })
    }
  }
  return counts
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ ex, count }) => ({ ...ex, count, best: bestSet(logs, ex), last: lastPerformance(logs, ex) }))
}

/** Suche in den Übungen: Wortanfänge zuerst, optional nur eine Muskelgruppe */
export function searchExercises(query: string, muscle: Muscle | null = null): Exercise[] {
  const q = norm(query)
  const pool = LOG_EXERCISES.filter((e) => !muscle || e.muscles.includes(muscle))
  if (!q) return [...pool].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const scored = pool
    .map((e) => {
      const n = norm(e.name)
      const score = n.startsWith(q) ? 0 : n.split(/[\s(-]+/).some((w) => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : -1
      return { e, score }
    })
    .filter((x) => x.score >= 0)
  return scored.sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name, 'de')).map((x) => x.e)
}

// --- Prüfen und Bereinigen (Eingaben, Sicherungen, Daten aus der Datenbank) -------------------------------------

const int = (v: unknown, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.round(n)) : null
}
const kg = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(1000, Math.round(n * 4) / 4) : null
}

/** Übungen und Sätze in eine saubere Form bringen; leere Sätze fallen weg. null, wenn nichts übrig bleibt. */
export function sanitizeDetails(raw: unknown): TrainingDetails | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as { exercises?: unknown; note?: unknown }
  const exercises: TrainingExercise[] = []
  for (const item of Array.isArray(r.exercises) ? r.exercises : []) {
    if (!item || typeof item !== 'object') continue
    const e = item as { key?: unknown; name?: unknown; sets?: unknown }
    const name = typeof e.name === 'string' ? e.name.trim().slice(0, MAX_NAME) : ''
    if (!name) continue
    const sets: TrainingSet[] = []
    for (const s of Array.isArray(e.sets) ? e.sets : []) {
      if (!s || typeof s !== 'object') continue
      const x = s as { reps?: unknown; kg?: unknown; seconds?: unknown }
      const set: TrainingSet = { reps: int(x.reps, 1000), kg: kg(x.kg), seconds: int(x.seconds, 86400) }
      if (set.reps !== null || set.seconds !== null || set.kg !== null) sets.push(set)
      if (sets.length >= MAX_SETS) break
    }
    const key = typeof e.key === 'string' && e.key.trim() ? e.key.trim().slice(0, 40) : null
    exercises.push({ key, name, sets })
    if (exercises.length >= MAX_EXERCISES) break
  }
  const note = typeof r.note === 'string' && r.note.trim() ? r.note.trim().slice(0, MAX_NOTE) : null
  if (!exercises.length && !note) return null
  return note ? { exercises, note } : { exercises }
}

/** Vorlage aus einem früheren Training: dieselben Übungen und Sätze */
export function templateFrom(d: TrainingDetails): TrainingDetails {
  return { exercises: d.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) }
}

const firstNumber = (s: string | undefined) => {
  const m = s?.match(/\d+/)
  return m ? Number(m[0]) : null
}

/** Geführtes Training als Tagebuch-Eintrag: Hauptteil mit Sätzen bzw. Runden (ohne Aufwärmen und Abkühlen) */
export function detailsFromWorkout(w: Workout): TrainingDetails {
  const exercises: TrainingExercise[] = []
  for (const block of w.blocks) {
    if (block.kind === 'warmup' || block.kind === 'cooldown') continue
    for (const item of block.items) {
      const count = Math.max(1, block.rounds > 1 ? block.rounds : (item.sets ?? 1))
      const reps = firstNumber(item.reps)
      const set: TrainingSet = reps !== null ? { reps, kg: null, seconds: null } : { reps: null, kg: null, seconds: item.seconds ?? null }
      if (set.reps === null && set.seconds === null) continue
      const sets = Array.from({ length: count }, () => ({ ...set }))
      const hit = exercises.find((e) => e.key === item.exercise.key)
      if (hit) hit.sets.push(...sets)
      else exercises.push({ key: item.exercise.key, name: item.exercise.name, sets })
    }
  }
  return { exercises: exercises.slice(0, MAX_EXERCISES).map((e) => ({ ...e, sets: e.sets.slice(0, MAX_SETS) })) }
}

/** Meldet die Datenbank, dass es die Spalte für Übungen noch nicht gibt (Update fehlt)? */
export function isMissingDetailsColumn(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return /details/i.test(msg) && /column|spalte|PGRST204|42703/i.test(msg)
}
