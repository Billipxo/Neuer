import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, Plus, Trash2, Trophy, X } from 'lucide-react'
import type { TrainingExercise, TrainingSet } from '../types'
import { ACTIVITY_TYPES, activityType } from '../data/activities'
import type { Exercise } from '../data/exercises'
import { isMissingTableError } from '../data/store'
import { useActivity, useActivityHistory, useDeleteActivity, useProfile, useSaveActivity, useWeights } from '../hooks/data'
import { useUndoToast } from '../hooks/undo'
import { DEFAULT_WEIGHT_KG, estimateKcal, weightOn } from '../lib/activity'
import { todayISO } from '../lib/dates'
import { fmtInt } from '../lib/format'
import {
  MAX_EXERCISES,
  MAX_SETS,
  bestSet,
  dayInSentence,
  defaultTrainingName,
  exerciseSummary,
  isMissingDetailsColumn,
  lastPerformance,
  measureOf,
  newExercise,
  newSet,
  recentExercises,
  sanitizeDetails,
  setLabel,
  templateFrom,
  trainingSummary,
  type Measure,
} from '../lib/trainingLog'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Field, Select, TextArea } from '../components/ui/Field'
import { NumberInput } from '../components/ui/NumberInput'
import { Chip } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'
import { EmptyState, Spinner } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { ExercisePickerSheet } from '../components/training/ExercisePickerSheet'

const MINUTE_CHIPS = [30, 45, 60, 90]
/** Sportarten fürs Trainingstagebuch – alles außer Schritten, alphabetisch */
const KINDS = ACTIVITY_TYPES.filter((t) => !t.steps).sort((a, b) => a.name.localeCompare(b.name, 'de'))

/**
 * Eigenes Training eintragen oder bearbeiten: Übungen mit Sätzen (Wiederholungen und Gewicht, Sekunden oder Minuten),
 * Dauer, Verbrauch und Notiz. Zu jeder Übung steht, wie es letztes Mal lief und was der Bestwert ist.
 */
