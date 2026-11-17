import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shuffle } from 'lucide-react'
import { ACTIVITY_TYPES } from '../../data/activities'
import { useActivityHistory, useProfile, useWeights } from '../../hooks/data'
import { useAddTrainingPlans } from '../../hooks/trainingPlan'
import { weightOn } from '../../lib/activity'
import { fmtDayLong, fmtWeekday, todayISO } from '../../lib/dates'
import { fmtInt } from '../../lib/format'
import { trainingSummary, trainingsOf } from '../../lib/trainingLog'
import { planFromSport, planFromSuggestion, planFromTraining, planKcal, type NewTrainingPlan } from '../../lib/trainingPlan'
import { loadTrainingSettings, saveTrainingSettings, type TrainingSettings } from '../../lib/trainingSettings'
import { DURATIONS, FOCUS_LABELS, LEVEL_LABELS, PLACE_LABELS, generateWorkout, type Focus, type Level, type Place } from '../../lib/workouts'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Chip, Segmented } from '../ui/Segmented'
import { NumberInput } from '../ui/NumberInput'
import { Field, Select } from '../ui/Field'
import { useToast } from '../ui/Toast'

type Mode = 'vorschlag' | 'eigenes' | 'sportart'
const MODE_LABELS: Record<Mode, string> = { vorschlag: 'Vorschlag', eigenes: 'Mein Training', sportart: 'Sportart' }
/** Sportarten zum Einplanen – Schritte plant man nicht */
const SPORTS = ACTIVITY_TYPES.filter((t) => !t.steps)
const MINUTE_CHIPS = [30, 45, 60, 90]

const newSeed = () => Math.floor(Math.random() * 1_000_000_000)

export interface TrainingPlanTarget {
  /** Vorausgewählter Tag */
  date: string
  /** Tage, aus denen gewählt werden kann (z. B. die Woche im Plan) */
  days: string[]
  /** Ein bestimmter Vorschlag, z. B. der gerade auf der Training-Seite angezeigte */
  suggestion?: { settings: TrainingSettings; seed: number }
}

/** Ein Training für einen Tag einplanen: Vorschlag der App, früheres eigenes Training oder eine Sportart */
export function TrainingPlanSheet({ target, onClose }: { target: TrainingPlanTarget | null; onClose: () => void }) {
  if (!target) return null
  return <PlanForm key={`${target.date}-${target.suggestion?.seed ?? ''}`} target={target} onClose={onClose} />
}

/** Wählbare Tage: ab heute – Vergangenes plant man nicht mehr */
function upcoming(days: string[]): string[] {
  const today = todayISO()
  const rest = days.filter((d) => d >= today)
  return rest.length ? rest : [today]
}

