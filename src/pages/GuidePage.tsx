import { Link, Navigate, useParams } from 'react-router-dom'
import { GUIDES } from '../data/guides'
import { getGuide } from '../lib/guides'
import { getRecipe } from '../lib/recipes'
import type { Recipe } from '../types'
import { PageHeader } from '../components/layout/PageHeader'
import { RecipeTile } from '../components/recipes/RecipeCard'
import { GuideBlocks } from '../components/guides/GuideBlocks'

export function GuidePage() {
  const { id } = useParams()
  const guide = getGuide(id)
  if (!guide) return <Navigate to="/rezepte/wissen" replace />
  const recipes = (guide.recipeIds ?? []).map((r) => getRecipe(r)).filter((r): r is Recipe => Boolean(r))
  const others = GUIDES.filter((g) => g.id !== guide.id && g.category === guide.category).slice(0, 3)

  return (
    <>
      <PageHeader title="" back="/rezepte/wissen" />
      <article>
        <header className="mb-6 text-center">
          <span aria-hidden className="mx-auto flex size-20 items-center justify-center rounded-[1.75rem] bg-brand-soft text-5xl animate-pop">
            {guide.emoji}
          </span>
          <h1 className="mt-4 text-2xl font-bold leading-tight">{guide.title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-muted">{guide.summary}</p>
        </header>
        <GuideBlocks blocks={guide.blocks} />
      </article>

      {recipes.length > 0 && (
        <section className="mt-8" aria-labelledby="guide-recipes">
          <h2 id="guide-recipes" className="px-1 font-semibold">
            Gleich ausprobieren
          </h2>
          <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {recipes.map((r) => (
              <RecipeTile key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-6" aria-labelledby="guide-more">
          <h2 id="guide-more" className="px-1 font-semibold">
            Mehr Kochwissen
          </h2>
          <ul className="mt-2 space-y-1">
            {others.map((g) => (
              <li key={g.id}>
                <Link to={`/rezepte/wissen/${g.id}`} className="flex min-h-12 items-center gap-3 rounded-2xl px-2 hover:bg-surface-2">
                  <span aria-hidden className="text-2xl">
                    {g.emoji}
                  </span>
                  <span className="font-medium">{g.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
