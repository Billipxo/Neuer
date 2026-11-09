import { useMemo, useState, type ReactNode } from 'react'
import { Heart, LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react'
import type { MealType, Recipe } from '../types'
import { MEAL_TYPES } from '../types'
import { useLog, useProfile, useToggleFavoriteRecipe } from '../hooks/data'
import {
  airfryerRecipes,
  allTags,
  filterRecipes,
  recommendRecipes,
  RECIPES,
  SORT_LABELS,
  sortRecipes,
  TAG_LABELS,
  type RecipeSort,
} from '../lib/recipes'
import { groupByMeal, totalsOf } from '../lib/log'
import { MEAL_LABELS, mealForHour } from '../lib/meals'
import { fmtInt } from '../lib/format'
import { todayISO } from '../lib/dates'
import { PageHeader } from '../components/layout/PageHeader'
import { IconButton } from '../components/ui/Button'
import { Chip } from '../components/ui/Segmented'
import { Select } from '../components/ui/Field'
import { EmptyState } from '../components/ui/EmptyState'
import { RecipeCard, RecipeGalleryTile, RecipeTile } from '../components/recipes/RecipeCard'
import { AirfryerIcon } from '../components/recipes/AirfryerIcon'

type ViewMode = 'grid' | 'list'
const VIEW_KEY = 'teller-recipe-view'
const AF_TAG = 'heissluftfritteuse'
const TAGS = allTags(RECIPES).filter((t) => t !== AF_TAG)

function loadView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function RecipesPage() {
  const [keyword, setKeyword] = useState('')
  const [meal, setMeal] = useState<MealType | null>(null)
  const [maxKcal, setMaxKcal] = useState<number | null>(null)
  const [maxTime, setMaxTime] = useState<number | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [onlyFav, setOnlyFav] = useState(false)
  const [onlyAirfryer, setOnlyAirfryer] = useState(false)
  const [sort, setSort] = useState<RecipeSort>('empfohlen')
  const [showMore, setShowMore] = useState(false)
  const [view, setView] = useState<ViewMode>(loadView)

  const { data: profile } = useProfile()
  const { data: log = [] } = useLog(todayISO())
  const toggleFav = useToggleFavoriteRecipe()
  const favorites = profile?.favorite_recipes ?? []
  const hasAirfryer = profile?.has_airfryer ?? true

  const results = useMemo(() => {
    let list = filterRecipes(RECIPES, { meal, maxKcal, maxTime, keyword, tag })
    if (onlyFav) list = list.filter((r) => favorites.includes(r.id))
    if (onlyAirfryer) list = list.filter((r) => r.airfryer)
    return sortRecipes(list, sort, { favorites, preferAirfryer: hasAirfryer })
  }, [meal, maxKcal, maxTime, keyword, tag, onlyFav, onlyAirfryer, sort, favorites, hasAirfryer])

  const filterCount = [meal, maxKcal, maxTime, tag, onlyFav || null, onlyAirfryer || null, keyword || null].filter(Boolean).length
  const filtered = filterCount > 0

  const remaining = (profile?.kcal_target ?? 0) - totalsOf(log).kcal
  const byMeal = groupByMeal(log)
  const currentMeal = mealForHour(new Date().getHours())
  const openMeals = MEAL_TYPES.filter((m) => m !== 'snack' && byMeal[m].length === 0).length || 1
  const recommended = recommendRecipes(RECIPES, { remainingKcal: remaining, meal: currentMeal, openMeals })
  const favRecipes = RECIPES.filter((r) => favorites.includes(r.id))

  const setViewMode = (v: ViewMode) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* egal */
    }
  }
  const resetFilters = () => {
    setKeyword('')
    setMeal(null)
    setMaxKcal(null)
    setMaxTime(null)
    setTag(null)
    setOnlyFav(false)
    setOnlyAirfryer(false)
  }
  const fav = (id: string) => toggleFav.mutate(id)

  return (
    <>
      <PageHeader
        title="Rezepte"
        subtitle={`${RECIPES.length} Ideen · ${airfryerRecipes(RECIPES).length} für die Heißluftfritteuse`}
        actions={
          <div className="flex rounded-full bg-surface-2 p-0.5" role="group" aria-label="Ansicht">
            <IconButton label="Galerie-Ansicht" aria-pressed={view === 'grid'} onClick={() => setViewMode('grid')} className={`size-10 ${view === 'grid' ? 'bg-surface shadow-sm' : 'text-muted'}`}>
              <LayoutGrid className="size-[18px]" />
            </IconButton>
            <IconButton label="Listen-Ansicht" aria-pressed={view === 'list'} onClick={() => setViewMode('list')} className={`size-10 ${view === 'list' ? 'bg-surface shadow-sm' : 'text-muted'}`}>
              <List className="size-[18px]" />
            </IconButton>
          </div>
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="recipe-search" className="sr-only">
            Rezepte durchsuchen
          </label>
          <input
            id="recipe-search"
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Suchen, z. B. Lachs"
            className="min-h-12 w-full rounded-2xl bg-surface pl-11 pr-4 text-base ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          aria-expanded={showMore}
          aria-controls="recipe-filters"
          className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition ${showMore ? 'bg-brand text-brand-ink ring-brand' : 'bg-surface ring-line'}`}
          aria-label="Weitere Filter und Sortierung"
        >
          <SlidersHorizontal className="size-5" aria-hidden />
          {(maxKcal || maxTime || sort !== 'empfohlen') && <span className="absolute right-2 top-2 size-2 rounded-full bg-over" aria-hidden />}
        </button>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Schnellfilter">
        {hasAirfryer && (
          <Chip active={onlyAirfryer} onClick={() => setOnlyAirfryer((v) => !v)}>
            <span className="inline-flex items-center gap-1.5">
              <AirfryerIcon className="size-4" /> Heißluftfritteuse
            </span>
          </Chip>
        )}
        <Chip active={onlyFav} onClick={() => setOnlyFav((v) => !v)}>
          <span className="inline-flex items-center gap-1.5">
            <Heart className={`size-4 ${onlyFav ? 'fill-current' : ''}`} aria-hidden /> Favoriten
          </span>
        </Chip>
        {MEAL_TYPES.map((m) => (
          <Chip key={m} active={meal === m} onClick={() => setMeal(meal === m ? null : m)}>
            {MEAL_LABELS[m]}
          </Chip>
        ))}
        {!hasAirfryer && (
          <Chip active={onlyAirfryer} onClick={() => setOnlyAirfryer((v) => !v)}>
            <span className="inline-flex items-center gap-1.5">
              <AirfryerIcon className="size-4" /> Heißluftfritteuse
            </span>
          </Chip>
        )}
      </div>

      {showMore && (
        <div id="recipe-filters" className="mt-3 animate-fade-up space-y-3 rounded-3xl bg-surface p-3 ring-1 ring-line/60">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Max. kcal pro Portion"
              value={String(maxKcal ?? '')}
              onChange={(e) => setMaxKcal(e.target.value ? Number(e.target.value) : null)}
              options={[
                { value: '', label: 'Egal' },
                { value: '250', label: 'bis 250 kcal' },
                { value: '400', label: 'bis 400 kcal' },
                { value: '500', label: 'bis 500 kcal' },
                { value: '600', label: 'bis 600 kcal' },
              ]}
            />
            <Select
              label="Zubereitungszeit"
              value={String(maxTime ?? '')}
              onChange={(e) => setMaxTime(e.target.value ? Number(e.target.value) : null)}
              options={[
                { value: '', label: 'Egal' },
                { value: '10', label: 'bis 10 Min.' },
                { value: '20', label: 'bis 20 Min.' },
                { value: '30', label: 'bis 30 Min.' },
                { value: '45', label: 'bis 45 Min.' },
              ]}
            />
          </div>
          <Select
            label="Sortierung"
            value={sort}
            onChange={(e) => setSort(e.target.value as RecipeSort)}
            options={(Object.keys(SORT_LABELS) as RecipeSort[]).map((s) => ({ value: s, label: SORT_LABELS[s] }))}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Eigenschaften">
            {TAGS.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                {TAG_LABELS[t] ?? t}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {!filtered && (
        <>
          {recommended.length > 0 && (
            <Carousel title="Passt zu deinem Tag" subtitle={`${MEAL_LABELS[currentMeal]} · noch ${fmtInt(remaining)} kcal übrig`} recipes={recommended} />
          )}
          {hasAirfryer && (
            <Carousel
              title="Aus der Heißluftfritteuse"
              subtitle="Knusprig mit wenig Öl"
              icon={<AirfryerIcon className="size-5 text-brand" />}
              recipes={sortRecipes(airfryerRecipes(RECIPES), 'zeit')}
              onAll={() => setOnlyAirfryer(true)}
            />
          )}
          {favRecipes.length > 0 && (
            <Carousel title="Deine Favoriten" icon={<Heart className="size-5 fill-fat text-fat" aria-hidden />} recipes={favRecipes} onAll={() => setOnlyFav(true)} />
          )}
        </>
      )}

      <section className="mt-6" aria-labelledby="all-recipes">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="all-recipes" className="font-semibold" aria-live="polite">
            {filtered ? `${results.length} ${results.length === 1 ? 'Treffer' : 'Treffer'}` : 'Alle Rezepte'}
          </h2>
          {filtered && (
            <button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand">
              <X className="size-4" aria-hidden /> Filter zurücksetzen
            </button>
          )}
        </div>
        {view === 'grid' ? (
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {results.map((r) => (
              <RecipeGalleryTile key={r.id} recipe={r} favorite={favorites.includes(r.id)} onToggleFavorite={fav} />
            ))}
          </ul>
        ) : (
          <ul className="mt-3 space-y-2">
            {results.map((r) => (
              <RecipeCard key={r.id} recipe={r} favorite={favorites.includes(r.id)} onToggleFavorite={fav} />
            ))}
          </ul>
        )}
        {results.length === 0 && (
          <EmptyState
            title={onlyFav && !favorites.length ? 'Noch keine Favoriten' : 'Keine passenden Rezepte'}
            text={onlyFav && !favorites.length ? 'Tippe auf das Herz eines Rezepts, um es hier zu sammeln.' : 'Lockere einen Filter oder probiere ein anderes Stichwort.'}
          />
        )}
      </section>
    </>
  )
}

function Carousel({
  title,
  subtitle,
  icon,
  recipes,
  onAll,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  recipes: Recipe[]
  onAll?: () => void
}) {
  return (
    <section aria-label={title} className="mt-6">
      <div className="flex items-end justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-semibold">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {onAll && (
          <button type="button" onClick={onAll} className="min-h-9 shrink-0 text-sm font-semibold text-brand">
            Alle ({recipes.length})
          </button>
        )}
      </div>
      <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {recipes.map((r) => (
          <RecipeTile key={r.id} recipe={r} />
        ))}
      </div>
    </section>
  )
}
