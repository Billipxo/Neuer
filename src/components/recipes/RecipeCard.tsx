import { Link } from 'react-router-dom'
import { Clock, Flame } from 'lucide-react'
import type { Recipe } from '../../types'
import { recipeEmoji, TAG_LABELS } from '../../lib/recipes'
import { fmtInt } from '../../lib/format'

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <li>
      <Link
        to={`/rezepte/${recipe.id}`}
        className="flex items-center gap-3 rounded-3xl bg-surface p-3 ring-1 ring-line/60 transition active:scale-[0.99] hover:ring-brand/40"
      >
        <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft/70 text-3xl">
          {recipeEmoji(recipe)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold leading-snug">{recipe.title}</p>
          <p className="mt-1 flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1 tabular">
              <Flame className="size-3.5" aria-hidden />
              {fmtInt(recipe.nutrition.kcal)} kcal
            </span>
            <span className="inline-flex items-center gap-1 tabular">
              <Clock className="size-3.5" aria-hidden />
              {recipe.time_min} Min.
            </span>
          </p>
          {recipe.tags.length > 0 && (
            <p className="mt-1 truncate text-xs text-brand">{recipe.tags.slice(0, 3).map((t) => TAG_LABELS[t] ?? t).join(' · ')}</p>
          )}
        </div>
      </Link>
    </li>
  )
}

export function RecipeTile({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/rezepte/${recipe.id}`}
      className="flex w-40 shrink-0 snap-start flex-col rounded-3xl bg-surface p-3 ring-1 ring-line/60 transition active:scale-[0.98]"
    >
      <span aria-hidden className="flex h-20 items-center justify-center rounded-2xl bg-brand-soft/70 text-4xl">
        {recipeEmoji(recipe)}
      </span>
      <span className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{recipe.title}</span>
      <span className="mt-auto pt-1 text-xs text-muted tabular">
        {fmtInt(recipe.nutrition.kcal)} kcal · {recipe.time_min} Min.
      </span>
    </Link>
  )
}
