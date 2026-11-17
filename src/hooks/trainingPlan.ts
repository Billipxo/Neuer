import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import { isMissingTableError } from '../data/store'
import type { ActivityLog, TrainingPlan } from '../types'
import { activityFromPlan, type NewTrainingPlan } from '../lib/trainingPlan'
import { isMissingDetailsColumn } from '../lib/trainingLog'
import { weightOn } from '../lib/activity'
import { useDeleteActivity, useProfile, useSaveActivity, useWeights } from './data'
import { useToast } from '../components/ui/Toast'

/** Fehlt die Tabelle (Datenbank-Update noch nicht ausgeführt), nicht immer wieder nachfragen */
const retry = (count: number, error: unknown) => !isMissingTableError(error) && count < 1

/** Geplante Trainings eines Zeitraums – persönlich, auch im gemeinsamen Haushalt */
export function useTrainingPlans(from: string, to: string) {
  const store = useStore()
  return useQuery({
    queryKey: ['trainingPlans', 'range', from, to],
    queryFn: () =>
      store.list<TrainingPlan>('training_plans', { gte: { date: from }, lte: { date: to }, order: [{ column: 'date' }, { column: 'created_at' }] }),
    retry,
  })
}

/** Ein geplantes Training (zum Starten) */
export function useTrainingPlan(id: string | null) {
  const store = useStore()
  return useQuery({
    queryKey: ['trainingPlans', 'one', id ?? ''],
    enabled: !!id,
    queryFn: async () => (await store.list<TrainingPlan>('training_plans', { eq: { id: id! } }))[0] ?? null,
    retry,
  })
}

/** Fehlt noch das Datenbank-Update für geplante Trainings? */
export function trainingPlansUnavailable(query: { error: unknown }): boolean {
  return !!query.error && isMissingTableError(query.error)
}

export function useAddTrainingPlans() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plans: NewTrainingPlan[]) => store.insert<TrainingPlan>('training_plans', plans),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainingPlans'] }),
  })
}

export function useUpdateTrainingPlan() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewTrainingPlan> }) => store.update<TrainingPlan>('training_plans', id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainingPlans'] }),
  })
}

export function useDeleteTrainingPlans() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => store.remove('training_plans', ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainingPlans'] }),
  })
}

/**
 * „Erledigt“: ein geplantes Training als Sport eintragen – mit Übungen, soweit bekannt, und mit Rückgängig. Fehlt das
 * Datenbank-Update für Übungen, wird ohne sie eingetragen.
 */
export function useCompletePlannedTraining() {
  const save = useSaveActivity()
  const del = useDeleteActivity()
  const { data: profile } = useProfile()
  const { data: weights = [] } = useWeights()
  const toast = useToast()
  const complete = useCallback(
    async (plan: TrainingPlan, date = plan.date) => {
      const row = activityFromPlan(plan, weightOn(date, weights, profile?.weight_kg).kg, date)
      let created: ActivityLog
      try {
        created = await save.mutateAsync(row)
      } catch (e) {
        if (!row.details || !isMissingDetailsColumn(e)) throw e
        const { details: _details, ...rest } = row
        created = await save.mutateAsync(rest)
      }
      toast(`${plan.title} als Sport eingetragen`, '💪', created ? { label: 'Rückgängig', onClick: () => del.mutate(created.id) } : undefined)
      return created
    },
    [save, del, weights, profile?.weight_kg, toast],
  )
  return { complete, pending: save.isPending }
}
