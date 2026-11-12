import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { Dish, Food, LogEntry, Profile, WaterLog, WeightLog } from '../types'
import type { OffProduct } from '../lib/openFoodFacts'

export const qk = {
  profile: ['profile'] as const,
  log: (date: string) => ['log', date] as const,
  logRange: (from: string, to: string) => ['log', 'range', from, to] as const,
  foods: ['foods'] as const,
  dishes: ['dishes'] as const,
  water: (date: string) => ['water', date] as const,
  waterRange: (from: string, to: string) => ['water', 'range', from, to] as const,
  weights: ['weights'] as const,
}

// Profil ----------------------------------------------------------------------

export function useProfile() {
  const store = useStore()
  return useQuery({ queryKey: qk.profile, queryFn: () => store.getProfile() })
}

export function useSaveProfile() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: Omit<Profile, 'id'>) => store.saveProfile(p),
    onSuccess: (p) => qc.setQueryData(qk.profile, p),
  })
}

// Tagesprotokoll -------------------------------------------------------------------

export function useLog(date: string) {
  const store = useStore()
  return useQuery({
    queryKey: qk.log(date),
    queryFn: () => store.list<LogEntry>('log_entries', { eq: { date }, order: [{ column: 'created_at' }] }),
  })
}

export function useLogRange(from: string, to: string) {
  const store = useStore()
  return useQuery({
    queryKey: qk.logRange(from, to),
    queryFn: () =>
      store.list<LogEntry>('log_entries', { gte: { date: from }, lte: { date: to }, order: [{ column: 'date' }] }),
  })
}

export type NewLogEntry = Omit<LogEntry, 'id' | 'user_id' | 'created_at'>

export function useAddLogEntries() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: NewLogEntry[]) => store.insert<LogEntry>('log_entries', rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['log'] }),
  })
}

export function useUpdateLogEntry() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<LogEntry> }) =>
      store.update<LogEntry>('log_entries', id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['log'] }),
  })
}

export function useDeleteLogEntry() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => store.remove('log_entries', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['log'] }),
  })
}

// Lebensmittel-Bibliothek --------------------------------------------------------------

export function useFoods() {
  const store = useStore()
  return useQuery({
    queryKey: qk.foods,
    queryFn: () => store.list<Food>('foods', { order: [{ column: 'last_used_at', ascending: false }] }),
  })
}

export type NewFood = Omit<Food, 'id' | 'user_id' | 'created_at'>

export function offToFood(p: OffProduct): NewFood {
  return {
    ...p,
    source: 'off',
    piece_g: null,
    tbsp_g: null,
    tsp_g: null,
    is_favorite: false,
    last_used_at: null,
    use_count: 0,
  }
}

export function useSaveFood() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: NewFood & { id?: string }): Promise<Food> => {
      if (f.id) {
        const { id, ...patch } = f
        return store.update<Food>('foods', id, patch)
      }
      const { id: _none, ...row } = f
      const [created] = await store.insert<Food>('foods', [row])
      return created
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.foods }),
  })
}

/**
 * Stellt sicher, dass ein Open-Food-Facts-Produkt in der eigenen Bibliothek liegt
 * (für Zuletzt verwendet / Favoriten). Vorhandene Einträge werden über den Barcode gefunden.
 */
export function useEnsureFood() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: OffProduct): Promise<Food> => {
      if (p.barcode) {
        const existing = await store.list<Food>('foods', { eq: { barcode: p.barcode }, limit: 1 })
        if (existing[0]) return existing[0]
      }
      const [created] = await store.insert<Food>('foods', [offToFood(p)])
      return created
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.foods }),
  })
}

export function useTouchFood() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (f: Food) =>
      store.update<Food>('foods', f.id, { last_used_at: new Date().toISOString(), use_count: (f.use_count ?? 0) + 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.foods }),
  })
}

