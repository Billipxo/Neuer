import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import { isMissingTableError } from '../data/store'
import type { TrainingPlan } from '../types'
import type { NewTrainingPlan } from '../lib/trainingPlan'

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
