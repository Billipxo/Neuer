import { useEffect, useState } from 'react'
import type { MealType, Recipe } from '../../types'
import { MEAL_TYPES } from '../../types'
import { MEAL_LABELS, mealForHour } from '../../lib/meals'
import { recipeNutrients, recipeVeggies } from '../../lib/recipes'
import { roundNutrients } from '../../lib/nutrition'
import { todayISO, shiftISO, relativeDayLabel } from '../../lib/dates'
import { fmt1 } from '../../lib/format'
import { useAddLogEntries } from '../../hooks/data'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Segmented } from '../ui/Segmented'
import { NumberInput } from '../ui/NumberInput'
import { useToast } from '../ui/Toast'
import { NutrientGrid } from '../add/NutrientGrid'

/** Rezept als gegessen ins Tagesprotokoll übernehmen */
export function AddRecipeSheet({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const today = todayISO()
  const [date, setDate] = useState(today)
  const [meal, setMeal] = useState<MealType>('lunch')
  const [servings, setServings] = useState<number | null>(1)
  const add = useAddLogEntries()
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    const m = mealForHour(new Date().getHours())
    setMeal(recipe.meal.includes(m) ? m : recipe.meal[0])
    setServings(1)
    setDate(today)
  }, [open, recipe, today])

  const n = recipeNutrients(recipe, servings ?? 0)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Zum Tagesplan hinzufügen"
      footer={
        <Button
          block
          size="lg"
          disabled={!servings || add.isPending}
          onClick={async () => {
            if (!servings) return
            await add.mutateAsync([
              {
                date,
                meal,
                name: recipe.title,
                amount: servings,
                unit: 'serving',
                grams: null,
                ...roundNutrients(n),
                food_id: null,
                dish_id: null,
                recipe_id: recipe.id,
                veggies: recipeVeggies(recipe),
              },
            ])
            toast(`${fmt1(servings)} Portion bei ${MEAL_LABELS[meal]} eingetragen`, '🍽️')
            onClose()
          }}
        >
          Eintragen
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">Tag</p>
          <Segmented
            label="Tag"
            value={date}
            onChange={setDate}
            options={[shiftISO(today, -1), today, shiftISO(today, 1)].map((d) => ({ value: d, label: relativeDayLabel(d, today) }))}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Mahlzeit</p>
          <Segmented<MealType>
            label="Mahlzeit"
            value={meal}
            onChange={setMeal}
            options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m].replace('essen', '') }))}
          />
        </div>
        <NumberInput label="Portionen" suffix="Port." value={servings} min={0} onChange={setServings} />
        <NutrientGrid n={n} />
      </div>
    </Sheet>
  )
}
