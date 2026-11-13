import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../app/auth'
import { HOUSEHOLD_KEY, resetSharedCaches, type HouseholdData } from '../app/household'
import type { Household } from '../types'
import type { HouseholdApi } from '../data/store'

function useApi(): HouseholdApi {
  const { store } = useAuth()
  if (!store?.household) throw new Error('Der gemeinsame Haushalt braucht ein Konto.')
  return store.household
}

/** Nach Gründen, Beitreten oder Verlassen: neuen Stand sofort übernehmen und abhängige Daten neu laden */
function useApply() {
  const qc = useQueryClient()
  return (household: Household | null, scopeChanged: boolean) => {
    if (scopeChanged) resetSharedCaches(qc)
    qc.setQueryData<HouseholdData>(HOUSEHOLD_KEY, { available: true, household })
    void qc.invalidateQueries({ queryKey: HOUSEHOLD_KEY })
  }
}

export function useCreateHousehold() {
  const api = useApi()
  const apply = useApply()
  return useMutation({
    mutationFn: (input: { name: string; displayName: string; bring: boolean }) => api.create(input),
    onSuccess: (household) => apply(household, true),
  })
}

export function useJoinHousehold() {
  const api = useApi()
  const apply = useApply()
  return useMutation({
    mutationFn: (input: { code: string; displayName: string; bring: boolean }) => api.join(input),
    onSuccess: (result) => {
      if (result.status === 'joined' && result.household) apply(result.household, true)
    },
  })
}

export function useLeaveHousehold() {
  const api = useApi()
  const apply = useApply()
  return useMutation({
    mutationFn: (takeCopy: boolean) => api.leave(takeCopy),
    onSuccess: () => apply(null, true),
  })
}

export function useUpdateHousehold() {
  const api = useApi()
  const apply = useApply()
  return useMutation({
    mutationFn: (patch: { name?: string; displayName?: string; eaters?: number; newCode?: boolean }) => api.update(patch),
    onSuccess: (household) => apply(household, false),
  })
}

export function useRemoveMember() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.removeMember(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: HOUSEHOLD_KEY }),
  })
}
