import { Link } from 'react-router-dom'
import { Clock, Flame, Heart } from 'lucide-react'
import type { MealType, Recipe } from '../../types'
import { recipeEmoji, TAG_LABELS } from '../../lib/recipes'
import { fmtInt } from '../../lib/format'
import { AirfryerIcon } from './AirfryerIcon'

/** Farbverlauf je Mahlzeitenart – ersetzt Fotos */
const GRADIENTS: Record<MealType, string> = {
  breakfast: 'from-amber-100 to-orange-200 dark:from-amber-900/50 dark:to-orange-900/30',
  lunch: 'from-lime-100 to-emerald-200 dark:from-lime-900/40 dark:to-emerald-900/40',
  dinner: 'from-sky-100 to-indigo-200 dark:from-sky-900/40 dark:to-indigo-900/40',
  snack: 'from-rose-100 to-pink-200 dark:from-rose-900/40 dark:to-pink-900/30',
}

export function recipeGradient(r: Recipe): string {
  return GRADIENTS[r.meal[0]] ?? GRADIENTS.lunch
}

interface CardProps {
  recipe: Recipe
  favorite?: boolean
  onToggleFavorite?: (id: string) => void
}

function FavoriteButton({ recipe, favorite, onToggleFavorite, className = '' }: CardProps & { className?: string }) {
  if (!onToggleFavorite) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggleFavorite(recipe.id)
      }}
      aria-pressed={favorite}
      aria-label={favorite ? `${recipe.title} aus Favoriten entfernen` : `${recipe.title} als Favorit merken`}
      className={`flex size-10 items-center justify-center rounded-full bg-surface/85 shadow-sm backdrop-blur transition active:scale-90 ${className}`}
    >
      <Heart className={`size-5 transition ${favorite ? 'fill-fat text-fat animate-pop' : 'text-muted'}`} aria-hidden />
    </button>
  )
}

export function AirfryerBadge({ recipe, compact }: { recipe: Recipe; compact?: boolean }) {
  if (!recipe.airfryer) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
      <AirfryerIcon className="size-3.5" />
      {compact ? <span className="sr-only">Heißluftfritteuse</span> : `${recipe.airfryer.temp_c} °C`}
    </span>
  )
}

/** Galerie-Kachel (2 Spalten) */
export function RecipeGalleryTile({ recipe, favorite, onToggleFavorite }: CardProps) {
  return (
    <li className="relative">
      <Link
        to={`/rezepte/${recipe.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-line/60 transition active:scale-[0.98] hover:ring-brand/40"
      >
        <span className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${recipeGradient(recipe)}`}>
          <span aria-hidden className="text-5xl drop-shadow-sm transition group-hover:scale-110">
            {recipeEmoji(recipe)}
          </span>
          <span className="absolute bottom-2 left-2 flex gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold shadow-sm backdrop-blur tabular">
              <Clock className="size-3" aria-hidden />
              {recipe.time_min} Min.
            </span>
            <AirfryerBadge recipe={recipe} compact />
          </span>
        </span>
        <span className="flex flex-1 flex-col p-3">
          <span className="line-clamp-2 text-sm font-semibold leading-snug">{recipe.title}</span>
          <span className="mt-auto pt-1.5 text-xs text-muted tabular">
            {fmtInt(recipe.nutrition.kcal)} kcal · {fmtInt(recipe.nutrition.protein)} g Eiweiß
          </span>
        </span>
      </Link>
      <FavoriteButton recipe={recipe} favorite={favorite} onToggleFavorite={onToggleFavorite} className="absolute right-2 top-2" />
    </li>
  )
}

/** Listen-Zeile */
export function RecipeCard({ recipe, favorite, onToggleFavorite }: CardProps) {
  return (
    <li className="relative">
      <Link
        to={`/rezepte/${recipe.id}`}
        className="flex items-center gap-3 rounded-3xl bg-surface p-3 pr-14 ring-1 ring-line/60 transition active:scale-[0.99] hover:ring-brand/40"
      >
        <span aria-hidden className={`flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${recipeGradient(recipe)}`}>
          {recipeEmoji(recipe)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold leading-snug">{recipe.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1 tabular">
              <Flame className="size-3.5" aria-hidden />
              {fmtInt(recipe.nutrition.kcal)} kcal
            </span>
            <span className="inline-flex items-center gap-1 tabular">
              <Clock className="size-3.5" aria-hidden />
              {recipe.time_min} Min.
            </span>
            {recipe.airfryer && (
              <span className="inline-flex items-center gap-1">
                <AirfryerIcon className="size-3.5" /> Heißluftfritteuse
              </span>
            )}
          </p>
          {recipe.tags.length > 0 && (
            <p className="mt-1 truncate text-xs text-brand">
              {recipe.tags
                .filter((t) => t !== 'heissluftfritteuse')
                .slice(0, 3)
                .map((t) => TAG_LABELS[t] ?? t)
                .join(' · ')}
            </p>
          )}
        </div>
      </Link>
      <FavoriteButton recipe={recipe} favorite={favorite} onToggleFavorite={onToggleFavorite} className="absolute right-3 top-1/2 -translate-y-1/2" />
    </li>
  )
}

/** Kachel für horizontale Karussells */
export function RecipeTile({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/rezepte/${recipe.id}`}
      className="flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-line/60 transition active:scale-[0.98]"
    >
      <span className={`relative flex h-24 items-center justify-center bg-gradient-to-br text-4xl ${recipeGradient(recipe)}`}>
        <span aria-hidden>{recipeEmoji(recipe)}</span>
        {recipe.airfryer && (
          <span className="absolute left-2 top-2">
            <AirfryerBadge recipe={recipe} compact />
          </span>
        )}
      </span>
      <span className="line-clamp-2 px-3 pt-2 text-sm font-semibold leading-snug">{recipe.title}</span>
      <span className="mt-auto px-3 pb-3 pt-1 text-xs text-muted tabular">
        {fmtInt(recipe.nutrition.kcal)} kcal · {recipe.time_min} Min.
      </span>
    </Link>
  )
}
