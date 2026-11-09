import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Clock, Minus, Plus, ShoppingBasket, Users, CalendarPlus } from 'lucide-react'
import { getRecipe, recipeEmoji, recipeNutrients, scaleIngredients, TAG_LABELS } from '../lib/recipes'
import { formatQuantity } from '../lib/shopping'
import { fmtInt } from '../lib/format'
import { useAddToShopping } from '../hooks/shopping'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { NutrientGrid } from '../components/add/NutrientGrid'
import { AddRecipeSheet } from '../components/recipes/AddRecipeSheet'

export function RecipeDetailPage() {
  const { id } = useParams()
  const recipe = getRecipe(id)
  const [servings, setServings] = useState(recipe?.servings ?? 1)
  const [addOpen, setAddOpen] = useState(false)
  const addToShopping = useAddToShopping()
  const toast = useToast()

  if (!recipe) return <Navigate to="/rezepte" replace />
  const ingredients = scaleIngredients(recipe, servings)

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-36 safe-top">
      <PageHeader title="" back />
      <div className="flex flex-col items-center text-center">
        <span aria-hidden className="flex size-28 items-center justify-center rounded-[2rem] bg-brand-soft text-6xl animate-pop">
          {recipeEmoji(recipe)}
        </span>
        <h1 className="mt-4 text-2xl font-bold leading-tight">{recipe.title}</h1>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden /> {recipe.time_min} Minuten
          </span>
          <span className="tabular">{fmtInt(recipe.nutrition.kcal)} kcal pro Portion</span>
        </p>
        {recipe.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Eigenschaften">
            {recipe.tags.map((t) => (
              <li key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
                {TAG_LABELS[t] ?? t}
              </li>
            ))}
          </ul>
        )}
      </div>

      <SectionTitle>Nährwerte pro Portion</SectionTitle>
      <NutrientGrid n={recipe.nutrition} />

      <SectionTitle
        action={
          <div className="flex items-center gap-1" role="group" aria-label="Portionen">
            <IconButton label="Eine Portion weniger" disabled={servings <= 1} onClick={() => setServings((s) => Math.max(1, s - 1))} className="bg-surface ring-1 ring-line">
              <Minus className="size-4" />
            </IconButton>
            <span className="inline-flex min-w-20 items-center justify-center gap-1 text-sm font-semibold tabular" aria-live="polite">
              <Users className="size-4" aria-hidden /> {servings} Port.
            </span>
            <IconButton label="Eine Portion mehr" onClick={() => setServings((s) => s + 1)} className="bg-surface ring-1 ring-line">
              <Plus className="size-4" />
            </IconButton>
          </div>
        }
      >
        Zutaten
      </SectionTitle>
      <Card className="py-2">
        <ul className="divide-y divide-line/70">
          {ingredients.map((i, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-3 py-2.5">
              <span>{i.name}</span>
              <span className="shrink-0 text-sm text-muted tabular">{formatQuantity(i.amount, i.unit)}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line/70 pt-2 text-xs text-muted tabular">
          Insgesamt ca. {fmtInt(recipeNutrients(recipe, servings).kcal)} kcal für {servings} Portion{servings === 1 ? '' : 'en'}
        </p>
      </Card>

      <SectionTitle>Zubereitung</SectionTitle>
      <ol className="space-y-3">
        {recipe.steps.map((s, idx) => (
          <li key={idx} className="flex gap-3">
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">
              {idx + 1}
            </span>
            <p className="pt-0.5 leading-relaxed">
              <span className="sr-only">Schritt {idx + 1}: </span>
              {s}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-muted">Nährwerte sind gerundete Richtwerte und können je nach Produkt abweichen.</p>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2 px-4 py-3">
          <Button
            variant="secondary"
            className="flex-1"
            size="lg"
            icon={<ShoppingBasket className="size-5" aria-hidden />}
            disabled={addToShopping.isPending}
            onClick={async () => {
              await addToShopping.mutateAsync({
                items: ingredients.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, category: i.category })),
                source: 'manual',
              })
              toast('Zutaten auf der Einkaufsliste', '🛒')
            }}
          >
            Einkaufsliste
          </Button>
          <Button className="flex-1" size="lg" icon={<CalendarPlus className="size-5" aria-hidden />} onClick={() => setAddOpen(true)}>
            Zum Tagesplan
          </Button>
        </div>
      </div>

      <AddRecipeSheet recipe={recipe} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
