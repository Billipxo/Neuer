import { Link } from 'react-router-dom'
import { Lightbulb, NotebookPen, Plus } from 'lucide-react'
import type { ActivityLog } from '../../types'
import { activityDetail, activityEmoji, summarizeActivities } from '../../lib/activity'
import { fmtInt } from '../../lib/format'
import { trainingSummary } from '../../lib/trainingLog'
import { Card } from '../ui/Card'

/** Sport & Bewegung des Tages – wie eine Mahlzeit: Kopf mit Summe, Einträge zum Antippen */
export function ActivitySection({
  date,
  activities,
  inBudget,
  unavailable,
  onAdd,
  onEdit,
}: {
  date: string
  activities: ActivityLog[]
  /** Verbrauch wird aufs Tagesziel angerechnet */
  inBudget: boolean
  /** Datenbank-Update für Sport fehlt noch */
  unavailable: boolean
  onAdd: () => void
  onEdit: (a: ActivityLog) => void
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
    </Card>
  )
}
