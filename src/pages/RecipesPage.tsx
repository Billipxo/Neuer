import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Clock, Flame, Heart, History, LayoutGrid, Leaf, List, ListChecks, Refrigerator, Search, Shuffle, SlidersHorizontal, Wand2, X } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CHAPTERS, getChapter } from '../data/chapters'
import { GUIDES } from '../data/guides'
import type { Recipe } from '../types'
import { MEAL_TYPES } from '../types'
import { useLog, useProfile, useToggleFavoriteRecipe } from '../hooks/data'
import { useCookedStats } from '../hooks/cooked'
import { useVariantRecipes } from '../hooks/variants'
import { isVariantRecipe } from '../lib/variants'
import { inSeasonNow, MONTH_NAMES, seasonalRecipes } from '../lib/season'
import {
  airfryerRecipes,
  allTags,
  FEW_INGREDIENTS_MAX,
  KCAL_LABELS,
  matchesDiet,
  filterRecipes,
  MEAT_LABELS,
  MEAT_MUCH_FROM,
  pickRandom,
  recipeEmoji,
  recipeFacts,
  recommendRecipes,
  RECIPES,
  SORT_LABELS,
  sortRecipes,
  TAG_LABELS,
  TIME_OPTIONS,
  type KcalFilter,
  type MeatFilter,
  type RecipeSort,
} from '../lib/recipes'
import {
  activeChips,
  activeFilterCount,
  NO_FILTERS,
  NO_SHEET_FILTERS,
  readEntry,
  sheetFilterCount,
  toggleTag,
  toRecipeFilter,
  writeEntry,
  type CookbookFilters,
} from '../lib/cookbookFilters'
import { groupByMeal, totalsOf } from '../lib/log'
import { MEAL_LABELS, mealForHour } from '../lib/meals'
import { fmtInt } from '../lib/format'
import { todayISO } from '../lib/dates'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Chip } from '../components/ui/Segmented'
import { Select } from '../components/ui/Field'
import { EmptyState } from '../components/ui/EmptyState'
import { RecipeCard, RecipeGalleryTile, RecipeTile, recipeGradient } from '../components/recipes/RecipeCard'
import { Sheet } from '../components/ui/Sheet'
import { AirfryerIcon } from '../components/recipes/AirfryerIcon'

type ViewMode = 'grid' | 'list'
const VIEW_KEY = 'teller-recipe-view'
const AF_TAG = 'heissluftfritteuse'
// „Schnell“ und „Vegetarisch“ stecken in „Fertig in“ und „Fleisch & Fisch“, die Heißluftfritteuse ist ein Schnellfilter
const TAGS = allTags(RECIPES).filter((t) => t !== AF_TAG && t !== 'schnell' && t !== 'vegetarisch')
const FILTERS_KEY = 'teller-kochbuch-filter'

/** Auswahl dieses Eintrags im Verlauf: Nach dem Blick in ein Rezept geht es mit „Zurück“ mit derselben Auswahl weiter */
function loadFilters(entry: string): CookbookFilters {
  try {
    return readEntry(sessionStorage.getItem(FILTERS_KEY), entry)
  } catch {
    return NO_FILTERS
  }
}

function saveFilters(entry: string, filters: CookbookFilters) {
  try {
    sessionStorage.setItem(FILTERS_KEY, writeEntry(sessionStorage.getItem(FILTERS_KEY), entry, filters))
  } catch {
    /* ohne Speicher gelten die Filter nur, solange die Seite offen ist */
  }
}

