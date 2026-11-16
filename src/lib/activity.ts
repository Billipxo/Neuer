/**
 * Sport & Bewegung: Verbrauch schätzen und zusammenfassen.
 *
 * Gerechnet wird der zusätzliche Verbrauch ohne Grundumsatz: (MET − 1) × Körpergewicht × Stunden. Der Grundumsatz
 * steckt schon im Tagesziel; so wird nichts doppelt gezählt. Schritte: rund 1/3000 kcal je Schritt und kg Körpergewicht
 * (≈ 230 kcal für 10.000 Schritte bei 70 kg). Alles sind Richtwerte – eigene Werte, etwa von der Uhr, gehen vor.
 */
import type { ActivityLog, WeightLog } from '../types'
import { ACTIVITY_TYPES, activityType, type ActivityType } from '../data/activities'
import { fmtInt } from './format'

/** Ohne bekanntes Gewicht wird mit diesem gerechnet (und darauf hingewiesen) */
export const DEFAULT_WEIGHT_KG = 70

/** Geschätzter zusätzlicher Verbrauch einer Sporteinheit */
export function estimateKcal(type: Pick<ActivityType, 'met' | 'steps' | 'custom'>, input: { minutes?: number | null; steps?: number | null }, weightKg: number): number {
  if (type.custom) return 0
  if (type.steps) return Math.max(0, Math.round(((input.steps ?? 0) * weightKg) / 3000))
  return Math.max(0, Math.round(((type.met - 1) * weightKg * (input.minutes ?? 0)) / 60))
}

/** Aktuelles Körpergewicht: letzter Eintrag bis zum Tag, sonst das Gewicht aus dem Profil */
export function weightOn(date: string, logs: readonly WeightLog[], profileKg: number | null | undefined): { kg: number; known: boolean } {
  const last = logs.filter((w) => w.date <= date).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]
  if (last && Number(last.kg) > 0) return { kg: Number(last.kg), known: true }
  if (profileKg && profileKg > 0) return { kg: Number(profileKg), known: true }
  return { kg: DEFAULT_WEIGHT_KG, known: false }
}

/** Sportarten zu einer Suche – Name und Zweitnamen, Wortanfänge zuerst */
export function searchActivities(query: string): ActivityType[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...ACTIVITY_TYPES]
  const score = (a: ActivityType) => {
    const names = [a.name, ...(a.aliases ?? [])].map((n) => n.toLowerCase())
    if (names.some((n) => n.startsWith(q))) return 0
    if (names.some((n) => n.split(/[\s/()-]+/).some((w) => w.startsWith(q)))) return 1
    if (names.some((n) => n.includes(q))) return 2
    return -1
  }
  return ACTIVITY_TYPES.map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s >= 0)
    .sort((x, y) => x.s - y.s)
    .map((x) => x.a)
}

/** Kurzbeschreibung eines Eintrags: „30 Min.“, „8.000 Schritte“ */
export function activityDetail(a: Pick<ActivityLog, 'minutes' | 'steps'>): string {
  if (a.steps) return `${fmtInt(a.steps)} Schritte`
  if (a.minutes) return `${fmtInt(a.minutes)} Min.`
  return ''
}

export function activityEmoji(kind: string): string {
  return activityType(kind)?.emoji ?? '✨'
}

export interface ActivitySummary {
  count: number
  minutes: number
  steps: number
  kcal: number
}

export function summarizeActivities(list: readonly Pick<ActivityLog, 'minutes' | 'steps' | 'kcal'>[]): ActivitySummary {
  return list.reduce<ActivitySummary>(
    (s, a) => ({
      count: s.count + 1,
      minutes: s.minutes + (Number(a.minutes) || 0),
      steps: s.steps + (Number(a.steps) || 0),
      kcal: s.kcal + (Number(a.kcal) || 0),
    }),
    { count: 0, minutes: 0, steps: 0, kcal: 0 },
  )
}

/** Tagesziel mit Sport – nur, wenn das im Profil so eingestellt ist */
export function targetWithActivity(kcalTarget: number, activityKcal: number, inBudget: boolean | undefined): number {
  return inBudget ? kcalTarget + Math.max(0, Math.round(activityKcal)) : kcalTarget
}