export function TrainingLogPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const undoToast = useUndoToast()
  const { data: profile } = useProfile()
  const { data: weights = [] } = useWeights()
  const history = useActivityHistory()
  const existing = useActivity(id)
  const save = useSaveActivity()
  const del = useDeleteActivity()

  const [ready, setReady] = useState(false)
  const [date, setDate] = useState(params.get('datum') ?? todayISO())
  const [kind, setKind] = useState('krafttraining')
  const [title, setTitle] = useState('')
  const [exercises, setExercises] = useState<TrainingExercise[]>([])
  const [minutes, setMinutes] = useState<number | null>(45)
  const [useOwn, setUseOwn] = useState(false)
  const [ownKcal, setOwnKcal] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [picker, setPicker] = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(false)

  const logs = useMemo(() => history.data ?? [], [history.data])
  const templateId = params.get('vorlage')
  const type = activityType(kind) ?? activityType('krafttraining')!
  const unavailable = !!history.error && isMissingTableError(history.error)

  // Entwurf anlegen: ein vorhandenes Training, eine Vorlage aus einem früheren oder ein leeres
  useEffect(() => {
    if (ready) return
    if (id) {
      if (existing.isLoading || !existing.data) return
      const a = existing.data
      const t = activityType(a.kind)
      setDate(a.date)
      setKind(t && !t.steps ? a.kind : 'krafttraining')
      setExercises(a.details ? templateFrom(a.details).exercises : [])
      setNote(a.details?.note ?? '')
      setMinutes(a.minutes)
      setTitle(a.details && a.name === defaultTrainingName(a.details, t?.name ?? '') ? '' : a.name)
      const estimate = t ? estimateKcal(t, { minutes: a.minutes }, weightOn(a.date, weights, profile?.weight_kg).kg) : -1
      setUseOwn(estimate !== a.kcal)
      setOwnKcal(a.kcal)
      setReady(true)
      return
    }
    if (templateId) {
      if (history.isLoading) return
      const t = logs.find((l) => l.id === templateId)
      if (t?.details) {
        setExercises(templateFrom(t.details).exercises)
        setKind(activityType(t.kind) && !activityType(t.kind)?.steps ? t.kind : 'krafttraining')
        setMinutes(t.minutes ?? 45)
        setTitle(t.name === defaultTrainingName(t.details, activityType(t.kind)?.name ?? '') ? '' : t.name)
      }
    }
    setReady(true)
  }, [ready, id, existing.isLoading, existing.data, templateId, history.isLoading, logs, weights, profile?.weight_kg])

  const weight = weightOn(date, weights, profile?.weight_kg)
  const estimate = estimateKcal(type, { minutes }, weight.kg)
  const kcal = useOwn ? (ownKcal ?? 0) : estimate
  const details = sanitizeDetails({ exercises, note })
  const valid = exercises.length > 0 && !!date && (useOwn ? ownKcal !== null : !!minutes && minutes > 0)
  const busy = save.isPending || del.isPending
  const recent = useMemo(() => recentExercises(logs), [logs])

  if (id && !existing.isLoading && !existing.data) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 safe-top">
        <PageHeader title="Training" back="/training" />
        <EmptyState title="Training nicht gefunden" text="Vielleicht wurde es gelöscht." />
      </div>
    )
  }
  if (!ready) return <Spinner />

  const patchExercise = (i: number, fn: (e: TrainingExercise) => TrainingExercise) => setExercises((l) => l.map((e, j) => (j === i ? fn(e) : e)))
  const patchSet = (i: number, si: number, p: Partial<TrainingSet>) =>
    patchExercise(i, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...p } : s)) }))

  function addExercise(ex: Exercise | null, name: string) {
    setPicker(false)
    if (exercises.length >= MAX_EXERCISES) {
      toast(`Höchstens ${MAX_EXERCISES} Übungen pro Training`)
      return
    }
    const fresh = newExercise(ex, name)
    // Wie letztes Mal vorausfüllen – meist ändert sich nur wenig
    const last = lastPerformance(logs, fresh, { excludeId: id })
    setExercises((l) => [...l, last ? { ...fresh, sets: last.sets.map((s) => ({ ...s })) } : fresh])
  }

  function leave() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/training', { replace: true })
  }

  async function submit(withDetails = true) {
    if (!valid) return
    const name = (title.trim() || defaultTrainingName(details ?? { exercises: [] }, type.name)).slice(0, 80)
    const row = {
      date,
      kind: type.key,
      name,
      minutes: minutes && minutes > 0 ? Math.round(minutes) : null,
      steps: null,
      kcal: Math.max(0, Math.round(kcal)),
      ...(withDetails ? { details } : {}),
    }
    try {
      await save.mutateAsync(id ? { id, ...row } : row)
    } catch (e) {
      if (withDetails && isMissingDetailsColumn(e)) {
        setNeedsUpdate(true)
        return
      }
      toast('Speichern hat nicht geklappt – bitte noch einmal versuchen')
      return
    }
    toast(id ? 'Training gespeichert' : 'Training eingetragen', '💪')
    leave()
  }

  async function remove() {
    if (!existing.data) return
    await del.mutateAsync(existing.data.id)
    undoToast('Training gelöscht', 'activity_logs', [existing.data])
    leave()
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-48 safe-top">
      <PageHeader title={id ? 'Training bearbeiten' : 'Training eintragen'} subtitle="Übungen, Sätze und Gewichte" back />

      {unavailable && (
        <Card className="mt-2 text-sm">
          Für das Sport-Tagebuch fehlt noch ein Datenbank-Update: In Supabase im SQL Editor <strong>setup-teil-4.sql</strong> ausführen
          (Anleitung: ANLEITUNG.md, „Update: Sport“).
        </Card>
      )}

      <Card className="mt-2 space-y-3">
        <Field label="Datum" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        <Select label="Sportart" value={kind} onChange={(e) => setKind(e.target.value)} options={KINDS.map((t) => ({ value: t.key, label: `${t.emoji} ${t.name}` }))} />
        <Field label="Name (optional)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Oberkörper, Beine oder Push-Tag" />
      </Card>

      <SectionTitle>Übungen</SectionTitle>
      {exercises.length === 0 && (
        <p className="px-1 text-sm text-muted">
          Füge die Übungen hinzu, die du gemacht hast – mit Sätzen, Wiederholungen und Gewicht. Was du letztes Mal geschafft hast, steht gleich
          dabei.
        </p>
      )}
      <ol className="space-y-3" aria-label="Übungen im Training">
        {exercises.map((e, i) => (
          <ExerciseCard
            key={i}
            exercise={e}
            last={lastPerformance(logs, e, { excludeId: id })}
            best={bestSet(logs, e, id)}
            onRemove={() => setExercises((l) => l.filter((_, j) => j !== i))}
            onSet={(si, p) => patchSet(i, si, p)}
            onAddSet={(measure) =>
              patchExercise(i, (x) => (x.sets.length >= MAX_SETS ? x : { ...x, sets: [...x.sets, newSet(measure, x.sets[x.sets.length - 1])] }))
            }
            onRemoveSet={(si) => patchExercise(i, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== si) }))}
          />
        ))}
      </ol>
      <Button block variant="secondary" className="mt-3" icon={<Plus className="size-4" aria-hidden />} onClick={() => setPicker(true)}>
        Übung hinzufügen
      </Button>

      <SectionTitle>Dauer & Verbrauch</SectionTitle>
      <Card className="space-y-3">
        <NumberInput label="Dauer" suffix="Min." value={minutes} min={0} max={1440} onChange={setMinutes} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Schnellauswahl Dauer">
          {MINUTE_CHIPS.map((m) => (
            <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
              {m} Min.
            </Chip>
          ))}
        </div>
        {!useOwn && (
          <p className="rounded-2xl bg-surface-2 p-3 text-sm" aria-live="polite">
            <span className="font-semibold">≈ {fmtInt(estimate)} kcal zusätzlich verbraucht</span>
            <span className="mt-0.5 block text-xs text-muted">
              Richtwert für {type.name} ohne Grundumsatz, gerechnet mit {fmtInt(weight.kg)} kg
              {weight.known ? '' : ` (Standardwert ${DEFAULT_WEIGHT_KG} kg – trag dein Gewicht ein, dann wird es genauer)`}.
            </span>
          </p>
        )}
        <Switch
          label="Eigene kcal eintragen"
          description="Zum Beispiel den Wert von deiner Uhr"
          checked={useOwn}
          onChange={(v) => {
            setUseOwn(v)
            if (v && ownKcal === null) setOwnKcal(estimate)
          }}
        />
        {useOwn && <NumberInput label="Verbrauch" suffix="kcal" value={ownKcal} min={0} max={10000} onChange={setOwnKcal} />}
      </Card>

      <TextArea className="mt-4" label="Notiz (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Schulter gut, nächstes Mal mehr Gewicht" />

      <p className="mt-6 px-1 text-xs text-muted">
        Sauber statt schwer: Das Gewicht erst steigern, wenn alle Wiederholungen gut gelingen. Bei Schmerzen aufhören.{' '}
        <Link to="/training" className="font-medium text-brand">
          Trainingsvorschläge ansehen
        </Link>
      </p>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-2.5">
          {needsUpdate ? (
            <div className="mb-2 rounded-2xl bg-surface-2 p-3 text-sm" role="alert">
              Für die Übungen fehlt noch das Datenbank-Update: In Supabase <strong>setup-teil-4.sql</strong> noch einmal ausführen (siehe
              Anleitung, „Update: Eigenes Training“), dann erneut speichern. Oder jetzt nur Dauer und kcal speichern.
              <Button size="sm" variant="secondary" className="mt-2" disabled={busy} onClick={() => submit(false)}>
                Ohne Übungen speichern
              </Button>
            </div>
          ) : (
            <p className="mb-2 truncate text-center text-xs text-muted tabular" aria-live="polite">
              {details && details.exercises.length ? trainingSummary(details) : 'Noch keine Übung'}
            </p>
          )}
          <div className="flex gap-2">
            {id && (
              <Button variant="secondary" icon={<Trash2 className="size-4" aria-hidden />} disabled={busy} onClick={remove}>
                Löschen
              </Button>
            )}
            <Button block size="lg" icon={<Check className="size-5" aria-hidden />} disabled={!valid || busy || unavailable} onClick={() => submit()}>
              {busy ? 'Speichern …' : `Training speichern · ${fmtInt(kcal)} kcal`}
            </Button>
          </div>
        </div>
      </div>

      <ExercisePickerSheet open={picker} recent={recent} onClose={() => setPicker(false)} onPick={addExercise} />
    </div>
  )
}

