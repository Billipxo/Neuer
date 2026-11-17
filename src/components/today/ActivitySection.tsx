import { Link } from 'react-router-dom'
import { CalendarCheck, Lightbulb, NotebookPen, Plus } from 'lucide-react'
import type { ActivityLog, TrainingPlan } from '../../types'
import { activityDetail, activityEmoji, summarizeActivities } from '../../lib/activity'
import { fmtInt } from '../../lib/format'
import { trainingSummary } from '../../lib/trainingLog'
import { planDetail } from '../../lib/trainingPlan'
import { Card } from '../ui/Card'

/** Sport & Bewegung des Tages – wie eine Mahlzeit: Kopf mit Summe, Einträge zum Antippen */
export function ActivitySection({
  date,
  activities,
  inBudget,
  unavailable,
  onAdd,
  onEdit,
  planned = [],
  onOpenPlan,
  onCompletePlan,
}: {
  date: string
  activities: ActivityLog[]
  /** Verbrauch wird aufs Tagesziel angerechnet */
  inBudget: boolean
  /** Datenbank-Update für Sport fehlt noch */
  unavailable: boolean
  onAdd: () => void
  onEdit: (a: ActivityLog) => void
  /** Für den Tag geplantes Training, das noch nicht eingetragen ist */
  planned?: TrainingPlan[]
  onOpenPlan?: (p: TrainingPlan) => void
  /** Geplantes als erledigt eintragen – fehlt bei Tagen in der Zukunft */
  onCompletePlan?: (p: TrainingPlan) => void
}) {
  const sum = summarizeActivities(activities)
  return (
    <Card className="p-0">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <span aria-hidden className="text-2xl">
          🏃
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Sport & Bewegung</h3>
          <p className="text-xs text-muted tabular">
            {unavailable
              ? 'Noch nicht eingerichtet'
              : activities.length
                ? `≈ ${fmtInt(sum.kcal)} kcal${inBudget ? ' · aufs Tagesziel angerechnet' : ''}`
                : planned.length
                  ? `${planned.length === 1 ? 'Ein Training' : `${planned.length} Trainings`} geplant`
                  : 'Noch nichts eingetragen'}
          </p>
        </div>
        {!unavailable && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Sport eintragen"
            className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand transition active:scale-95"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        )}
      </div>
      {unavailable && (
        <p className="px-4 pb-3 text-sm text-muted">
          Für das Sport-Tagebuch fehlt noch ein kurzes Datenbank-Update: In Supabase im SQL Editor einmal
          <strong> setup-teil-4.sql</strong> ausführen (Anleitung: ANLEITUNG.md, „Update: Sport“).
        </p>
      )}
      <div className="flex flex-col border-t border-line/70 px-2 py-1">
        {!unavailable && (
          <Link
            to={`/training/eintragen?datum=${date}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <NotebookPen className="size-4" aria-hidden /> Training eintragen – Übungen, Sätze, Gewichte
          </Link>
        )}
        <Link
          to="/training"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <Lightbulb className="size-4" aria-hidden /> Training vorschlagen – zu Hause oder im Studio
        </Link>
      </div>
      {activities.length > 0 && (
        <ul className="border-t border-line/70" aria-label="Sport an diesem Tag">
          {activities.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onEdit(a)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-surface-2/60"
              >
                <span aria-hidden className="text-lg">
                  {activityEmoji(a.kind)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{a.name}</p>
                  <p className="text-xs text-muted">
                    {a.details?.exercises?.length ? [activityDetail(a), trainingSummary(a.details)].filter(Boolean).join(' · ') : activityDetail(a)}
                  </p>
                </div>
                <span className="text-sm font-medium tabular">≈ {fmtInt(Number(a.kcal))} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {planned.length > 0 && (
        <ul className="border-t border-dashed border-line" aria-label="Geplantes Training">
          {planned.map((p) => (
            <li key={p.id} className="flex min-h-14 items-center gap-1 pr-4">
              <button
                type="button"
                onClick={() => onOpenPlan?.(p)}
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left transition hover:bg-surface-2/60"
              >
                <CalendarCheck className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-muted">{p.title}</span>
                  <span className="block text-xs text-muted">Geplant{planDetail(p) ? ` · ${planDetail(p)}` : ''}</span>
                </span>
              </button>
              {onCompletePlan && (
                <button
                  type="button"
                  onClick={() => onCompletePlan(p)}
                  aria-label={`${p.title} als erledigt eintragen`}
                  className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-brand-soft px-3 text-sm font-semibold text-brand transition active:scale-95"
                >
                  Erledigt
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
