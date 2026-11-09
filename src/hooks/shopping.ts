import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { ShoppingItem } from '../types'
import { planAddToList, planRegenerate, type ShoppingInput } from '../lib/shopping'

const KEY = ['shopping'] as const

export function useShoppingItems() {
  const store = useStore()
  return useQuery({ queryKey: KEY, queryFn: () => store.list<ShoppingItem>('shopping_items', { order: [{ column: 'created_at' }] }) })
}

/** Zutaten hinzufügen und mit vorhandenen offenen Artikeln zusammenführen */
export function useAddToShopping() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, source }: { items: ShoppingInput[]; source: ShoppingItem['source'] }) => {
      const existing = await store.list<ShoppingItem>('shopping_items')
      const plan = planAddToList(existing, items)
      await Promise.all(plan.updates.map((u) => store.update('shopping_items', u.id, { amount: u.amount })))
      await store.insert(
        'shopping_items',
        plan.inserts.map((i) => ({ ...i, checked: false, in_stock: false, source })),
      )
      return plan
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** Plan-Artikel durch frisch berechnete ersetzen */
export function useRegenerateShopping() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fromPlan: ShoppingInput[]) => {
      const existing = await store.list<ShoppingItem>('shopping_items')
      const plan = planRegenerate(existing, fromPlan)
      await store.remove('shopping_items', plan.deleteIds)
      await store.insert('shopping_items', plan.inserts.map((i) => ({ ...i, source: 'plan' })))
      return plan
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateShoppingItem() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ShoppingItem> }) => store.update<ShoppingItem>('shopping_items', id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<ShoppingItem[]>(KEY)
      qc.setQueryData<ShoppingItem[]>(KEY, (list) => list?.map((i) => (i.id === id ? { ...i, ...patch } : i)))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteShoppingItems() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => store.remove('shopping_items', ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
