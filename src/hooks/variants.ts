import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { Recipe, RecipeVariant } from '../types'
import { getRecipe } from '../lib/recipes'
import { variantToRecipe, type VariantDraft } from '../lib/variants'
import { VARIANTS_KEY, useSharedVariants, useVariants } from './variantList'
import { useHousehold } from '../app/household'
import { displayName, findMember } from '../lib/household'

export { VARIANTS_KEY, useVariants }

const NONE: RecipeVariant[] = []

/**
 * Eigene Varianten und Rezepte als vollwertige Rezepte (mit berechneten Nährwerten).
 * `shared` sind die Rezepte der anderen Haushalts-Mitglieder: nutzbar wie eigene, aber nicht änderbar.
 */
export function useVariantRecipes(): { recipes: Recipe[]; variants: RecipeVariant[]; shared: Recipe[]; isLoading: boolean } {
  const { data: variants = NONE, isLoading } = useVariants()
  const { data: others = NONE } = useSharedVariants()
  const { household } = useHousehold()
  const recipes = useMemo(() => variants.map((v) => variantToRecipe(v)), [variants])
  const shared = useMemo(
    () => others.map((v) => ({ ...variantToRecipe(v), shared_by: displayName(findMember(household, v.user_id)) })),
    [others, household],
  )
  return { recipes, variants, shared, isLoading }
}

export function useSaveVariant() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: VariantDraft & { id?: string }): Promise<RecipeVariant> => {
      const updated_at = new Date().toISOString()
      if (v.id) {
        const { id, ...patch } = v
        return store.update<RecipeVariant>('recipe_variants', id, { ...patch, updated_at })
      }
      const { id: _none, ...row } = v
      const [created] = await store.insert<RecipeVariant>('recipe_variants', [{ ...row, updated_at }])
      return created
    },
    // Sofort in den Cache, damit die Rezeptseite die Variante direkt nach dem Speichern findet
    onSuccess: (saved) => {
      qc.setQueryData<RecipeVariant[]>(VARIANTS_KEY, (old = []) => [saved, ...old.filter((v) => v.id !== saved.id)])
      return qc.invalidateQueries({ queryKey: VARIANTS_KEY })
    },
  })
}

export function useDeleteVariant() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => store.remove('recipe_variants', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: VARIANTS_KEY }),
  })
}

export interface ResolvedRecipe {
  recipe: Recipe | undefined
  /** Gesetzt, wenn die ID zu einer eigenen Variante gehört */
  variant: RecipeVariant | undefined
  /** Gesetzt, wenn die ID zur Variante eines anderen Haushalts-Mitglieds gehört (nur lesbar) */
  sharedVariant: RecipeVariant | undefined
  /** Kochbuch-Rezept, auf dem die Variante beruht */
  base: Recipe | undefined
  isLoading: boolean
}

/** Rezept aus dem Kochbuch oder eigene Variante anhand der ID */
export function useResolvedRecipe(id: string | null | undefined): ResolvedRecipe {
  const fromBook = getRecipe(id)
  const { data: variants = NONE, isLoading, isFetching } = useVariants()
  const { data: others = NONE } = useSharedVariants()
  const { household } = useHousehold()
  return useMemo(() => {
    if (fromBook) return { recipe: fromBook, variant: undefined, sharedVariant: undefined, base: undefined, isLoading: false }
    const variant = id ? variants.find((v) => v.id === id) : undefined
    const sharedVariant = !variant && id ? others.find((v) => v.id === id) : undefined
    const row = variant ?? sharedVariant
    const base = getRecipe(row?.base_recipe_id)
    let recipe = row ? variantToRecipe(row, base) : undefined
    if (recipe && sharedVariant) recipe = { ...recipe, shared_by: displayName(findMember(household, sharedVariant.user_id)) }
    // Solange nachgeladen wird, gilt eine unbekannte ID noch nicht als „gibt es nicht“
    return { recipe, variant, sharedVariant, base, isLoading: isLoading || (!row && isFetching) }
  }, [fromBook, id, variants, others, household, isLoading, isFetching])
}
