import { Link } from 'react-router-dom'
import { CalendarCheck, ChevronRight } from 'lucide-react'
import { useLogRange, useProfile } from '../../hooks/data'
import { totalsByDate } from '../../lib/log'
import { weekDaysISO, weekStartISO } from '../../lib/dates'
import { fmtInt } from '../../lib/format'

/** Eine Zeile zur laufenden Woche – führt zum Wochenrückblick im Verlauf */
export function WeekGlance({ date }: { date: string }) {
  const start = weekStartISO(date)
  const days = weekDaysISO(start)
  const { data: profile } = useProfile()
  const { data: entries = [] } = useLogRange(start, days[days.length - 1])
  if (!profile) return null
  const totals = totalsByDate(entries)
  const logged = days.filter((d) => totals.has(d)).length
  if (!logged) return null
  const avg = days.reduce((s, d) => s + (totals.get(d)?.kcal ?? 0), 0) / logged
  return (
    <Link
      to={`/verlauf?ansicht=week&datum=${date}`}
      className="mt-3 flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-3 py-2 ring-1 ring-line/60 transition hover:ring-brand/40"
    >
      <CalendarCheck className="size-5 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-medium">Diese Woche:</span> {logged} von 7 Tagen protokolliert · Ø {fmtInt(avg)} kcal
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  )
}