const MEASURE_LABEL: Record<Measure, { label: string; head: string }> = {
  reps: { label: 'Wiederholungen', head: 'Wdh.' },
  seconds: { label: 'Zeit in Sekunden', head: 'Sekunden' },
  minutes: { label: 'Zeit in Minuten', head: 'Minuten' },
}

/** Eine Übung mit ihren Sätzen – Wiederholungen und Gewicht oder eine Zeit */
function ExerciseCard({
  exercise,
  last,
  best,
  onRemove,
  onSet,
  onAddSet,
  onRemoveSet,
}: {
  exercise: TrainingExercise
  last: ReturnType<typeof lastPerformance>
  best: ReturnType<typeof bestSet>
  onRemove: () => void
  onSet: (si: number, p: Partial<TrainingSet>) => void
  onAddSet: (measure: Measure) => void
  onRemoveSet: (si: number) => void
}) {
  const measure = measureOf(exercise)
  const m = MEASURE_LABEL[measure]
  return (
    <li>
      <Card className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 px-1">
            <h3 className="font-semibold leading-snug">{exercise.name}</h3>
            {last && (
              <p className="text-xs text-muted">
                Letztes Mal ({dayInSentence(last.date)}): {exerciseSummary(last)}
              </p>
            )}
            {best && measure !== 'minutes' && (
              <p className="flex items-center gap-1 text-xs text-muted">
                <Trophy className="size-3.5 text-brand" aria-hidden /> Bestwert: {setLabel(best.set)} ({dayInSentence(best.date)})
              </p>
            )}
          </div>
          <IconButton label={`${exercise.name} entfernen`} onClick={onRemove}>
            <X className="size-4" />
          </IconButton>
        </div>
        {exercise.sets.length > 0 && (
          <div aria-hidden className="mt-2 flex items-center gap-2 text-xs font-medium text-muted">
            <span className="w-14 shrink-0" />
            <span className="flex-1 px-1">{m.head}</span>
            {measure === 'reps' && <span className="flex-1 px-1">kg (optional)</span>}
            <span className="w-11 shrink-0" />
          </div>
        )}
        <ol className="mt-1 space-y-2" aria-label={`Sätze: ${exercise.name}`}>
          {exercise.sets.map((s, si) => (
            <li key={si} className="flex items-center gap-2">
              <span className="w-14 shrink-0 px-1 text-sm text-muted">Satz {si + 1}</span>
              {measure === 'reps' ? (
                <>
                  <NumberInput
                    className="min-w-0 flex-1"
                    hideLabel
                    label={`${exercise.name}, Satz ${si + 1}: ${m.label}`}
                    value={s.reps}
                    min={0}
                    max={1000}
                    onChange={(v) => onSet(si, { reps: v === null ? null : Math.round(v) })}
                  />
                  <NumberInput
                    className="min-w-0 flex-1"
                    hideLabel
                    label={`${exercise.name}, Satz ${si + 1}: Gewicht in kg`}
                    placeholder="–"
                    value={s.kg}
                    min={0}
                    max={1000}
                    onChange={(v) => onSet(si, { kg: v })}
                  />
                </>
              ) : (
                <NumberInput
                  className="min-w-0 flex-1"
                  hideLabel
                  label={`${exercise.name}, Satz ${si + 1}: ${m.label}`}
                  value={s.seconds === null ? null : measure === 'minutes' ? Math.round((s.seconds / 60) * 10) / 10 : s.seconds}
                  min={0}
                  max={measure === 'minutes' ? 1440 : 86400}
                  onChange={(v) => onSet(si, { seconds: v === null ? null : Math.round(measure === 'minutes' ? v * 60 : v), reps: null })}
                />
              )}
              <IconButton label={`${exercise.name}: Satz ${si + 1} entfernen`} onClick={() => onRemoveSet(si)}>
                <X className="size-4" />
              </IconButton>
            </li>
          ))}
        </ol>
        <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="size-4" aria-hidden />} onClick={() => onAddSet(measure)} aria-label={`Satz zu ${exercise.name} hinzufügen`}>
          Satz
        </Button>
      </Card>
    </li>
  )
}
