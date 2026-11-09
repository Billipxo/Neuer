import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Trash2 } from 'lucide-react'
import type { PlanItem } from '../../types'
import { MEAL_LABELS } from '../../lib/meals'
import { getRecipe, recipeVeggies } from '../../lib/recipes'
import { planNutrients } from '../../lib/planner'
import { roundNutrients, scaleNutrients } from '../../lib/nutrition'
import { detectVeggies } from '../../lib/veggies'
import { useAddLogEntries } from '../../hooks/data'
import { useDeletePlanItems, useUpdatePlanItem } from '../../hooks/plan'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { NumberInput } from '../ui/NumberInput'
import { useToast } from '../ui/Toast'
import { NutrientGrid } from '../add/NutrientGrid'

/** Geplanten Eintrag bearbeiten, löschen oder als gegessen übernehmen */
export function PlanItemSheet({ item, onClose }: { item: PlanItem | null; onClose: () => void }) {
  const [servings, setServings] = useState<number | null>(1)
  const update = useUpdatePlanItem()
  const del = useDeletePlanItems()
  const addLog = useAddLogEntries()
  const toast = useToast()

  useEffect(() => {
    if (item) setServings(Number(item.servings))
  }, [item])
  if (!item) return null

  const factor = servings && item.servings ? servings / Number(item.servings) : 1
  const n = scaleNutrients(planNutrients(item), factor)
  const recipe = getRecipe(item.recipe_id)

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item.title}
      footer={
        <div className="space-y-2">
          <Button
            block
            size="lg"
            icon={<CheckCircle2 className="size-5" aria-hidden />}
            disabled={!servings}
            onClick={async () => {
              await addLog.mutateAsync([
                {
                  date: item.date,
                  meal: item.meal,
                  name: item.title,
                  amount: servings ?? 1,
                  unit: 'serving',
                  grams: null,
                  ...roundNutrients(n),
                  food_id: null,
                  dish_id: item.dish_id,
                  recipe_id: item.recipe_id,
                  veggies: recipe ? recipeVeggies(recipe) : detectVeggies(item.title),
                },
              ])
              toast(`Als gegessen bei ${MEAL_LABELS[item.meal]} eingetragen`, '✅')
              onClose()
            }}
          >
            Als gegessen eintragen
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              icon={<Trash2 className="size-4" aria-hidden />}
              onClick={async () => {
                await del.mutateAsync([item.id])
                onClose()
              }}
            >
              Entfernen
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!servings || servings === Number(item.servings)}
              onClick={async () => {
                await update.mutateAsync({ id: item.id, patch: { servings: servings!, ...roundNutrients(n) } })
                toast('Gespeichert')
                onClose()
              }}
            >
              Speichern
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {recipe && (
          <Link to={`/rezepte/${recipe.id}`} className="inline-flex min-h-9 items-center text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Rezept ansehen
          </Link>
        )}
        {item.kind !== 'text' && <NumberInput label="Portionen" suffix="Port." value={servings} min={0} onChange={setServings} />}
        <NutrientGrid n={n} />
      </div>
    </Sheet>
  )
}
