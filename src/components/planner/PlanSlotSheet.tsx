import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { MealType } from '../../types'
import { RECIPES, filterRecipes, matchesDiet, recipeEmoji } from '../../lib/recipes'
import { MEAL_LABELS } from '../../lib/meals'
import { dishPerServing, roundNutrients, scaleNutrients } from '../../lib/nutrition'
import { recipePlanItem, type NewPlanItem } from '../../lib/planner'
import { fmtDayLong } from '../../lib/dates'
import { fmtInt } from '../../lib/format'
import { useDishes, useProfile } from '../../hooks/data'
import { useVariantRecipes } from '../../hooks/variants'
import { Sheet } from '../ui/Sheet'
import { Segmented } from '../ui/Segmented'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { NumberInput } from '../ui/NumberInput'
import { EmptyState } from '../ui/EmptyState'
import { FoodRow } from '../add/FoodRow'

type Mode = 'recipe' | 'dish' | 'text'

/** Slot im Wochenplan belegen: Rezept, eigenes Gericht oder Freitext */
export function PlanSlotSheet({
  slot,
  onClose,
  onAdd,
}: {
  slot: { date: string; meal: MealType } | null
  onClose: () => void
  onAdd: (item: NewPlanItem) => void
}) {
  const [mode, setMode] = useState<Mode>('recipe')
  const [query, setQuery] = useState('')
  const [text, setText] = useState('')
  const [kcal, setKcal] = useState<number | null>(null)
  const { data: dishes = [] } = useDishes()
  const { data: profile } = useProfile()
  const { recipes: ownRecipes } = useVariantRecipes()

  useEffect(() => {
    if (slot) {
      setQuery('')
      setText('')
      setKcal(null)
    }
  }, [slot])

  const recipes = useMemo(
    () =>
      slot
        ? filterRecipes(
            [...ownRecipes, ...RECIPES].filter((r) => matchesDiet(r, profile?.diet, profile?.avoid)),
            { meal: query ? null : slot.meal, keyword: query },
          )
        : [],
    [slot, query, profile?.diet, profile?.avoid, ownRecipes],
  )
  if (!slot) return null

  return (
    <Sheet open={!!slot} onClose={onClose} title={`${MEAL_LABELS[slot.meal]} · ${fmtDayLong(slot.date)}`} tall>
      <Segmented<Mode>
        label="Art des Eintrags"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'recipe', label: 'Rezept' },
          { value: 'dish', label: 'Eigenes Gericht' },
          { value: 'text', label: 'Freitext' },
        ]}
      />
      {mode === 'recipe' && (
        <>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="plan-recipe-search" className="sr-only">
              Rezept suchen
            </label>
            <input
              id="plan-recipe-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rezept suchen …"
              className="min-h-12 w-full rounded-2xl bg-surface-2 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <ul className="mt-2 space-y-1">
            {recipes.map((r) => (
              <FoodRow
                key={r.id}
                title={`${recipeEmoji(r)} ${r.title}`}
                subtitle={`${r.time_min} Min.`}
                kcal={r.nutrition.kcal}
                kcalLabel="kcal/Portion"
                onClick={() => onAdd(recipePlanItem(r, slot.date, slot.meal, 1))}
              />
            ))}
          </ul>
          {recipes.length === 0 && <EmptyState title="Kein passendes Rezept" />}
        </>
      )}
      {mode === 'dish' && (
        <>
          <ul className="mt-3 space-y-1">
            {dishes.map((d) => (
              <FoodRow
                key={d.id}
                title={d.name}
                kcal={dishPerServing(d).kcal}
                kcalLabel="kcal/Portion"
                onClick={() =>
                  onAdd({
                    date: slot.date,
                    meal: slot.meal,
                    kind: 'dish',
                    recipe_id: null,
                    dish_id: d.id,
                    title: d.name,
                    servings: 1,
                    ...roundNutrients(scaleNutrients(dishPerServing(d), 1)),
                  })
                }
              />
            ))}
          </ul>
          {dishes.length === 0 && (
            <EmptyState title="Noch keine eigenen Gerichte" text="Eigene Gerichte legst du beim Hinzufügen einer Mahlzeit unter „Gerichte“ an." />
          )}
        </>
      )}
      {mode === 'text' && (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            onAdd({
              date: slot.date,
              meal: slot.meal,
              kind: 'text',
              recipe_id: null,
              dish_id: null,
              title: text.trim(),
              servings: 1,
              kcal: Math.round(kcal ?? 0),
              protein: 0,
              carbs: 0,
              fat: 0,
            })
          }}
        >
          <Field label="Was gibt es?" value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Essen bei Oma" />
          <NumberInput label="Geschätzte kcal (optional)" suffix="kcal" value={kcal} min={0} onChange={setKcal} hint="Fließt in die Tages- und Wochensumme ein." />
          <Button type="submit" block size="lg" disabled={!text.trim()}>
            Eintragen
          </Button>
        </form>
      )}
      <p className="sr-only" aria-live="polite">
        {mode === 'recipe' ? `${fmtInt(recipes.length)} Rezepte` : ''}
      </p>
    </Sheet>
  )
}
