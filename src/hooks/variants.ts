import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { Recipe, RecipeVariant } from '../types'
import { getRecipe } from '../lib/recipes'
import { variantToRecipe, type VariantDraft } from '../lib/variants'
import { VARIANTS_KEY, useVariants } from './variantList'

export { VARIANTS_KEY, useVariants }

/** Eigene Varianten und Rezepte als vollwertige Rezepte (mit berechneten Nährwerten) */
export function useVariantRecipes(): { recipes: Recipe[]; variants: RecipeVariant[]; isLoading: boolean } {
  const { data: variants = [], isLoading } = useVariants()
  const recipes = useMemo(() => variants.map((v) => variantToRecipe(v)), [variants])
  return { recipes, variants, isLoading }
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
  /** Kochbuch-Rezept, auf dem die Variante beruht */
  base: Recipe | undefined
  isLoading: boolean
}

/** Rezept aus dem Kochbuch oder eigene Variante anhand der ID */
export function useResolvedRecipe(id: string | null | undefined): ResolvedRecipe {
  const fromBook = getRecipe(id)
  const { data: variants = [], isLoading, isFetching } = useVariants()
  return useMemo(() => {
    if (fromBook) return { recipe: fromBook, variant: undefined, base: undefined, isLoading: false }
    const variant = id ? variants.find((v) => v.id === id) : undefined
    const base = getRecipe(variant?.base_recipe_id)
    // Solange nachgeladen wird, gilt eine unbekannte ID noch nicht als „gibt es nicht“
    return { recipe: variant ? variantToRecipe(variant, base) : undefined, variant, base, isLoading: isLoading || (!variant && isFetching) }
  }, [fromBook, id, variants, isLoading, isFetching])
}
