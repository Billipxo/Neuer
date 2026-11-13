import { useNavigate } from 'react-router-dom'
import { ShoppingBasket } from 'lucide-react'
import type { PlanItem } from '../../types'
import { useDishes, useSharedDishes } from '../../hooks/data'
import { useHousehold } from '../../app/household'
import { forAllEaters } from '../../lib/household'
import { useVariantRecipes } from '../../hooks/variants'
import { useRegenerateShopping } from '../../hooks/shopping'
import { ingredientsFromPlan } from '../../lib/planShopping'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

/** Erzeugt die Einkaufsliste aus den übergebenen Plan-Einträgen */
export function useGenerateShopping() {
  const { data: dishes = [] } = useDishes()
  const { data: sharedDishes = [] } = useSharedDishes()
  const { recipes: ownRecipes, shared } = useVariantRecipes()
  const { household } = useHousehold()
  const regenerate = useRegenerateShopping()
  const toast = useToast()
  return {
    pending: regenerate.isPending,
    async run(items: PlanItem[]) {
      // Im gemeinsamen Plan gelten Portionen pro Person – eingekauft wird für alle am Tisch
      const planned = household ? forAllEaters(items, household.eaters) : items
      const ingredients = ingredientsFromPlan(planned, [...dishes, ...sharedDishes], [...ownRecipes, ...shared])
      if (!ingredients.length) {
        toast('Im Plan sind keine Rezepte mit Zutaten')
        return false
      }
      await regenerate.mutateAsync(ingredients)
      toast(`${ingredients.length} Artikel auf der Einkaufsliste`, '🛒')
      return true
    },
  }
}

export function GenerateShoppingButton({ items }: { items: PlanItem[] }) {
  const gen = useGenerateShopping()
  const navigate = useNavigate()
  return (
    <Button
      variant="secondary"
      icon={<ShoppingBasket className="size-4" aria-hidden />}
      disabled={gen.pending || items.length === 0}
      onClick={async () => {
        if (await gen.run(items)) navigate('/einkauf')
      }}
    >
      Einkaufsliste
    </Button>
  )
}
