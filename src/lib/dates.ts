import { addDays, format, parseISO, startOfWeek, isValid } from 'date-fns'
import { de } from 'date-fns/locale'

export const ISO = 'yyyy-MM-dd'

export function toISODate(d: Date): string {
  return format(d, ISO)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function fromISODate(s: string): Date {
  const d = parseISO(s)
  return isValid(d) ? d : new Date()
}

export function shiftISO(s: string, days: number): string {
  return toISODate(addDays(fromISODate(s), days))
}

/** Montag der Woche, in der das Datum liegt */
export function weekStartISO(s: string): string {
  return toISODate(startOfWeek(fromISODate(s), { weekStartsOn: 1 }))
}

export function weekDaysISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftISO(weekStart, i))
}

/** Liste aller Tage von start bis end (inklusive) */
export function rangeISO(start: string, end: string): string[] {
  const out: string[] = []
  let cur = start
  let guard = 0
  while (cur <= end && guard++ < 1000) {
    out.push(cur)
    cur = shiftISO(cur, 1)
  }
  return out
}

export function fmtDayLong(s: string): string {
  return format(fromISODate(s), 'EEEE, d. MMMM', { locale: de })
}

export function fmtDayShort(s: string): string {
  return format(fromISODate(s), 'EEE d.M.', { locale: de })
}

export function fmtWeekday(s: string): string {
  return format(fromISODate(s), 'EEEEEE', { locale: de })
}

export function fmtDate(s: string): string {
  return format(fromISODate(s), 'dd.MM.yyyy', { locale: de })
}

export function relativeDayLabel(s: string, today = todayISO()): string {
  if (s === today) return 'Heute'
  if (s === shiftISO(today, -1)) return 'Gestern'
  if (s === shiftISO(today, 1)) return 'Morgen'
  return fmtDayLong(s)
}