function loadView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function RecipesPage() {
  // Die Auswahl gehört zum Eintrag im Verlauf: Wechselt er (Zurück, neuer Aufruf), gilt dessen Auswahl
  const { key: entry } = useLocation()
  const [state, setState] = useState(() => ({ entry, filters: loadFilters(entry) }))
  if (state.entry !== entry) setState({ entry, filters: loadFilters(entry) })
  const filters = state.entry === entry ? state.filters : NO_FILTERS
  const set = useCallback((patch: Partial<CookbookFilters>) => setState((s) => ({ ...s, filters: { ...s.filters, ...patch } })), [])
  const setFilters = useCallback((f: CookbookFilters) => setState((s) => ({ ...s, filters: f })), [])
  const { keyword, meal, onlyFav, onlyAirfryer, onlyMine, sort } = filters
  useEffect(() => saveFilters(state.entry, state.filters), [state])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [suggestion, setSuggestion] = useState<Recipe | null>(null)
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>(loadView)
  const [dietOnly, setDietOnly] = useState(true)
  const [params] = useSearchParams()
  const chapter = getChapter(params.get('kapitel'))

  const { data: profile } = useProfile()
  const { data: log = [] } = useLog(todayISO())
  const toggleFav = useToggleFavoriteRecipe()
  const cooked = useCookedStats()
  const { recipes: mine, shared } = useVariantRecipes()
  const favorites = profile?.favorite_recipes ?? []
  const hasAirfryer = profile?.has_airfryer ?? true
  const diet = profile?.diet ?? 'all'
  const avoid = useMemo(() => profile?.avoid ?? [], [profile?.avoid])
  /** Gibt es persönliche Vorgaben (Ernährungsweise oder Unverträglichkeiten)? */
  const personal = diet !== 'all' || avoid.length > 0
  // Eigene Varianten und Rezepte gehören mit ins Kochbuch – im gemeinsamen Haushalt auch die der anderen
  const all = useMemo(() => (mine.length || shared.length ? [...mine, ...shared, ...RECIPES] : RECIPES), [mine, shared])
  // Ernährungsweise und Unverträglichkeiten aus dem Profil als Standardfilter (abschaltbar)
  const base = useMemo(() => (dietOnly && personal ? all.filter((r) => matchesDiet(r, diet, avoid)) : all), [all, dietOnly, personal, diet, avoid])

  /** Rezepte, die zu einer Filter-Auswahl passen (unsortiert) */
  const matching = useCallback(
    (f: CookbookFilters) => {
      let list = filterRecipes(base, toRecipeFilter(f, chapter?.id ?? null))
      if (f.onlyFav) list = list.filter((r) => favorites.includes(r.id))
      if (f.onlyAirfryer) list = list.filter((r) => r.airfryer)
      if (f.onlyMine) list = list.filter(isVariantRecipe)
      return list
    },
    [base, chapter, favorites],
  )
  const results = useMemo(
    () => sortRecipes(matching(filters), sort, { favorites, preferAirfryer: hasAirfryer, cooked }),
    [matching, filters, sort, favorites, hasAirfryer, cooked],
  )
  /** Wie viele Rezepte bei einer geänderten Auswahl übrig blieben – nur, solange „Filtern & sortieren“ offen ist */
  const countWith = useCallback((patch: Partial<CookbookFilters>) => (filtersOpen ? matching({ ...filters, ...patch }).length : 0), [filtersOpen, matching, filters])

  const filterCount = activeFilterCount(filters)
  const sheetCount = sheetFilterCount(filters)
  const chips = activeChips(filters)
  const filtered = filterCount > 0 || Boolean(chapter)
  const chapterCounts = useMemo(() => new Map(CHAPTERS.map((c) => [c.id, base.filter((r) => r.chapter === c.id).length])), [base])

  const remaining = (profile?.kcal_target ?? 0) - totalsOf(log).kcal
  const byMeal = groupByMeal(log)
  const currentMeal = mealForHour(new Date().getHours())
  const openMeals = MEAL_TYPES.filter((m) => m !== 'snack' && byMeal[m].length === 0).length || 1
  const recommended = recommendRecipes(base, { remainingKcal: remaining, meal: currentMeal, openMeals })
  const favRecipes = all.filter((r) => favorites.includes(r.id))
  const month = new Date().getMonth() + 1
  const seasonal = useMemo(() => seasonalRecipes(base, month, 10), [base, month])
  const seasonNames = useMemo(() => inSeasonNow(month).slice(0, 4).join(', '), [month])
  const recentlyCooked = useMemo(
    () =>
      [...cooked]
        .sort((a, b) => (a[1].last < b[1].last ? 1 : -1))
        .map(([id]) => all.find((r) => r.id === id))
        .filter((r): r is Recipe => Boolean(r))
        .slice(0, 10),
    [cooked, all],
  )

  const setViewMode = (v: ViewMode) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* egal */
    }
  }
  // Alle Filter weg, die gewählte Sortierung bleibt
  const resetFilters = () => setFilters({ ...NO_FILTERS, sort })
  const fav = (id: string) => toggleFav.mutate(id)

  return (
    <>
      <PageHeader
        title={chapter ? chapter.title : 'Kochbuch'}
        back={chapter ? '/rezepte' : undefined}
        subtitle={
          chapter
            ? `${chapterCounts.get(chapter.id) ?? 0} Rezepte`
            : `${base.length} Rezepte · ${CHAPTERS.length} Kapitel · ${airfryerRecipes(base).length} für die Heißluftfritteuse`
        }
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
            onChange={(e) => set({ keyword: e.target.value })}
            placeholder="Suchen, z. B. Lachs"
            className="min-h-12 w-full rounded-2xl bg-surface pl-11 pr-4 text-base ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition ${sheetCount ? 'bg-brand text-brand-ink ring-brand' : 'bg-surface ring-line'}`}
          aria-label={sheetCount ? `Filtern und sortieren, ${sheetCount} aktiv` : 'Filtern und sortieren'}
        >
          <SlidersHorizontal className="size-5" aria-hidden />
          {sheetCount > 0 && (
            <span aria-hidden className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-over text-[11px] font-bold text-white tabular">
              {sheetCount}
            </span>
          )}
        </button>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Schnellfilter">
        {personal && (
          <Chip active={dietOnly} onClick={() => setDietOnly((v) => !v)}>
            <span className="inline-flex items-center gap-1.5">
              <Leaf className="size-4" aria-hidden /> Für mich passend
            </span>
          </Chip>
        )}
        {hasAirfryer && (
          <Chip active={onlyAirfryer} onClick={() => set({ onlyAirfryer: !onlyAirfryer })}>
            <span className="inline-flex items-center gap-1.5">
              <AirfryerIcon className="size-4" /> Heißluftfritteuse
            </span>
          </Chip>
        )}
        <Chip active={onlyFav} onClick={() => set({ onlyFav: !onlyFav })}>
          <span className="inline-flex items-center gap-1.5">
            <Heart className={`size-4 ${onlyFav ? 'fill-current' : ''}`} aria-hidden /> Favoriten
          </span>
        </Chip>
        {mine.length > 0 && (
          <Chip active={onlyMine} onClick={() => set({ onlyMine: !onlyMine })}>
            <span className="inline-flex items-center gap-1.5">
              <Wand2 className="size-4" aria-hidden /> Meine Rezepte
            </span>
          </Chip>
        )}
        {MEAL_TYPES.map((m) => (
          <Chip key={m} active={meal === m} onClick={() => set({ meal: meal === m ? null : m })}>
            {MEAL_LABELS[m]}
          </Chip>
        ))}
        {!hasAirfryer && (
          <Chip active={onlyAirfryer} onClick={() => set({ onlyAirfryer: !onlyAirfryer })}>
            <span className="inline-flex items-center gap-1.5">
              <AirfryerIcon className="size-4" /> Heißluftfritteuse
            </span>
          </Chip>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Aktive Filter">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => set(c.clear)}
              aria-label={`${c.label} entfernen`}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-brand-soft px-3 text-sm font-medium text-brand transition hover:bg-brand-soft/70"
            >
              {c.label}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {chapter && (
        <p className="mt-3 flex gap-3 rounded-3xl bg-brand-soft/50 p-4 text-sm leading-relaxed">
          <span aria-hidden className="text-3xl">
            {chapter.emoji}
          </span>
          <span>{chapter.intro}</span>
        </p>
      )}

      {!filtered && (
        <>
          <section className="mt-5" aria-labelledby="toc-title">
            <h2 id="toc-title" className="px-1 font-semibold">
              Inhalt
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {CHAPTERS.filter((c) => (chapterCounts.get(c.id) ?? 0) > 0).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/rezepte?kapitel=${c.id}`}
                    className="flex min-h-16 items-center gap-2.5 rounded-2xl bg-surface p-2.5 ring-1 ring-line/60 transition active:scale-[0.98] hover:ring-brand/40"
                  >
                    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-2xl">
                      {c.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{c.title}</span>
                      <span className="block text-xs text-muted tabular">{chapterCounts.get(c.id)} Rezepte</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <FeatureCard to="/rezepte/zutaten" icon={<Refrigerator className="size-6" aria-hidden />} title="Was habe ich da?" text="Rezepte aus deinen Zutaten" />
            <FeatureCard to="/rezepte/wissen" icon={<BookOpen className="size-6" aria-hidden />} title="Kochwissen" text={`${GUIDES.length} Anleitungen & Garzeiten`} />
            <FeatureCard
              to="/rezepte/neu"
              wide
              icon={<Wand2 className="size-6" aria-hidden />}
              title="Eigenes Rezept anlegen"
              text="Oder ein Kochbuch-Rezept abwandeln – Nährwerte werden aus den Zutaten berechnet"
            />
          </div>
          {recommended.length > 0 && (
            <Carousel title="Passt zu deinem Tag" subtitle={`${MEAL_LABELS[currentMeal]} · noch ${fmtInt(remaining)} kcal übrig`} recipes={recommended} />
          )}
          {hasAirfryer && (
            <Carousel
              title="Aus der Heißluftfritteuse"
              subtitle="Knusprig mit wenig Öl"
              icon={<AirfryerIcon className="size-5 text-brand" />}
              recipes={sortRecipes(airfryerRecipes(base), 'zeit')}
              onAll={() => set({ onlyAirfryer: true })}
            />
          )}
          {seasonal.length > 0 && (
            <Carousel
              title={`Saison im ${MONTH_NAMES[month - 1]}`}
              subtitle={`Jetzt regional: ${seasonNames} …`}
              icon={<Leaf className="size-5 text-brand" aria-hidden />}
              recipes={seasonal}
            />
          )}
          {mine.length > 0 && (
            <Carousel title="Deine Rezepte & Varianten" icon={<Wand2 className="size-5 text-brand" aria-hidden />} recipes={mine} onAll={() => set({ onlyMine: true })} />
          )}
          {recentlyCooked.length > 0 && (
            <Carousel title="Zuletzt gekocht" icon={<History className="size-5 text-brand" aria-hidden />} recipes={recentlyCooked} onAll={() => set({ sort: 'oft' })} />
          )}
          {favRecipes.length > 0 && (
            <Carousel title="Deine Favoriten" icon={<Heart className="size-5 fill-fat text-fat" aria-hidden />} recipes={favRecipes} onAll={() => set({ onlyFav: true })} />
          )}
        </>
      )}

      <section className="mt-6" aria-labelledby="all-recipes">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="all-recipes" className="font-semibold" aria-live="polite">
            {filterCount > 0 ? `${results.length} Treffer` : chapter ? 'Rezepte' : 'Alle Rezepte'}
          </h2>
          {filterCount > 0 && (
            <button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand">
              <X className="size-4" aria-hidden /> Filter zurücksetzen
            </button>
          )}
        </div>
        {results.length > 1 && (
          <button
            type="button"
            onClick={() => setSuggestion(pickRandom(results) ?? null)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-sm font-semibold text-brand ring-1 ring-line/60 transition hover:ring-brand/40"
          >
            <Shuffle className="size-4" aria-hidden /> Unentschlossen? Zufallsvorschlag
          </button>
        )}
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

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtern & sortieren"
        tall
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" disabled={sheetCount === 0} onClick={() => set(NO_SHEET_FILTERS)}>
              Zurücksetzen
            </Button>
            <Button block size="lg" onClick={() => setFiltersOpen(false)}>
              {results.length === 1 ? '1 Rezept anzeigen' : `${fmtInt(results.length)} Rezepte anzeigen`}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <FilterGroup title="Fertig in" hint="Inklusive Ruhe-, Quell- und Kühlzeit.">
            {TIME_OPTIONS.map((t) => (
              <CountChip key={t} text={`bis ${t} Min.`} active={filters.time === t} count={countWith({ time: t })} onClick={() => set({ time: filters.time === t ? null : t })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Fleisch & Fisch" hint={`„Wenig Fleisch“ heißt unter ${MEAT_MUCH_FROM} g pro Portion – etwa Schinken, Speck oder Würstchen als Beigabe.`}>
            {(Object.keys(MEAT_LABELS) as MeatFilter[]).map((m) => (
              <CountChip key={m} text={MEAT_LABELS[m]} active={filters.meat === m} count={countWith({ meat: m })} onClick={() => set({ meat: filters.meat === m ? null : m })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Kalorien pro Portion">
            {(Object.keys(KCAL_LABELS) as KcalFilter[]).map((k) => (
              <CountChip key={k} text={KCAL_LABELS[k]} active={filters.kcal === k} count={countWith({ kcal: k })} onClick={() => set({ kcal: filters.kcal === k ? null : k })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Aufwand" hint="Gezählt ohne Grundvorrat wie Salz, Öl und Gewürze.">
            <CountChip text={`Wenige Zutaten · bis ${FEW_INGREDIENTS_MAX}`} active={filters.few} count={countWith({ few: true })} onClick={() => set({ few: !filters.few })} />
          </FilterGroup>
          <FilterGroup title="Eigenschaften" hint="Mehrere möglich – es bleiben Rezepte, auf die alle zutreffen.">
            {TAGS.map((t) => (
              <CountChip
                key={t}
                text={TAG_LABELS[t] ?? t}
                active={filters.tags.includes(t)}
                count={countWith({ tags: filters.tags.includes(t) ? filters.tags : [...filters.tags, t] })}
                onClick={() => set({ tags: toggleTag(filters.tags, t) })}
              />
            ))}
          </FilterGroup>
          <Select
            label="Sortieren nach"
            value={sort}
            onChange={(e) => set({ sort: e.target.value as RecipeSort })}
            options={(Object.keys(SORT_LABELS) as RecipeSort[]).map((s) => ({ value: s, label: SORT_LABELS[s] }))}
          />
        </div>
      </Sheet>

      <Sheet
        open={Boolean(suggestion)}
        onClose={() => setSuggestion(null)}
        title="Wie wär's damit?"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Shuffle className="size-4" aria-hidden />}
              disabled={results.length < 2}
              onClick={() => setSuggestion(pickRandom(results, suggestion?.id) ?? null)}
            >
              Anderer Vorschlag
            </Button>
            <Button
              block
              size="lg"
              onClick={() => {
                if (!suggestion) return
                // erst schließen: Wer schnell zurückgeht, soll nicht wieder im Dialog landen
                setSuggestion(null)
                navigate(`/rezepte/${suggestion.id}`)
              }}
            >
              Rezept ansehen
            </Button>
          </div>
        }
      >
        {suggestion && <SuggestionCard recipe={suggestion} />}
      </Sheet>
    </>
  )
}

function FilterGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={title}>
        {children}
      </div>
    </section>
  )
}

/** Auswahl-Chip mit der Zahl der Rezepte, die damit übrig blieben – ohne Treffer nicht wählbar */
function CountChip({ text, active, count, onClick }: { text: string; active: boolean; count: number; onClick: () => void }) {
  return (
    <Chip active={active} onClick={onClick} disabled={!active && count === 0} label={`${text}, ${count === 1 ? '1 Rezept' : `${fmtInt(count)} Rezepte`}`}>
      {text}
      <span className={`ml-1.5 text-xs tabular ${active ? 'opacity-80' : 'text-muted'}`}>{fmtInt(count)}</span>
    </Chip>
  )
}

/** Vorschlag mit den Angaben, die bei der Entscheidung helfen */
function SuggestionCard({ recipe }: { recipe: Recipe }) {
  const facts = recipeFacts(recipe)
  const meatText = !facts.hasMeat && !facts.hasFish
    ? 'Vegetarisch'
    : facts.hasMeat
      ? `${facts.meat >= MEAT_MUCH_FROM ? 'Viel' : 'Wenig'} Fleisch${facts.meat > 0 ? ` · ca. ${fmtInt(facts.meat)} g pro Portion` : ''}`
      : 'Mit Fisch'
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className={`flex size-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br text-4xl ${recipeGradient(recipe)}`}>
          {recipeEmoji(recipe)}
        </span>
        <h3 className="text-lg font-semibold leading-snug">{recipe.title}</h3>
      </div>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        <li className="flex items-center gap-2 rounded-2xl bg-surface-2/70 p-3">
          <Flame className="size-4 shrink-0 text-muted" aria-hidden /> {fmtInt(recipe.nutrition.kcal)} kcal pro Portion
        </li>
        <li className="flex items-center gap-2 rounded-2xl bg-surface-2/70 p-3">
          <Clock className="size-4 shrink-0 text-muted" aria-hidden /> fertig in {facts.totalTime} Min.
        </li>
        <li className="flex items-center gap-2 rounded-2xl bg-surface-2/70 p-3">
          <ListChecks className="size-4 shrink-0 text-muted" aria-hidden /> {facts.ingredients} Zutaten
        </li>
        <li className="flex items-center gap-2 rounded-2xl bg-surface-2/70 p-3">
          <Leaf className="size-4 shrink-0 text-muted" aria-hidden /> {meatText}
        </li>
      </ul>
    </div>
  )
}

function FeatureCard({ to, icon, title, text, wide }: { to: string; icon: ReactNode; title: string; text: string; wide?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex gap-2 rounded-3xl bg-surface p-3 ring-1 ring-line/60 transition active:scale-[0.98] hover:ring-brand/40 ${
        wide ? 'col-span-2 flex-row items-center gap-3' : 'flex-col'
      }`}
    >
      <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</span>
      <span>
        <span className="block font-semibold leading-snug">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </Link>
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
