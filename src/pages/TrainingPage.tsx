import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronDown, NotebookPen, Pencil, Play, Repeat, Shuffle, Trophy } from 'lucide-react'
import { activityType } from '../data/activities'
import { isMissingTableError } from '../data/store'
import { useActivities, useActivityHistory, useProfile, useSaveActivity, useWeights } from '../hooks/data'
import { estimateKcal, weightOn } from '../lib/activity'
import { relativeDayLabel, todayISO } from '../lib/dates'
import { fmtInt } from '../lib/format'
import { unlockAudio } from '../lib/sound'
import { DURATIONS, FOCUS_LABELS, LEVEL_LABELS, PLACE_LABELS, generateWorkout, itemAmount, type Focus, type Level, type Place } from '../lib/workouts'
import { loadTrainingSettings, saveTrainingSettings, type TrainingSettings } from '../lib/trainingSettings'
import { dayInSentence, detailsFromWorkout, exerciseStats, exerciseSummary, isMissingDetailsColumn, setLabel, trainingSummary, trainingsOf } from '../lib/trainingLog'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Chip, Segmented } from '../components/ui/Segmented'
import { useToast } from '../components/ui/Toast'
import { WorkoutPlayer } from '../components/training/WorkoutPlayer'

/** Trainingsvorschläge für zu Hause und das Fitnessstudio – mit geführtem Training und Eintragen als Sport */
export function TrainingPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [settings, setSettings] = useState(loadTrainingSettings)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000))
  const [open, setOpen] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const workout = useMemo(() => generateWorkout({ ...settings, seed }), [settings, seed])

  const today = todayISO()
  const { data: profile } = useProfile()
  const { data: weights = [] } = useWeights()
  const activities = useActivities(today)
  const canLog = !(activities.error && isMissingTableError(activities.error))
  const history = useActivityHistory()
  const trainings = useMemo(() => trainingsOf(history.data ?? []), [history.data])
  const stats = useMemo(() => exerciseStats(history.data ?? [], 6), [history.data])
  const [allTrainings, setAllTrainings] = useState(false)
  const save = useSaveActivity()
  const weight = weightOn(today, weights, profile?.weight_kg)
  const type = activityType(workout.activityKind) ?? activityType('krafttraining')!
  const kcal = estimateKcal(type, { minutes: workout.minutes }, weight.kg)

  function change(p: Partial<TrainingSettings>) {
    const next = { ...settings, ...p }
    setSettings(next)
    setOpen(null)
    saveTrainingSettings(next)
  }

  async function log(minutes: number) {
    const row = {
      date: today,
      kind: type.key,
      name: `Training: ${workout.title}`.slice(0, 80),
      minutes,
      steps: null,
      kcal: estimateKcal(type, { minutes }, weight.kg),
    }
    try {
      // Mit den Übungen fürs Trainingstagebuch – fehlt dafür das Datenbank-Update, ohne sie
      await save.mutateAsync({ ...row, details: detailsFromWorkout(workout) })
    } catch (e) {
      if (!isMissingDetailsColumn(e)) throw e
      await save.mutateAsync(row)
    }
    toast('Training als Sport eingetragen', '💪')
    setPlaying(false)
    navigate('/')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-10 safe-top">
      <PageHeader title="Training" back="/" subtitle="Eigenes Training eintragen oder Vorschläge für zu Hause und das Studio" />

      <Card className="mt-2">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <NotebookPen className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Dein Trainingstagebuch</h2>
            <p className="text-sm text-muted">Übungen mit Sätzen, Wiederholungen und Gewicht – mit „Letztes Mal“ und Bestwerten zum Vergleich.</p>
          </div>
        </div>
        <Link
          to="/training/eintragen"
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 font-semibold text-brand-ink transition active:scale-[0.99]"
        >
          <NotebookPen className="size-5" aria-hidden /> Training eintragen
        </Link>
        {trainings.length > 0 && (
          <section aria-label="Deine Trainings" className="mt-4">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Zuletzt trainiert</h3>
            <ul className="mt-1 divide-y divide-line/70">
              {(allTrainings ? trainings.slice(0, 20) : trainings.slice(0, 3)).map((t) => (
                <li key={t.id} className="py-3">
                  <p className="text-xs text-muted">
                    {relativeDayLabel(t.date)}
                    {t.minutes ? ` · ${fmtInt(t.minutes)} Min.` : ''} · ≈ {fmtInt(Number(t.kcal))} kcal
                  </p>
                  <p className="font-medium leading-snug">{t.name}</p>
                  <p className="text-xs text-muted">{trainingSummary(t.details)}</p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {t.details.exercises.map((e, i) => (
                      <li key={i}>
                        <span className="font-medium">{e.name}</span>
                        {exerciseSummary(e) && <span className="text-muted tabular"> · {exerciseSummary(e)}</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Link
                      to={`/training/eintragen?vorlage=${t.id}`}
                      aria-label={`${t.name} wiederholen`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-medium transition hover:bg-line/70"
                    >
                      <Repeat className="size-4" aria-hidden /> Wiederholen
                    </Link>
                    <Link
                      to={`/training/eintragen/${t.id}`}
                      aria-label={`${t.name} bearbeiten`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition hover:bg-surface-2"
                    >
                      <Pencil className="size-4" aria-hidden /> Bearbeiten
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            {!allTrainings && trainings.length > 3 && (
              <Button variant="ghost" size="sm" onClick={() => setAllTrainings(true)}>
                Alle {Math.min(trainings.length, 20)} anzeigen
              </Button>
            )}
          </section>
        )}
      </Card>

      <h2 className="mt-6 px-1 text-lg font-bold">Training vorschlagen</h2>
      <Card className="mt-2 space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">Wo trainierst du?</p>
          <Segmented<Place> label="Ort" value={settings.place} onChange={(place) => change({ place })} options={(Object.keys(PLACE_LABELS) as Place[]).map((p) => ({ value: p, label: PLACE_LABELS[p] }))} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Wie lange?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Dauer">
            {DURATIONS.map((m) => (
              <Chip key={m} active={settings.minutes === m} onClick={() => change({ minutes: m })}>
                {m} Min.
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Schwerpunkt</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Schwerpunkt">
            {(Object.keys(FOCUS_LABELS) as Focus[]).map((f) => (
              <Chip key={f} active={settings.focus === f} onClick={() => change({ focus: f })}>
                {FOCUS_LABELS[f]}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Level</p>
          <Segmented<Level> label="Level" value={settings.level} onChange={(level) => change({ level })} options={(Object.keys(LEVEL_LABELS) as Level[]).map((l) => ({ value: l, label: LEVEL_LABELS[l] }))} />
        </div>
      </Card>

      <section aria-labelledby="workout-title" className="mt-4">
        <Card>
          <h2 id="workout-title" className="text-lg font-bold">
            {workout.title}
          </h2>
          <p className="text-sm text-muted">
            ca. {workout.minutes} Min. · ≈ {fmtInt(kcal)} kcal · {LEVEL_LABELS[settings.level]}
          </p>
          <div className="mt-3 space-y-4">
            {workout.blocks.map((b) => (
              <div key={b.title}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{b.title}</h3>
                <p className="mb-1 text-xs text-muted">{b.note}</p>
                <ol className="divide-y divide-line/70" aria-label={b.title}>
                  {b.items.map((item) => {
                    const id = `${b.title}-${item.exercise.key}`
                    const expanded = open === id
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setOpen(expanded ? null : id)}
                          className="flex min-h-12 w-full items-center gap-2 py-2 text-left"
                        >
                          <span className="min-w-0 flex-1 font-medium">{item.exercise.name}</span>
                          <span className="shrink-0 text-sm text-muted tabular-nums">{itemAmount(item)}</span>
                          <ChevronDown className={`size-4 shrink-0 text-muted transition ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                        {expanded && (
                          <div className="pb-3 text-sm">
                            <ul className="space-y-1">
                              {item.exercise.cues.map((c) => (
                                <li key={c} className="flex gap-2">
                                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                            {(item.exercise.easier || item.exercise.harder) && (
                              <p className="mt-2 text-xs text-muted">
                                {item.exercise.easier && <>Leichter: {item.exercise.easier}. </>}
                                {item.exercise.harder && <>Schwerer: {item.exercise.harder}.</>}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-3 space-y-2">
          <Button
            block
            size="lg"
            icon={<Play className="size-5" aria-hidden />}
            onClick={() => {
              unlockAudio()
              setPlaying(true)
            }}
          >
            Training starten
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={<Shuffle className="size-4" aria-hidden />} onClick={() => setSeed((s) => s + 1)}>
              Neuer Vorschlag
            </Button>
            <Button
              variant="secondary"
              icon={<CheckCircle2 className="size-4" aria-hidden />}
              disabled={!canLog || save.isPending}
              onClick={() => log(workout.minutes)}
            >
              Schon gemacht
            </Button>
          </div>
          {!canLog && (
            <p className="px-1 text-xs text-muted">Zum Eintragen fehlt noch das Datenbank-Update für Sport (setup-teil-4.sql, siehe Anleitung).</p>
          )}
        </div>
      </section>

      {stats.length > 0 && (
        <section aria-labelledby="best-title" className="mt-6">
          <h2 id="best-title" className="flex items-center gap-2 px-1 text-lg font-bold">
            <Trophy className="size-5 text-brand" aria-hidden /> Deine Bestwerte
          </h2>
          <Card className="mt-2">
            <ul className="divide-y divide-line/70" aria-label="Bestwerte je Übung">
              {stats.map((s) => (
                <li key={`${s.key ?? ''}-${s.name}`} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-muted">
                      {s.count}× trainiert{s.last ? ` · zuletzt ${dayInSentence(s.last.date)}: ${exerciseSummary(s.last)}` : ''}
                    </p>
                  </div>
                  {s.best && <span className="shrink-0 text-sm font-semibold tabular">{setLabel(s.best.set)}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <p className="mt-6 px-1 text-xs text-muted">
        Aufwärmen nicht auslassen, sauber statt schnell. Bei Schmerzen, Schwindel oder Unwohlsein aufhören. Mit Vorerkrankungen,
        in der Schwangerschaft oder nach längerer Pause vorher ärztlich abklären. Der Verbrauch ist ein Richtwert.
      </p>

      {playing && <WorkoutPlayer workout={workout} canLog={canLog} onClose={() => setPlaying(false)} onFinish={(minutes) => log(minutes)} />}
    </div>
  )
}
