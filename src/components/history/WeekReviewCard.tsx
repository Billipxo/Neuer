import { CalendarCheck } from 'lucide-react'
import type { LogEntry, Profile, WaterLog, WeightLog } from '../../types'
import { reviewLines, weekReview } from '../../lib/progress'
import { fmtDayShort, todayISO } from '../../lib/dates'
import { Card } from '../ui/Card'

/** Neutrale Wochenbilanz: Beobachtungen aus den eigenen Einträgen, keine Bewertung */
export function WeekReviewCard({
  days,
  entries,
  water,
  weights,
  profile,
}: {
  days: string[]
  entries: LogEntry[]
  water: WaterLog[]
  weights: WeightLog[]
  profile: Profile
}) {
  const review = weekReview({
    days,
    log: entries,
    water,
    weights,
    kcalTarget: profile.kcal_target,
    waterTarget: profile.water_target_ml,
    macros: { protein: profile.protein_pct, carbs: profile.carbs_pct, fat: profile.fat_pct },
  })
  const lines = reviewLines(review)
  const current = days.includes(todayISO())
  return (
    <Card>
      <h3 className="flex items-center gap-2 font-semibold">
        <CalendarCheck className="size-4 text-brand" aria-hidden /> Wochenrückblick
      </h3>
      <p className="text-xs text-muted">{current ? 'Diese Woche bisher' : `${fmtDayShort(days[0])} – ${fmtDayShort(days[days.length - 1])}`} · ohne Wertung</p>
      <ul className="mt-2 space-y-1 text-sm">
        {lines.map((l) => (
          <li key={l} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
