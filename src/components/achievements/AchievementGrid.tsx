import { Flame } from 'lucide-react'
import { useAchievementOverview } from '../../hooks/achievements'
import { fmtDate } from '../../lib/dates'
import { Card } from '../ui/Card'
import { Spinner } from '../ui/EmptyState'

export function StreakCard() {
  const o = useAchievementOverview()
  if (!o) return null
  return (
    <Card className="flex items-center gap-4">
      <span className={`flex size-14 items-center justify-center rounded-2xl ${o.streak ? 'bg-over/15 text-over' : 'bg-surface-2 text-muted'}`}>
        <Flame className="size-7" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-bold tabular">
          {o.streak} {o.streak === 1 ? 'Tag' : 'Tage'} in Folge
        </p>
        <p className="text-sm text-muted">
          {o.streak ? 'Protokolliert – weiter so, ganz ohne Druck.' : 'Trag heute etwas ein, um eine neue Serie zu starten.'}
        </p>
      </div>
    </Card>
  )
}

export function AchievementGrid() {
  const o = useAchievementOverview()
  if (!o) return <Spinner />
  const done = o.items.filter((i) => i.unlockedAt || i.reached).length
  return (
    <>
      <p className="mb-2 px-1 text-sm text-muted">
        {done} von {o.items.length} Abzeichen
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {o.items.map(({ def, progress, reached, unlockedAt }) => {
          const unlocked = Boolean(unlockedAt) || reached
          const pct = (progress.current / progress.goal) * 100
          return (
            <li key={def.key} className={`rounded-3xl p-3 ring-1 ${unlocked ? 'bg-brand-soft/60 ring-brand/30' : 'bg-surface ring-line/60'}`}>
              <div className="flex items-start gap-2">
                <span aria-hidden className={`text-3xl ${unlocked ? '' : 'opacity-40 grayscale'}`}>
                  {def.emoji}
                </span>
                <span className="sr-only">{unlocked ? 'Freigeschaltet:' : 'Noch offen:'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{def.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{def.description}</p>
                </div>
              </div>
              {unlocked ? (
                <p className="mt-2 text-xs font-medium text-brand">{unlockedAt ? `Seit ${fmtDate(unlockedAt.slice(0, 10))}` : 'Erreicht'}</p>
              ) : (
                <div className="mt-2">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-label={`Fortschritt ${def.title}`}
                    aria-valuemin={0}
                    aria-valuemax={progress.goal}
                    aria-valuenow={progress.current}
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted tabular">
                    {progress.current} / {progress.goal}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
