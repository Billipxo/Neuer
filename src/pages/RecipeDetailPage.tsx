import { useEffect, useState } from 'react'
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom'
import { ChefHat, Clock, Heart, History, Hourglass, Lightbulb, Minus, Pencil, Plus, Share2, ShoppingBasket, Thermometer, Trash2, Users, CalendarPlus, Wand2 } from 'lucide-react'
import { hasAirfryerVariant, isAirfryerNative, recipeEmoji, recipeNutrients, recipeShareText, recipeSteps, scaleIngredients, TAG_LABELS } from '../lib/recipes'
import { formatDiff, nutritionDiff } from '../lib/variants'
import { ALLERGEN_LABELS } from '../lib/recipeNutrition'
import { useDeleteVariant, useResolvedRecipe, useVariantRecipes } from '../hooks/variants'
import { Spinner } from '../components/ui/EmptyState'
import { useCookedStats } from '../hooks/cooked'
import { fmtDate } from '../lib/dates'
import { useProfile, useToggleFavoriteRecipe } from '../hooks/data'
import { relatedGuides } from '../lib/guides'
import { Segmented } from '../components/ui/Segmented'
import { AirfryerIcon } from '../components/recipes/AirfryerIcon'
import { recipeGradient, RecipeTile } from '../components/recipes/RecipeCard'
import { formatQuantity } from '../lib/shopping'
import { fmtDuration, fmtInt } from '../lib/format'
import { useAddToShopping } from '../hooks/shopping'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { NutrientGrid } from '../components/add/NutrientGrid'
import { AddRecipeSheet } from '../components/recipes/AddRecipeSheet'

