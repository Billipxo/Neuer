import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Plus, Search, UtensilsCrossed, X } from 'lucide-react'
import { matchesDiet, RECIPES, recipeEmoji } from '../lib/recipes'
import { pantryChoices } from '../lib/pantry'
import {
  dishNameFrom,
  favoriteDishIngredient,
  favoriteRecipes,
  loadFavorites,
  MAX_FAVORITES,
  saveFavorites,
  type FavoriteMatch,
} from '../lib/favorites'
import { useVariantRecipes } from '../hooks/variants'
import { useProfile } from '../hooks/data'
import { fmtInt } from '../lib/format'
import type { DishIngredient } from '../types'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { recipeGradient } from '../components/recipes/RecipeCard'

const CHOICES = pantryChoices(RECIPES)
/** Für den Gericht-Editor: Name und Zutaten, die beim Öffnen schon eingetragen sind */
export interface DishPrefill {
  name: string
  ingredients: DishIngredient[]
}

/** Lieblingszutaten: Rezepte daraus und eigene Gerichte daraus zusammenstellen */
export function FavoriteIngredientsPage() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [moreSingle, setMoreSingle] = useState(false)
  const { data: profile } = useProfile()
  const { recipes: ownRecipes, shared } = useVariantRecipes()

  const update = (next: string[]) => {
    setFavorites(next)
    setPicked((p) => p.filter((x) => next.includes(x)))
    saveFavorites(next)
  }
  const toggleFavorite = (name: string) => update(favorites.includes(name) ? favorites.filter((f) => f !== name) : [...favorites, name])
  const togglePicked = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]))

  const q = query.trim().toLowerCase()
  const suggestions = useMemo(() => {
    const free = CHOICES.filter((c) => !favorites.includes(c.name))
    return q ? free.filter((c) => c.name.toLowerCase().includes(q)) : free
  }, [q, favorites])
  const full = favorites.length >= MAX_FAVORITES

  const matches = useMemo(
    () => favoriteRecipes([...ownRecipes, ...shared, ...RECIPES].filter((r) => matchesDiet(r, profile?.diet, profile?.avoid)), favorites),
    [favorites, ownRecipes, shared, profile?.diet, profile?.avoid],
  )
  const several = matches.filter((m) => m.used.length >= 2)
  const single = matches.filter((m) => m.used.length === 1)

  function createDish() {
    const ingredients = picked.map(favoriteDishIngredient).filter((i): i is DishIngredient => !!i)
    if (!ingredients.length) return
    const prefill: DishPrefill = { name: dishNameFrom(picked), ingredients }
    navigate('/gerichte/neu', { state: { prefill } })
  }

  return (
    <>
      <PageHeader title="Lieblingszutaten" subtitle="Gerichte aus dem, was du gern isst" back="/rezepte" />

      <section aria-labelledby="fav-title" className="rounded-3xl bg-surface p-4 ring-1 ring-line/60">
        <h2 id="fav-title" className="font-semibold">
          Deine Lieblingszutaten {favorites.length > 0 && <span className="text-muted">({favorites.length})</span>}
        </h2>
        {favorites.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Tippe unten an, was du gern isst – Lachs, Feta, Kichererbsen …</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Ausgewählte Lieblingszutaten">
            {favorites.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  onClick={() => toggleFavorite(f)}
                  aria-label={`${f} entfernen`}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-brand px-3 text-sm font-medium text-brand-ink transition active:scale-95"
                >
                  {f} <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="fav-search" className="sr-only">
            Lieblingszutat suchen
          </label>
          <input
            id="fav-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zutat suchen, z. B. Lachs"
            disabled={full}
            className="min-h-12 w-full rounded-2xl bg-surface-2 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
          />
        </div>
        {full ? (
          <p className="mt-2 text-sm text-muted">Das sind schon {MAX_FAVORITES} Lieblingszutaten – für eine neue erst eine andere entfernen.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={q ? 'Passende Zutaten' : 'Häufige Zutaten'}>
            {(showAll || q ? suggestions : suggestions.slice(0, 16)).map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => {
                    toggleFavorite(c.name)
                    setQuery('')
                  }}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface-2 px-3 text-sm transition hover:bg-line/70 active:scale-95"
                >
                  <Plus className="size-3.5 text-muted" aria-hidden /> {c.name}
                </button>
              </li>
            ))}
            {!q && !showAll && suggestions.length > 16 && (
              <li>
                <button type="button" onClick={() => setShowAll(true)} className="min-h-9 rounded-full px-3 text-sm font-semibold text-brand">
                  Mehr anzeigen
                </button>
              </li>
            )}
          </ul>
        )}
        {q && !full && suggestions.length === 0 && <p className="mt-2 text-sm text-muted">Keine passende Zutat in den Rezepten.</p>}
        <p className="mt-3 text-xs text-muted">Nur auf diesem Gerät gespeichert. „Woche vorschlagen“ im Wochenplan nimmt Rezepte damit gern.</p>
      </section>

      {favorites.length > 0 && (
        <section aria-labelledby="dish-title" className="mt-4 rounded-3xl bg-surface p-4 ring-1 ring-line/60">
          <h2 id="dish-title" className="flex items-center gap-2 font-semibold">
            <UtensilsCrossed className="size-4 text-brand" aria-hidden /> Eigenes Gericht zusammenstellen
          </h2>
          <p className="mt-1 text-sm text-muted">Tippe an, was hinein soll – die Mengen passt du danach an.</p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Zutaten für das Gericht">
            {favorites.map((f) => {
              const on = picked.includes(f)
              return (
                <li key={f}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePicked(f)}
                    className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-medium transition active:scale-95 ${
                      on ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-ink hover:bg-line/70'
                    }`}
                  >
                    {on && <Check className="size-3.5" aria-hidden />} {f}
                  </button>
                </li>
              )
            })}
          </ul>
          <Button block className="mt-4" disabled={picked.length === 0} onClick={createDish} icon={<Plus className="size-4" aria-hidden />}>
            {picked.length === 0 ? 'Zutaten antippen' : `Gericht aus ${picked.length} ${picked.length === 1 ? 'Zutat' : 'Zutaten'} anlegen`}
          </Button>
        </section>
      )}

      <div aria-live="polite">
        {favorites.length === 0 ? (
          <EmptyState title="Noch keine Lieblingszutaten" text="Wähle oben aus, was du gern isst – dann erscheinen hier passende Rezepte aus dem Kochbuch." />
        ) : matches.length === 0 ? (
          <EmptyState title="Noch kein passendes Rezept" text="Wähle weitere Lieblingszutaten aus." />
        ) : null}
        <MatchList title="Mit mehreren Lieblingszutaten" items={several} />
        <MatchList title="Mit einer Lieblingszutat" items={moreSingle ? single : single.slice(0, 12)} total={single.length} />
        {!moreSingle && single.length > 12 && (
          <Button variant="secondary" block className="mt-3" onClick={() => setMoreSingle(true)}>
            Alle {single.length} anzeigen
          </Button>
        )}
      </div>
    </>
  )
}

function MatchList({ title, items, total }: { title: string; items: FavoriteMatch[]; total?: number }) {
  if (!items.length) return null
  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="px-1 font-semibold">
        {title} <span className="text-muted">({total ?? items.length})</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((m) => (
          <li key={m.recipe.id}>
            <Link to={`/rezepte/${m.recipe.id}`} className="flex items-center gap-3 rounded-3xl bg-surface p-3 ring-1 ring-line/60 transition active:scale-[0.99]">
              <span aria-hidden className={`flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${recipeGradient(m.recipe)}`}>
                {recipeEmoji(m.recipe)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block font-semibold leading-snug">{m.recipe.title}</span>
                <span className="mt-0.5 block text-xs text-muted tabular">
                  {fmtInt(m.recipe.nutrition.kcal)} kcal · {m.recipe.time_min} Min.
                  {m.others > 0 && ` · ${m.others} weitere ${m.others === 1 ? 'Zutat' : 'Zutaten'}`}
                </span>
                <span className="mt-1 block text-sm">
                  <span className="text-muted">Mit: </span>
                  {m.used.join(', ')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
