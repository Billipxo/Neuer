import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAchievementOverview } from '../../hooks/achievements'
import { GROUP_LABELS, GROUP_ORDER, streakLength, type AchievementDef, type AchievementProgress, type Streak } from '../../lib/achievements'
import { fmtDate } from '../../lib/dates'
import { Card } from '../ui/Card'
import { Spinner } from '../ui/EmptyState'

type Item = { def: AchievementDef; progress: AchievementProgress; reached: boolean; unlockedAt: string | null }

const isUnlocked = (i: Item) => Boolean(i.unlockedAt) || i.reached

/** Hinweis zu einer Serie – ohne Druck, ein Neubeginn ist jederzeit möglich */
function streakHint(s: Streak): string {
  if (s.key === 'sport') return 'Einmal Sport pro Woche hält die Serie – die laufende Woche zählt, sobald du etwas einträgst.'
  if (s.key === 'water') return s.current ? 'Jeder Tag mit erreichtem Wasserziel zählt.' : 'Erreichst du dein Wasserziel, beginnt eine neue Serie.'
  return s.current ? 'Protokolliert – weiter so, ganz ohne Druck.' : 'Mit dem nächsten Eintrag beginnt eine neue Serie.'
}

/** Laufende Serien mit Rekord: Einträge, Wasserziel und Sport */
export function SeriesCard() {
  const o = useAchievementOverview()
  if (!o) return <Spinner />
  return (
    <Card className="p-0">
      <ul className="divide-y divide-line/70" aria-label="Deine Serien">
        {o.streaks.map((s) => (
          <li key={s.key} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${s.current ? 'bg-brand-soft' : 'bg-surface-2 opacity-60 grayscale'}`}
            >
              {s.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{s.title}</p>
              <p className="text-lg font-bold leading-tight tabular">
                {s.current ? `${streakLength(s.current, s.unit)} in Folge` : 'Bereit für eine neue Serie'}
              </p>
              <p className="mt-0.5 text-xs text-muted">{streakHint(s)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted">Rekord</p>
              <p className="font-semibold tabular">{streakLength(s.best, s.unit)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Ein Abzeichen: freigeschaltet mit Datum, sonst mit Fortschritt */
function BadgeTile({ item }: { item: Item }) {
  const { def, progress, unlockedAt } = item
  const unlocked = isUnlocked(item)
  const pct = (progress.current / progress.goal) * 100
  return (
    <li className={`rounded-3xl p-3 ring-1 ${unlocked ? 'bg-brand-soft/60 ring-brand/30' : 'bg-surface ring-line/60'}`}>
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
}

/** Die offenen Abzeichen, denen man am nächsten ist */
export function NextUp() {
  const o = useAchievementOverview()
  if (!o) return null
  const next = o.items
    .filter((i) => !isUnlocked(i) && i.progress.current > 0)
    .sort((a, b) => b.progress.current / b.progress.goal - a.progress.current / a.progress.goal)
    .slice(0, 3)
  if (!next.length) return null
  return (
    <section aria-labelledby="next-up">
      <h2 id="next-up" className="mb-2 mt-6 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Fast geschafft
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {next.map((i) => (
          <BadgeTile key={i.def.key} item={i} />
        ))}
      </ul>
    </section>
  )
}

/** Alle Abzeichen, nach Bereichen geordnet */
export function AchievementGroups() {
  const o = useAchievementOverview()
  if (!o) return <Spinner />
  const done = o.items.filter(isUnlocked).length
  return (
    <>
      <p className="mb-2 mt-6 px-1 text-sm text-muted">
        {done} von {o.items.length} Abzeichen
      </p>
      {GROUP_ORDER.map((g) => {
        const items = o.items.filter((i) => i.def.group === g)
        if (!items.length) return null
        return (
          <section key={g} aria-labelledby={`group-${g}`}>
            <h2 id={`group-${g}`} className="mb-2 mt-6 flex items-center justify-between px-1 text-sm font-semibold uppercase tracking-wide text-muted">
              {GROUP_LABELS[g]}
              <span className="text-xs font-medium normal-case tabular">
                {items.filter(isUnlocked).length} / {items.length}
              </span>
            </h2>
            <ul className="grid grid-cols-2 gap-2" aria-label={`Abzeichen: ${GROUP_LABELS[g]}`}>
              {items.map((i) => (
                <BadgeTile key={i.def.key} item={i} />
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

/** Kurzüberblick im Profil: Serie, Anzahl, zuletzt freigeschaltet – mit Link zur Seite „Erfolge“ */
export function AchievementSummaryCard() {
  const o = useAchievementOverview()
  if (!o) return <Spinner />
  const done = o.items.filter(isUnlocked)
  const recent = [...done]
    .filter((i) => i.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
    .slice(0, 5)
  const log = o.streaks.find((s) => s.key === 'log')!
  return (
    <Link to="/erfolge" className="block rounded-3xl bg-surface p-4 ring-1 ring-line/60 transition active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-3xl">
          🏆
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {done.length} von {o.items.length} Abzeichen
          </p>
          <p className="text-sm text-muted tabular">
            {log.current ? `🔥 ${streakLength(log.current, 'day')} in Folge protokolliert` : 'Bereit für eine neue Serie'} · Rekord{' '}
            {streakLength(log.best, 'day')}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </div>
      {recent.length > 0 && (
        <p className="mt-3 text-2xl tracking-wider" aria-label={`Zuletzt erreicht: ${recent.map((i) => i.def.title).join(', ')}`}>
          {recent.map((i) => i.def.emoji).join(' ')}
        </p>
      )}
      <p className="mt-2 text-sm font-semibold text-brand">Alle Erfolge und Serien</p>
    </Link>
  )
}

/** Kleine Anzeige der laufenden Serie für die Tagesseite */
export function StreakChip() {
  const o = useAchievementOverview()
  const log = o?.streaks.find((s) => s.key === 'log')
  const n = log?.current ?? 0
  return (
    <Link
      to="/erfolge"
      aria-label={n ? `${streakLength(n, 'day')} in Folge protokolliert – Erfolge ansehen` : 'Erfolge ansehen'}
      className="flex h-11 items-center gap-1 rounded-full bg-surface px-3 text-sm font-semibold ring-1 ring-line tabular"
    >
      <span aria-hidden>{n ? '🔥' : '🏆'}</span>
      {n > 0 && <span aria-hidden>{n}</span>}
    </Link>
  )
}
