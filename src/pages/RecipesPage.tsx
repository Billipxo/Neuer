import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { MealType } from '../types'
import { MEAL_TYPES } from '../types'
import { useLog, useProfile } from '../hooks/data'
import { allTags, filterRecipes, recommendRecipes, RECIPES, TAG_LABELS } from '../lib/recipes'
import { groupByMeal, totalsOf } from '../lib/log'
import { MEAL_LABELS, mealForHour } from '../lib/meals'
import { fmtInt } from '../lib/format'
import { todayISO } from '../lib/dates'
import { PageHeader } from '../components/layout/PageHeader'
import { Chip } from '../components/ui/Segmented'
import { Select } from '../components/ui/Field'
import { EmptyState } from '../components/ui/EmptyState'
import { RecipeCard, RecipeTile } from '../components/recipes/RecipeCard'

const TAGS = allTags(RECIPES)

export function RecipesPage() {
  const [keyword, setKeyword] = useState('')
  const [meal, setMeal] = useState<MealType | null>(null)
  const [maxKcal, setMaxKcal] = useState<number | null>(null)
  const [maxTime, setMaxTime] = useState<number | null>(null)
  const [tag, setTag] = useState<string | null>(null)

  const { data: profile } = useProfile()
  const { data: log = [] } = useLog(todayISO())

  const results = useMemo(() => filterRecipes(RECIPES, { meal, maxKcal, maxTime, keyword, tag }), [meal, maxKcal, maxTime, keyword, tag])
  const filtered = Boolean(keyword || meal || maxKcal || maxTime || tag)

  const remaining = (profile?.kcal_target ?? 0) - totalsOf(log).kcal
  const byMeal = groupByMeal(log)
  const currentMeal = mealForHour(new Date().getHours())
  const openMeals = MEAL_TYPES.filter((m) => m !== 'snack' && byMeal[m].length === 0).length || 1
  const recommended = recommendRecipes(RECIPES, { remainingKcal: remaining, meal: currentMeal, openMeals })

  return (
    <>
      <PageHeader title="Rezepte" subtitle={`${RECIPES.length} Ideen für jeden Tag`} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="recipe-search" className="sr-only">
          Rezepte durchsuchen
        </label>
        <input
          id="recipe-search"
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Stichwort, z. B. Linsen oder Lachs"
          className="min-h-12 w-full rounded-2xl bg-surface pl-11 pr-4 text-base ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Mahlzeitenart">
        <Chip active={!meal} onClick={() => setMeal(null)}>
          Alle
        </Chip>
        {MEAL_TYPES.map((m) => (
          <Chip key={m} active={meal === m} onClick={() => setMeal(meal === m ? null : m)}>
            {MEAL_LABELS[m]}
          </Chip>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
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
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Eigenschaften">
        {TAGS.map((t) => (
          <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
            {TAG_LABELS[t] ?? t}
          </Chip>
        ))}
      </div>

      {!filtered && recommended.length > 0 && (
        <section aria-labelledby="rec-title" className="mt-6">
          <h2 id="rec-title" className="px-1 font-semibold">
            Passt zu deinem Tag
          </h2>
          <p className="px-1 text-sm text-muted">
            {MEAL_LABELS[currentMeal]} · noch {fmtInt(remaining)} kcal übrig
          </p>
          <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {recommended.map((r) => (
              <RecipeTile key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6" aria-live="polite">
        <h2 className="px-1 font-semibold">{filtered ? `${results.length} Treffer` : 'Alle Rezepte'}</h2>
        <ul className="mt-3 space-y-2">
          {results.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </ul>
        {results.length === 0 && <EmptyState title="Keine passenden Rezepte" text="Lockere einen Filter oder probiere ein anderes Stichwort." />}
      </section>
    </>
  )
}