export function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { recipe, variant: own, base, isLoading } = useResolvedRecipe(id)
  const { recipes: mine, variants } = useVariantRecipes()
  const del = useDeleteVariant()
  const [servings, setServings] = useState(recipe?.servings ?? 1)
  const [addOpen, setAddOpen] = useState(false)
  const addToShopping = useAddToShopping()
  const toast = useToast()
  const { data: profile } = useProfile()
  const toggleFav = useToggleFavoriteRecipe()
  const hasAirfryer = profile?.has_airfryer ?? true
  const [method, setMethod] = useState<'airfryer' | 'oven' | null>(null)
  const cooked = useCookedStats()

  // Eigene Varianten werden erst geladen – Portionen dann übernehmen
  useEffect(() => {
    setServings(recipe?.servings ?? 1)
  }, [recipe?.id, recipe?.servings])

  if (!recipe) return isLoading ? <Spinner /> : <Navigate to="/rezepte" replace />
  const ownVariants = variants.map((v, i) => ({ v, r: mine[i] })).filter((x) => x.v.base_recipe_id === recipe.id).map((x) => x.r)
  const diff = own && base ? formatDiff(nutritionDiff(recipe, base)) : []
  const avoided = recipe.diet.allergens.filter((a) => profile?.avoid?.includes(a))
  const ingredients = scaleIngredients(recipe, servings)
  const variant = hasAirfryerVariant(recipe)
  const activeMethod = method ?? (hasAirfryer ? 'airfryer' : 'oven')
  const steps = recipeSteps(recipe, variant ? activeMethod : 'airfryer')
  const showAirfryerInfo = recipe.airfryer && (isAirfryerNative(recipe) || activeMethod === 'airfryer')
  const favorite = profile?.favorite_recipes?.includes(recipe.id) ?? false
  const cookedStat = cooked.get(recipe.id)

  async function share() {
    if (!recipe) return
    const text = recipeShareText(recipe, servings, steps)
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, text })
      else {
        await navigator.clipboard.writeText(text)
        toast('Rezept in die Zwischenablage kopiert', '📋')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Teilen nicht möglich')
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-36 safe-top">
      <PageHeader
        title=""
        back
        actions={
          <div className="flex gap-2">
          {own && (
            <Link
              to={`/rezepte/${recipe.id}/abwandeln`}
              aria-label={base ? 'Variante bearbeiten' : 'Rezept bearbeiten'}
              className="flex size-11 items-center justify-center rounded-full bg-surface ring-1 ring-line transition active:scale-90"
            >
              <Pencil className="size-5 text-muted" aria-hidden />
            </Link>
          )}
          <button
            type="button"
            onClick={share}
            aria-label="Rezept teilen"
            className="flex size-11 items-center justify-center rounded-full bg-surface ring-1 ring-line transition active:scale-90"
          >
            <Share2 className="size-5 text-muted" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => toggleFav.mutate(recipe.id)}
            aria-pressed={favorite}
            aria-label={favorite ? 'Aus Favoriten entfernen' : 'Als Favorit merken'}
            className="flex size-11 items-center justify-center rounded-full bg-surface ring-1 ring-line transition active:scale-90"
          >
            <Heart className={`size-5 ${favorite ? 'fill-fat text-fat animate-pop' : 'text-muted'}`} aria-hidden />
          </button>
          </div>
        }
      />
      <div className="flex flex-col items-center text-center">
        <span aria-hidden className={`flex h-36 w-full items-center justify-center rounded-[2rem] bg-gradient-to-br text-7xl ${recipeGradient(recipe)}`}>
          <span className="animate-pop">{recipeEmoji(recipe)}</span>
        </span>
        <h1 className="mt-4 text-2xl font-bold leading-tight">{recipe.title}</h1>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden /> {fmtDuration(recipe.time_min)}
          </span>
          {recipe.rest_min ? (
            <span className="inline-flex items-center gap-1">
              <Hourglass className="size-4" aria-hidden /> + {fmtDuration(recipe.rest_min)} Wartezeit
            </span>
          ) : null}
          <span className="tabular">{fmtInt(recipe.nutrition.kcal)} kcal pro Portion</span>
        </p>
        {cookedStat && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
            <History className="size-3.5" aria-hidden />
            Schon {cookedStat.count}× gekocht · zuletzt am {fmtDate(cookedStat.last)}
          </p>
        )}
        {recipe.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Eigenschaften">
            {recipe.tags.filter((t) => t !== 'heissluftfritteuse').map((t) => (
              <li key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
                {TAG_LABELS[t] ?? t}
              </li>
            ))}
          </ul>
        )}
      </div>

      <SectionTitle>Nährwerte pro Portion</SectionTitle>
      <NutrientGrid n={recipe.nutrition} />
      <p className="mt-2 px-1 text-xs text-muted tabular">
        Ballaststoffe: {fmtInt(recipe.fiber)} g · aus den Zutaten berechnet
        {recipe.diet.glutenFree && ' · ohne glutenhaltige Zutaten (bei Zöliakie Packungsangaben prüfen)'}
      </p>
      <p className="mt-1 px-1 text-xs text-muted">
        {recipe.diet.allergens.length > 0 ? (
          <>
            Enthält: {recipe.diet.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}
            {avoided.length > 0 && (
              <span className="font-medium text-over"> · {avoided.map((a) => ALLERGEN_LABELS[a]).join(', ')} steht auf deiner Liste</span>
            )}
          </>
        ) : (
          'Ohne die häufigen Allergene Gluten, Milch, Ei, Nüsse, Soja, Sesam und Fisch – bei Allergien trotzdem Packungsangaben prüfen.'
        )}
      </p>
      {recipe.diet.vegetarian && recipe.diet.animalRennet && (
        <p className="mt-1 px-1 text-xs text-muted">
          Enthält Parmesan, der traditionell mit tierischem Lab hergestellt wird – für eine streng vegetarische Variante
          Hartkäse ohne tierisches Lab verwenden.
        </p>
      )}
      {own ? (
        <Card className="mt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Wand2 className="size-4 shrink-0 text-brand" aria-hidden />
            {base ? (
              <span>
                Deine Variante von{' '}
                <Link to={`/rezepte/${base.id}`} className="text-brand">
                  {base.title}
                </Link>
              </span>
            ) : (
              'Dein eigenes Rezept'
            )}
          </p>
          {base && <p className="text-muted tabular">{diff.length ? `Gegenüber dem Original pro Portion: ${diff.join(' · ')}` : 'Nährwerte wie das Original.'}</p>}
          {own.note && <p className="whitespace-pre-line rounded-2xl bg-surface-2 p-3">{own.note}</p>}
        </Card>
      ) : (
        <Link
          to={`/rezepte/${recipe.id}/abwandeln?methode=${variant ? activeMethod : 'airfryer'}`}
          className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-3 ring-1 ring-line/60 transition hover:ring-brand/40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Wand2 className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Rezept abwandeln</span>
            <span className="block text-xs text-muted">Zutaten tauschen, Mengen ändern – Nährwerte werden neu berechnet</span>
          </span>
        </Link>
      )}
      {ownVariants.length > 0 && (
        <>
          <SectionTitle>Deine Varianten</SectionTitle>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {ownVariants.map((r) => (
              <RecipeTile key={r.id} recipe={r} />
            ))}
          </div>
        </>
      )}

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
              <span className="min-w-0">
                {i.name}
                {i.note && <span className="text-sm text-muted">, {i.note}</span>}
              </span>
              <span className="shrink-0 text-sm text-muted tabular">{formatQuantity(i.amount, i.unit)}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line/70 pt-2 text-xs text-muted tabular">
          Insgesamt ca. {fmtInt(recipeNutrients(recipe, servings).kcal)} kcal für {servings} Portion{servings === 1 ? '' : 'en'}
        </p>
      </Card>

      <SectionTitle>Zubereitung</SectionTitle>
      <Link
        to={`/rezepte/${recipe.id}/kochen?portionen=${servings}&methode=${variant ? activeMethod : 'airfryer'}`}
        className="mb-4 flex min-h-14 items-center gap-3 rounded-2xl bg-brand px-4 text-brand-ink shadow-sm transition active:scale-[0.99]"
      >
        <ChefHat className="size-6 shrink-0" aria-hidden />
        <span className="flex-1">
          <span className="block font-semibold">Kochmodus starten</span>
          <span className="block text-xs opacity-90">Schritt für Schritt, mit Timern – Display bleibt an</span>
        </span>
      </Link>
      {variant && (
        <Segmented<'airfryer' | 'oven'>
          className="mb-3"
          label="Zubereitungsart"
          value={activeMethod}
          onChange={setMethod}
          options={[
            { value: 'airfryer', label: 'Heißluftfritteuse' },
            { value: 'oven', label: 'Backofen' },
          ]}
        />
      )}
      {showAirfryerInfo && recipe.airfryer && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-brand-soft/60 p-3 text-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
            <AirfryerIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Heißluftfritteuse</p>
            <p className="flex flex-wrap gap-x-3 text-muted tabular">
              <span className="inline-flex items-center gap-1">
                <Thermometer className="size-3.5" aria-hidden /> {recipe.airfryer.temp_c} °C
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden /> ca. {recipe.airfryer.time_min} Min. Garzeit
              </span>
            </p>
          </div>
        </div>
      )}
      {isAirfryerNative(recipe) && !hasAirfryer && (
        <p className="mb-4 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
          Ohne Heißluftfritteuse: im Backofen (Umluft) etwa 20 °C heißer und einige Minuten länger garen, auf einem Blech mit
          Backpapier.
        </p>
      )}
      <ol className="space-y-3">
        {steps.map((s, idx) => (
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
      {showAirfryerInfo && (
        <p className="mt-4 text-xs text-muted">
          Tipp: Den Korb nicht zu voll machen und zwischendurch schütteln – dann wird alles gleichmäßig knusprig. Garzeiten
          schwanken je nach Gerät.
        </p>
      )}
      {recipe.tips && recipe.tips.length > 0 && (
        <>
          <SectionTitle>Tipps & Varianten</SectionTitle>
          <Card className="space-y-2">
            {recipe.tips.map((t, i) => (
              <p key={i} className="flex gap-2 text-[15px] leading-relaxed">
                <Lightbulb className="mt-1 size-4 shrink-0 text-carbs" aria-hidden />
                <span>{t}</span>
              </p>
            ))}
          </Card>
        </>
      )}
      {relatedGuides(recipe).length > 0 && (
        <>
          <SectionTitle>Passendes Kochwissen</SectionTitle>
          <ul className="space-y-2">
            {relatedGuides(recipe).map((g) => (
              <li key={g.id}>
                <Link
                  to={`/rezepte/wissen/${g.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-3 ring-1 ring-line/60 transition hover:ring-brand/40"
                >
                  <span aria-hidden className="text-2xl">
                    {g.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{g.title}</span>
                    <span className="block truncate text-xs text-muted">{g.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {own && (
        <Button
          variant="ghost"
          block
          className="mt-6 text-danger"
          icon={<Trash2 className="size-4" aria-hidden />}
          disabled={del.isPending}
          onClick={async () => {
            if (!confirm(`„${recipe.title}“ wirklich löschen?`)) return
            await del.mutateAsync(own.id)
            toast(base ? 'Variante gelöscht' : 'Rezept gelöscht')
            navigate(base ? `/rezepte/${base.id}` : '/rezepte', { replace: true })
          }}
        >
          {base ? 'Variante löschen' : 'Rezept löschen'}
        </Button>
      )}
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
