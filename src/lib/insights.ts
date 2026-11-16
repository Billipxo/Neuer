/**
 * Einblicke für den Verlauf: woher die Kalorien eines Zeitraums kommen – nach Lebensmitteln, Mahlzeiten,
 * Wochentagen und Makronährstoffen. Reine Beschreibung der eigenen Einträge, ohne Bewertung.
 */
import type { LogEntry, MealType } from '../types'
import { MEAL_TYPES } from '../types'
import { fromISODate } from './dates'

/** Ein Lebensmittel im Zeitraum – gleiche Namen zusammengefasst */
export interface FoodInsight {
  name: string
  /** Wie oft eingetragen */
  count: number
  kcal: number
  /** Anteil an allen kcal des Zeitraums (0–1) */
  share: number
}

export interface MealInsight {
  meal: MealType
  kcal: number
  /** Anteil an allen kcal des Zeitraums (0–1) */
  share: number
}

export interface WeekdayInsight {
  /** 0 = Montag … 6 = Sonntag */
  weekday: number
  /** Durchschnitt der Tage mit Einträgen an diesem Wochentag */
  avgKcal: number
  /** Tage mit Einträgen an diesem Wochentag */
  days: number
}

export interface Insights {
  /** Anzahl der Einträge im Zeitraum */
  entries: number
  totalKcal: number
  /** Die Lebensmittel mit den meisten kcal */
  byKcal: FoodInsight[]
  /** Die am häufigsten eingetragenen Lebensmittel */
  byCount: FoodInsight[]
  /** Alle Mahlzeiten in der üblichen Reihenfolge */
  meals: MealInsight[]
  /** Montag bis Sonntag */
  weekdays: WeekdayInsight[]
  /** Anteile an der Energie aus Eiweiß, Kohlenhydraten und Fett (0–1) – ohne Makroangaben null */
  energy: { protein: number; carbs: number; fat: number } | null
}

export const WEEKDAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

const num = (v: unknown) => Number(v) || 0

/** Gleiche Lebensmittel erkennen: Groß- und Kleinschreibung und doppelte Leerzeichen spielen keine Rolle */
function foodKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de')
}

/** Einblicke in einen Zeitraum – `limit` Lebensmittel je Liste */
export function periodInsights(entries: LogEntry[], limit = 5): Insights {
  const totalKcal = entries.reduce((s, e) => s + num(e.kcal), 0)
  const share = (kcal: number) => (totalKcal > 0 ? kcal / totalKcal : 0)

  const foods = new Map<string, { name: string; count: number; kcal: number }>()
  for (const e of entries) {
    const key = foodKey(e.name ?? '')
    if (!key) continue
    const f = foods.get(key) ?? { name: e.name.trim().replace(/\s+/g, ' '), count: 0, kcal: 0 }
    f.count += 1
    f.kcal += num(e.kcal)
    foods.set(key, f)
  }
  const list: FoodInsight[] = [...foods.values()].map((f) => ({ ...f, share: share(f.kcal) }))
  const byName = (a: FoodInsight, b: FoodInsight) => a.name.localeCompare(b.name, 'de')
  const byKcal = list
    .filter((f) => f.kcal > 0)
    .sort((a, b) => b.kcal - a.kcal || b.count - a.count || byName(a, b))
    .slice(0, limit)
  const byCount = [...list].sort((a, b) => b.count - a.count || b.kcal - a.kcal || byName(a, b)).slice(0, limit)

  const meals = MEAL_TYPES.map((meal) => {
    const kcal = entries.filter((e) => e.meal === meal).reduce((s, e) => s + num(e.kcal), 0)
    return { meal, kcal, share: share(kcal) }
  })

  // Wochentage: erst je Tag zusammenzählen, dann je Wochentag mitteln – Tage ohne Einträge zählen nicht mit
  const perDay = new Map<string, number>()
  for (const e of entries) perDay.set(e.date, (perDay.get(e.date) ?? 0) + num(e.kcal))
  const sums = Array.from({ length: 7 }, () => ({ kcal: 0, days: 0 }))
  for (const [date, kcal] of perDay) {
    const weekday = (fromISODate(date).getDay() + 6) % 7
    sums[weekday].kcal += kcal
    sums[weekday].days += 1
  }
  const weekdays = sums.map((s, weekday) => ({ weekday, avgKcal: s.days ? s.kcal / s.days : 0, days: s.days }))

  const protein = entries.reduce((s, e) => s + num(e.protein), 0) * 4
  const carbs = entries.reduce((s, e) => s + num(e.carbs), 0) * 4
  const fat = entries.reduce((s, e) => s + num(e.fat), 0) * 9
  const macroKcal = protein + carbs + fat
  const energy = macroKcal > 0 ? { protein: protein / macroKcal, carbs: carbs / macroKcal, fat: fat / macroKcal } : null

  return { entries: entries.length, totalKcal, byKcal, byCount, meals, weekdays, energy }
}

/** Anteil als Prozent, z. B. „23 %“ – sehr kleine Anteile als „< 1 %“ */
export function fmtShare(share: number): string {
  if (share > 0 && share < 0.005) return '< 1 %'
  return `${Math.round(share * 100)} %`
}
