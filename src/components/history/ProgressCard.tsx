import { Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import type { Profile, WeightLog } from '../../types'
import { fmtSignedKg, goalProgress, weightTrend } from '../../lib/progress'
import { fmt1 } from '../../lib/format'
import { fmtDate } from '../../lib/dates'
import { Card } from '../ui/Card'

/** Gewichtstrend (7-Tage-Mittel, Veränderung pro Woche) und Weg zum Zielgewicht – als Hochrechnung, nicht als Versprechen */
export function ProgressCard({ weights, profile }: { weights: WeightLog[]; profile: Profile }) {
  const trend = weightTrend(weights)
  if (!trend.latest || !trend.first) return null
  const goal = goalProgress(trend, profile.target_weight_kg)
  const current = trend.smoothed ?? trend.latest.kg
  const smoothedDiffers = trend.smoothed !== null && Math.abs(trend.smoothed - trend.latest.kg) >= 0.05
  const percent = Math.round((goal?.share ?? 0) * 100)

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Target className="size-4 text-brand" aria-hidden /> Gewicht & Ziel
          </h3>
          <p className="mt-1 text-2xl font-bold tabular">{fmt1(current)} kg</p>
          <p className="text-xs text-muted">
            {smoothedDiffers ? `7-Tage-Mittel · zuletzt ${fmt1(trend.latest.kg)} kg` : `zuletzt am ${fmtDate(trend.latest.date)}`}
          </p>
        </div>
        <div className="shrink-0 text-right text-sm tabular">
          <p className="font-medium">{trend.weeklyChange !== null ? `${fmtSignedKg(trend.weeklyChange)} pro Woche` : 'Noch kein Trend'}</p>
          <p className="text-xs text-muted">{trend.weeklyChange !== null ? 'aus den letzten 4 Wochen' : 'ab 3 Einträgen in 4 Wochen'}</p>
        </div>
      </div>

      {goal ? (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted tabular">
            <span>Start {fmt1(trend.first.kg)} kg</span>
            <span>Ziel {fmt1(goal.target)} kg</span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Weg zum Zielgewicht"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-sm">
            {goal.reached ? 'Du bist an deinem Zielgewicht.' : `Noch ${fmt1(Math.abs(goal.remaining))} kg bis ${fmt1(goal.target)} kg.`}
            {!goal.reached &&
              goal.weeksAtTrend !== null &&
              ` Beim aktuellen Trend in etwa ${goal.weeksAtTrend} ${goal.weeksAtTrend === 1 ? 'Woche' : 'Wochen'} – eine Hochrechnung, kein Versprechen.`}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {trend.first.date !== trend.latest.date && trend.totalChange !== null ? `${fmtSignedKg(trend.totalChange)} seit dem ersten Eintrag am ${fmtDate(trend.first.date)}. ` : ''}
          <Link to="/profil" className="font-medium text-brand">
            Zielgewicht im Profil festlegen
          </Link>
          , um den Weg dorthin zu sehen – ganz ohne Druck.
        </p>
      )}
    </Card>
  )
}