export function useToggleFavoriteFood() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (f: Food) => store.update<Food>('foods', f.id, { is_favorite: !f.is_favorite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.foods }),
  })
}

export function useDeleteFood() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => store.remove('foods', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.foods }),
  })
}

// Eigene Gerichte -------------------------------------------------------------------------

export function useDishes() {
  const store = useStore()
  return useQuery({
    queryKey: qk.dishes,
    queryFn: () => store.list<Dish>('dishes', { order: [{ column: 'name' }] }),
  })
}

export type NewDish = Omit<Dish, 'id' | 'user_id' | 'created_at'>

export function useSaveDish() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: NewDish & { id?: string }): Promise<Dish> => {
      if (d.id) {
        const { id, ...patch } = d
        return store.update<Dish>('dishes', id, patch)
      }
      const { id: _none, ...row } = d
      const [created] = await store.insert<Dish>('dishes', [row])
      return created
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes }),
  })
}

export function useDeleteDish() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => store.remove('dishes', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes }),
  })
}

// Wasser & Gewicht ---------------------------------------------------------------------------

export function useWater(date: string) {
  const store = useStore()
  return useQuery({
    queryKey: qk.water(date),
    queryFn: () => store.list<WaterLog>('water_logs', { eq: { date } }),
  })
}

export function useWaterRange(from: string, to: string) {
  const store = useStore()
  return useQuery({
    queryKey: qk.waterRange(from, to),
    queryFn: () => store.list<WaterLog>('water_logs', { gte: { date: from }, lte: { date: to } }),
  })
}

export function useAddWater() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (w: { date: string; ml: number }) => store.insert<WaterLog>('water_logs', [w]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water'] }),
  })
}

export function useDeleteWater() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => store.remove('water_logs', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water'] }),
  })
}

export function useWeights() {
  const store = useStore()
  return useQuery({
    queryKey: qk.weights,
    queryFn: () => store.list<WeightLog>('weight_logs', { order: [{ column: 'date' }] }),
  })
}

/** Gewicht für einen Tag speichern (ersetzt einen vorhandenen Eintrag desselben Tages). */
export function useSaveWeight() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (w: { date: string; kg: number }) => {
      await store.removeWhere('weight_logs', { date: w.date })
      return store.insert<WeightLog>('weight_logs', [w])
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.weights }),
  })
}

export function useDeleteWeight() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => store.remove('weight_logs', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.weights }),
  })
}

/** Rezept als Favorit markieren (im Profil gespeichert, damit es auf allen Geräten gleich ist) */
export function useToggleFavoriteRecipe() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    // Nacheinander ausführen, damit schnelles Mehrfach-Tippen nichts überschreibt
    scope: { id: 'favorite-recipes' },
    // Ausgangspunkt ist der gespeicherte Stand – der Cache wurde in onMutate schon optimistisch umgeschaltet
    mutationFn: async (recipeId: string) => {
      const current = await store.getProfile()
      if (!current) throw new Error('Kein Profil')
      const { id: _id, created_at: _c, ...rest } = current
      const list = rest.favorite_recipes ?? []
      const favorite_recipes = list.includes(recipeId) ? list.filter((x) => x !== recipeId) : [...list, recipeId]
      return store.saveProfile({ ...rest, has_airfryer: rest.has_airfryer ?? true, avoid: rest.avoid ?? [], favorite_recipes })
    },
    onMutate: async (recipeId) => {
      await qc.cancelQueries({ queryKey: qk.profile })
      const prev = qc.getQueryData<Profile | null>(qk.profile)
      if (prev) {
        const list = prev.favorite_recipes ?? []
        qc.setQueryData<Profile>(qk.profile, {
          ...prev,
          favorite_recipes: list.includes(recipeId) ? list.filter((x) => x !== recipeId) : [...list, recipeId],
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev !== undefined && qc.setQueryData(qk.profile, ctx.prev),
    onSuccess: (p) => qc.setQueryData(qk.profile, p),
  })
}

