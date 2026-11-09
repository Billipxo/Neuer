import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { PlanItem } from '../types'
import type { NewPlanItem } from '../lib/planner'

export function usePlanRange(from: string, to: string) {
  const store = useStore()
  return useQuery({
    queryKey: ['plan', from, to],
    queryFn: () =>
      store.list<PlanItem>('plan_items', { gte: { date: from }, lte: { date: to }, order: [{ column: 'date' }, { column: 'created_at' }] }),
  })
}

export function useAddPlanItems() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: NewPlanItem[]) => store.insert<PlanItem>('plan_items', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan'] }),
  })
}

export function useUpdatePlanItem() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PlanItem> }) => store.update<PlanItem>('plan_items', id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan'] }),
  })
}

export function useDeletePlanItems() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => store.remove('plan_items', ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan'] }),
  })
}
