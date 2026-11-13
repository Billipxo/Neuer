import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { AchievementRow } from '../types'
import { useLogRange, useProfile, useWaterRange } from './data'
import { usePlanRange } from './plan'
import { useVariants } from './variantList'
import { evaluate, newlyUnlocked, currentStreak, type AchievementInput } from '../lib/achievements'
import { shiftISO, todayISO } from '../lib/dates'
import { totalsByDate } from '../lib/log'

const KEY = ['achievements'] as const

export function useAchievementRows() {
  const store = useStore()
  return useQuery({ queryKey: KEY, queryFn: () => store.list<AchievementRow>('achievements') })
}

export function useSaveAchievements() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (keys: string[]) => store.insert<AchievementRow>('achievements', keys.map((key) => ({ key, unlocked_at: new Date().toISOString() }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** Alle Daten der letzten 365 Tage, aus denen Erfolge berechnet werden */
export function useAchievementInput(): { input: AchievementInput | null; ready: boolean } {
  const today = todayISO()
  const from = shiftISO(today, -365)
  const { data: profile } = useProfile()
  const log = useLogRange(from, today)
  const plan = usePlanRange(from, shiftISO(today, 60), { live: false })
  const water = useWaterRange(from, today)
  const variants = useVariants()
  const ready = Boolean(profile && log.data && plan.data && water.data && variants.data)
  const input = useMemo(
    () =>
      ready
        ? {
            today,
            kcalTarget: profile!.kcal_target,
            macros: { protein: profile!.protein_pct, carbs: profile!.carbs_pct, fat: profile!.fat_pct },
            waterTarget: profile!.water_target_ml,
            log: log.data!,
            plan: plan.data!,
            water: water.data!,
            ownRecipes: variants.data!.length,
          }
        : null,
    [ready, today, profile, log.data, plan.data, water.data, variants.data],
  )
  return { input, ready }
}

export function useAchievementOverview() {
  const { input } = useAchievementInput()
  const { data: rows = [] } = useAchievementRows()
  return useMemo(() => {
    if (!input) return null
    const unlocked = new Map(rows.map((r) => [r.key, r.unlocked_at]))
    return {
      items: evaluate(input).map((r) => ({ ...r, unlockedAt: unlocked.get(r.def.key) ?? null })),
      streak: currentStreak([...totalsByDate(input.log).keys()], input.today),
    }
  }, [input, rows])
}

export { newlyUnlocked }
