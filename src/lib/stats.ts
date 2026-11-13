import type { LogEntry, Nutrients, WaterLog, WeightLog } from '../types'
import { totalsByDate } from './log'
import { isWithinTarget, ZERO } from './nutrition'
import { fmtWeekday, fromISODate } from './dates'
import { format } from 'date-fns'

export interface DayPoint extends Nutrients {
  date: string
  label: string
  logged: boolean
}

/** Tageswerte für eine Liste von Tagen; Tage ohne Einträge haben 0 und logged=false */
export function dailySeries(entries: LogEntry[], days: string[]): DayPoint[] {
  const totals = totalsByDate(entries)
  const short = days.length <= 7
  return days.map((date) => {
    const t = totals.get(date)
    return {
      date,
      label: short ? fmtWeekday(date) : format(fromISODate(date), 'd.'),
      logged: Boolean(t),
      ...(t ?? ZERO),
    }
  })
}

export interface PeriodStats {
  loggedDays: number
  avg: Nutrients
  daysInTarget: number
}

/** Durchschnitt über protokollierte Tage und Anzahl Tage im Zielbereich (±10 %) */
export function periodStats(series: DayPoint[], target: number): PeriodStats {
  const logged = series.filter((d) => d.logged)
  const n = logged.length
  const sum = logged.reduce<Nutrients>(
    (a, d) => ({ kcal: a.kcal + d.kcal, protein: a.protein + d.protein, carbs: a.carbs + d.carbs, fat: a.fat + d.fat }),
    { ...ZERO },
  )
  return {
    loggedDays: n,
    avg: n ? { kcal: sum.kcal / n, protein: sum.protein / n, carbs: sum.carbs / n, fat: sum.fat / n } : { ...ZERO },
    daysInTarget: logged.filter((d) => isWithinTarget(d.kcal, target)).length,
  }
}

export function waterByDate(logs: WaterLog[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const w of logs) m.set(w.date, (m.get(w.date) ?? 0) + Number(w.ml))
  return m
}

export function waterSeries(logs: WaterLog[], days: string[]) {
  const m = waterByDate(logs)
  const short = days.length <= 7
  return days.map((date) => ({ date, label: short ? fmtWeekday(date) : format(fromISODate(date), 'd.'), ml: m.get(date) ?? 0 }))
}

/** Gewichtsverlauf im Zeitraum (ein Wert pro Tag, letzter gewinnt) */
export function weightSeries(logs: WeightLog[], from: string, to: string) {
  const m = new Map<string, number>()
  for (const w of [...logs].sort((a, b) => (a.date < b.date ? -1 : 1))) if (w.date >= from && w.date <= to) m.set(w.date, Number(w.kg))
  return [...m].map(([date, kg]) => ({ date, label: format(fromISODate(date), 'd.M.'), kg }))
}
