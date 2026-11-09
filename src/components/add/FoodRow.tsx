import { ChevronRight, Star } from 'lucide-react'
import { fmtInt } from '../../lib/format'

export function FoodRow({
  title,
  subtitle,
  kcal,
  kcalLabel = 'kcal/100 g',
  favorite,
  image,
  onClick,
}: {
  title: string
  subtitle?: string | null
  kcal: number
  kcalLabel?: string
  favorite?: boolean
  image?: string | null
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-2 active:bg-line/60"
      >
        {image ? (
          <img src={image} alt="" loading="lazy" className="size-11 shrink-0 rounded-xl bg-surface-2 object-cover" />
        ) : (
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg">
            {title.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[15px] font-medium">
            <span className="truncate">{title}</span>
            {favorite && <Star className="size-3.5 shrink-0 fill-carbs text-carbs" aria-label="Favorit" />}
          </p>
          <p className="truncate text-xs text-muted">
            {subtitle ? `${subtitle} · ` : ''}
            <span className="tabular">
              {fmtInt(kcal)} {kcalLabel}
            </span>
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  )
}