function PlanForm({ target, onClose }: { target: TrainingPlanTarget; onClose: () => void }) {
  const choices = upcoming(target.days)
  const toast = useToast()
  const add = useAddTrainingPlans()
  const { data: profile } = useProfile()
  const { data: weights = [] } = useWeights()
  const history = useActivityHistory()
  const [date, setDate] = useState(() => (choices.includes(target.date) ? target.date : choices[0]))
  const [mode, setMode] = useState<Mode>('vorschlag')
  const [settings, setSettings] = useState<TrainingSettings>(() => target.suggestion?.settings ?? loadTrainingSettings())
  const [seed, setSeed] = useState(() => target.suggestion?.seed ?? newSeed())
  const trainings = useMemo(() => {
    // Je Name nur das letzte – so bleibt die Liste übersichtlich
    const seen = new Set<string>()
    return trainingsOf(history.data ?? []).filter((t) => {
      const k = t.name.trim().toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [history.data])
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [kind, setKind] = useState('joggen')
  const [minutes, setMinutes] = useState<number | null>(45)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!templateId && trainings.length) setTemplateId(trainings[0].id)
  }, [templateId, trainings])

  const workout = useMemo(() => generateWorkout({ ...settings, seed }), [settings, seed])
  const weight = weightOn(date, weights, profile?.weight_kg).kg
  const template = trainings.find((t) => t.id === templateId) ?? null

  let plan: NewTrainingPlan | null = null
  if (mode === 'vorschlag') plan = planFromSuggestion(date, { ...settings, duration: settings.minutes, seed })
  else if (mode === 'eigenes') plan = template ? planFromTraining(date, template) : null
  else if (minutes || kind === 'eigene')
    plan = kind === 'eigene' && !name.trim() ? null : planFromSport(date, kind, minutes, kind === 'eigene' ? name : '')
  const kcal = plan ? planKcal(plan, weight) : 0
  const mainExercises = workout.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items.map((i) => i.exercise.name))

  const change = (p: Partial<TrainingSettings>) => setSettings((s) => ({ ...s, ...p }))

  async function submit() {
    if (!plan) return
    try {
      await add.mutateAsync([plan])
    } catch {
      toast('Einplanen hat nicht geklappt – bitte noch einmal versuchen')
      return
    }
    if (mode === 'vorschlag') saveTrainingSettings(settings)
    toast(`Training eingeplant: ${fmtDayLong(date)}`, '🗓️')
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Training einplanen"
      footer={
        <Button block size="lg" disabled={!plan || add.isPending} onClick={submit}>
          Einplanen
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">An welchem Tag?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tag">
            {choices.map((d) => (
              <Chip key={d} active={d === date} label={fmtDayLong(d)} onClick={() => setDate(d)}>
                {fmtWeekday(d)}
              </Chip>
            ))}
          </div>
        </div>

        <Segmented<Mode>
          label="Was planst du?"
          value={mode}
          onChange={setMode}
          options={(Object.keys(MODE_LABELS) as Mode[]).map((m) => ({ value: m, label: MODE_LABELS[m] }))}
        />

        {mode === 'vorschlag' && (
          <>
            <Segmented<Place>
              label="Ort"
              value={settings.place}
              onChange={(place) => change({ place })}
              options={(Object.keys(PLACE_LABELS) as Place[]).map((p) => ({ value: p, label: PLACE_LABELS[p] }))}
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dauer">
              {DURATIONS.map((m) => (
                <Chip key={m} active={settings.minutes === m} onClick={() => change({ minutes: m })}>
                  {m} Min.
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Schwerpunkt">
              {(Object.keys(FOCUS_LABELS) as Focus[]).map((f) => (
                <Chip key={f} active={settings.focus === f} onClick={() => change({ focus: f })}>
                  {FOCUS_LABELS[f]}
                </Chip>
              ))}
            </div>
            <Segmented<Level>
              label="Level"
              value={settings.level}
              onChange={(level) => change({ level })}
              options={(Object.keys(LEVEL_LABELS) as Level[]).map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
            />
            <div className="rounded-2xl bg-surface-2 p-3" aria-live="polite">
              <p className="font-semibold">{workout.title}</p>
              <p className="text-sm text-muted tabular">
                ca. {workout.minutes} Min. · ≈ {fmtInt(kcal)} kcal
              </p>
              <p className="mt-1 text-sm">{mainExercises.slice(0, 6).join(' · ')}</p>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 mt-1"
                icon={<Shuffle className="size-4" aria-hidden />}
                onClick={() => setSeed(newSeed())}
              >
                Anderer Vorschlag
              </Button>
            </div>
          </>
        )}

        {mode === 'eigenes' &&
          (trainings.length ? (
            <div className="divide-y divide-line/70 rounded-2xl bg-surface-2/60" role="radiogroup" aria-label="Früheres Training">
              {trainings.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={t.id === templateId}
                  onClick={() => setTemplateId(t.id)}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
                >
                  <span
                    aria-hidden
                    className={`size-5 shrink-0 rounded-full border-2 ${t.id === templateId ? 'border-brand bg-brand shadow-[inset_0_0_0_3px_var(--c-surface)]' : 'border-line'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block text-xs text-muted">{trainingSummary(t.details)}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-surface-2 p-3 text-sm text-muted">
              Noch kein eigenes Training eingetragen. Im{' '}
              <Link to="/training/eintragen" className="font-semibold text-brand">
                Trainingstagebuch
              </Link>{' '}
              hältst du Übungen, Sätze und Gewichte fest – danach lässt sich das Training hier mit einem Tipp wieder einplanen.
            </p>
          ))}

        {mode === 'sportart' && (
          <>
            <Select
              label="Sportart"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={SPORTS.map((t) => ({ value: t.key, label: `${t.emoji} ${t.name}` }))}
            />
            {kind === 'eigene' && (
              <Field
                label="Name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Tanzkurs oder Vereinstraining"
              />
            )}
            <NumberInput label="Dauer" suffix="Min." value={minutes} min={0} max={1440} onChange={setMinutes} />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Schnellauswahl Dauer">
              {MINUTE_CHIPS.map((m) => (
                <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                  {m} Min.
                </Chip>
              ))}
            </div>
            {kcal > 0 && <p className="text-sm text-muted tabular">≈ {fmtInt(kcal)} kcal zusätzlicher Verbrauch (Richtwert)</p>}
          </>
        )}
      </div>
    </Sheet>
  )
}
