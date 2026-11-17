import { useMemo, useState } from 'react'
import type { TrainingPlan } from '../../types'
import { useAddTrainingPlans } from '../../hooks/trainingPlan'
import { fmtDayLong, fmtWeekday, todayISO } from '../../lib/dates'
import { planTrainingWeek, type FocusMode } from '../../lib/trainingPlan'
import { loadTrainingSettings, loadTrainingWeekdays, saveTrainingSettings, saveTrainingWeekdays } from '../../lib/trainingSettings'
import { DURATIONS, FOCUS_LABELS, LEVEL_LABELS, PLACE_LABELS, type Focus, type Level, type Place } from '../../lib/workouts'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Chip, Segmented } from '../ui/Segmented'
import { useToast } from '../ui/Toast'

const FOCUS_MODES: { value: FocusMode; label: string }[] = [
  { value: 'abwechselnd', label: 'Abwechselnd' },
  ...(Object.keys(FOCUS_LABELS) as Focus[]).map((f) => ({ value: f, label: FOCUS_LABELS[f] })),
]

/**
 * „Trainingstage planen“: an den gewählten Tagen der Woche je ein Trainingsvorschlag, auf Wunsch mit wechselndem
 * Schwerpunkt. Tage, an denen schon Training geplant ist, bleiben unverändert.
 */
export function TrainingWeekSheet({
  open,
  days,
  existing,
  onClose,
}: {
  open: boolean
  /** Die sieben Tage der Woche im Plan */
  days: string[]
  existing: TrainingPlan[]
  onClose: () => void
}) {
  if (!open) return null
  return <WeekForm days={days} existing={existing} onClose={onClose} />
}

function WeekForm({ days, existing, onClose }: { days: string[]; existing: TrainingPlan[]; onClose: () => void }) {
  const toast = useToast()
  const add = useAddTrainingPlans()
  const initial = loadTrainingSettings()
  const [weekdays, setWeekdays] = useState<number[]>(loadTrainingWeekdays)
  const [place, setPlace] = useState<Place>(initial.place)
  const [duration, setDuration] = useState<number>(initial.minutes)
  const [level, setLevel] = useState<Level>(initial.level)
  const [focus, setFocus] = useState<FocusMode>('abwechselnd')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000))
  const taken = useMemo(() => new Set(existing.map((p) => p.date)), [existing])
  const today = todayISO()

  const dates = weekdays.map((i) => days[i]).filter(Boolean)
  const plans = planTrainingWeek({ dates, place, duration, level, focus, existing, seed, notBefore: today })
  const toggle = (i: number) => setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort()))

  async function submit() {
    if (!plans.length) return
    try {
      await add.mutateAsync(plans)
    } catch {
      toast('Einplanen hat nicht geklappt – bitte noch einmal versuchen')
      return
    }
    saveTrainingWeekdays(weekdays)
    saveTrainingSettings({ ...initial, place, minutes: duration, level })
    toast(`${plans.length} ${plans.length === 1 ? 'Training' : 'Trainings'} eingeplant`, '🗓️')
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Trainingstage planen"
      footer={
        <Button block size="lg" disabled={!plans.length || add.isPending} onClick={submit}>
          {plans.length ? `${plans.length} ${plans.length === 1 ? 'Training' : 'Trainings'} einplanen` : 'Tage wählen'}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">An welchen Tagen?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Trainingstage">
            {days.map((d, i) => {
              const past = d < today
              return (
                <Chip
                  key={d}
                  active={taken.has(d) || (!past && weekdays.includes(i))}
                  disabled={taken.has(d) || past}
                  label={`${fmtDayLong(d)}${taken.has(d) ? ', Training schon geplant' : past ? ', schon vorbei' : ''}`}
                  onClick={() => toggle(i)}
                >
                  {fmtWeekday(d)}
                  {taken.has(d) ? ' ✓' : ''}
                </Chip>
              )
            })}
          </div>
          {taken.size > 0 && <p className="mt-1.5 text-xs text-muted">Tage mit ✓ haben schon ein Training und bleiben, wie sie sind.</p>}
        </div>
        <Segmented<Place>
          label="Ort"
          value={place}
          onChange={setPlace}
          options={(Object.keys(PLACE_LABELS) as Place[]).map((p) => ({ value: p, label: PLACE_LABELS[p] }))}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Dauer">
          {DURATIONS.map((m) => (
            <Chip key={m} active={duration === m} onClick={() => setDuration(m)}>
              {m} Min.
            </Chip>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Schwerpunkt</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Schwerpunkt">
            {FOCUS_MODES.map((f) => (
              <Chip key={f.value} active={focus === f.value} onClick={() => setFocus(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
        <Segmented<Level>
          label="Level"
          value={level}
          onChange={setLevel}
          options={(Object.keys(LEVEL_LABELS) as Level[]).map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
        />
        {plans.length > 0 && (
          <div className="rounded-2xl bg-surface-2 p-3">
            <ul className="space-y-1 text-sm" aria-label="Vorschau">
              {plans.map((p) => (
                <li key={p.date} className="flex gap-2">
                  <span className="w-7 shrink-0 font-semibold">{fmtWeekday(p.date)}</span>
                  <span className="min-w-0 flex-1">
                    {p.title} <span className="text-muted tabular">· ca. {p.minutes} Min.</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="-ml-2 mt-1" onClick={() => setSeed((s) => s + 1)}>
              Andere Übungen
            </Button>
          </div>
        )}
        <p className="text-xs text-muted">
          Danach lohnt sich „Woche vorschlagen“: Die Mahlzeiten richten sich nach den Trainingstagen. Jedes Training lässt sich einzeln ändern,
          verschieben oder entfernen.
        </p>
      </div>
    </Sheet>
  )
}
