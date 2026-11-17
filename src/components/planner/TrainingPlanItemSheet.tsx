import { Link } from 'react-router-dom'
import { CheckCircle2, Play, Trash2 } from 'lucide-react'
import type { ActivityLog, TrainingPlan } from '../../types'
import { activityEmoji, weightOn } from '../../lib/activity'
import { fmtDayLong, fmtWeekday, relativeDayLabel, todayISO } from '../../lib/dates'
import { fmtInt } from '../../lib/format'
import { exerciseSummary } from '../../lib/trainingLog'
import { planDetail, planKcal, plannedExercises, plannedWorkout, startLink } from '../../lib/trainingPlan'
import { useProfile, useWeights } from '../../hooks/data'
import { useCompletePlannedTraining, useDeleteTrainingPlans, useUpdateTrainingPlan } from '../../hooks/trainingPlan'
import { useUndoToast } from '../../hooks/undo'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Segmented'
import { useToast } from '../ui/Toast'

/** Ein eingeplantes Training: ansehen, starten, als erledigt eintragen, verschieben oder entfernen */
export function TrainingPlanItemSheet({
  plan,
  done,
  days,
  onClose,
}: {
  plan: TrainingPlan | null
  /** Eingetragener Sport, der dieses Training erfüllt */
  done: ActivityLog | null
  /** Tage, auf die verschoben werden kann */
  days: string[]
  onClose: () => void
}) {
  const { data: profile } = useProfile()
  const { data: weights = [] } = useWeights()
  const update = useUpdateTrainingPlan()
  const del = useDeleteTrainingPlans()
  const { complete, pending } = useCompletePlannedTraining()
  const undo = useUndoToast()
  const toast = useToast()
  if (!plan) return null

  const today = todayISO()
  const kcal = planKcal(plan, weightOn(plan.date, weights, profile?.weight_kg).kg)
  const link = startLink(plan, today)
  const workout = plannedWorkout(plan)
  const template = plannedExercises(plan)
  const main = workout?.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items.map((i) => i.exercise.name)) ?? []

  async function move(date: string) {
    if (!plan || date === plan.date) return
    await update.mutateAsync({ id: plan.id, patch: { date } })
    toast(`Verschoben auf ${fmtDayLong(date)}`, '🗓️')
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={plan.title}
      footer={
        <div className="space-y-2">
          {!done && link && (
            <Link
              to={link}
              onClick={onClose}
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 font-semibold text-brand-ink shadow-sm transition active:scale-[0.99]"
            >
              <Play className="size-5" aria-hidden /> {workout ? 'Training starten' : 'Im Trainingstagebuch eintragen'}
            </Link>
          )}
          {!done && plan.date <= today && (
            <Button
              block
              variant={link ? 'secondary' : 'primary'}
              size={link ? 'md' : 'lg'}
              icon={<CheckCircle2 className="size-5" aria-hidden />}
              disabled={pending}
              onClick={async () => {
                try {
                  await complete(plan)
                  onClose()
                } catch {
                  toast('Eintragen hat nicht geklappt – bitte noch einmal versuchen')
                }
              }}
            >
              Erledigt – als Sport eintragen
            </Button>
          )}
          <Button
            block
            variant="ghost"
            className="text-muted"
            icon={<Trash2 className="size-4" aria-hidden />}
            disabled={del.isPending}
            onClick={async () => {
              await del.mutateAsync([plan.id])
              undo('Geplantes Training entfernt', 'training_plans', [plan])
              onClose()
            }}
          >
            Aus dem Plan nehmen
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted tabular">
          <span aria-hidden>{activityEmoji(plan.kind)} </span>
          {relativeDayLabel(plan.date, today)}
          {planDetail(plan) ? ` · ${planDetail(plan)}` : ''}
          {kcal > 0 ? ` · ≈ ${fmtInt(kcal)} kcal` : ''}
        </p>
        {done && (
          <p className="flex items-center gap-2 rounded-2xl bg-brand-soft p-3 text-sm font-medium">
            <CheckCircle2 className="size-5 shrink-0 text-brand" aria-hidden /> Erledigt: {done.name}
          </p>
        )}
        {main.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Übungen im Hauptteil</h3>
            <p className="mt-0.5 text-sm text-muted">{main.join(' · ')}</p>
          </div>
        )}
        {template && (
          <div>
            <h3 className="text-sm font-semibold">Übungen</h3>
            <ul className="mt-1 space-y-0.5 text-sm">
              {template.exercises.map((e, i) => (
                <li key={i}>
                  <span className="font-medium">{e.name}</span>
                  {exerciseSummary(e) && <span className="text-muted tabular"> · {exerciseSummary(e)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!done && (
          <div>
            <p className="mb-1.5 text-sm font-medium">Verschieben</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Verschieben auf">
              {days
                .filter((d) => d >= today)
                .map((d) => (
                  <Chip key={d} active={d === plan.date} label={fmtDayLong(d)} disabled={update.isPending} onClick={() => move(d)}>
                    {fmtWeekday(d)}
                  </Chip>
                ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
