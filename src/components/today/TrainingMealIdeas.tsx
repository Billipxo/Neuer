import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { MealType, Profile } from '../../types'
import { RECIPES, matchesDiet, recipeEmoji } from '../../lib/recipes'
import { totalMinutes, trainingMealIdeas } from '../../lib/trainingMeals'
import { useVariantRecipes } from '../../hooks/variants'
import { fmtInt } from '../../lib/format'
import { Card } from '../ui/Card'

const FOR_MEAL: Record<MealType, string> = {
  breakfast: 'fürs Frühstück',
  lunch: 'fürs Mittagessen',
  dinner: 'fürs Abendessen',
  snack: 'als Snack',
}

/**
 * An Krafttagen: proteinreiche Rezepte für die nächste offene Mahlzeit, passend zu den noch offenen kcal – je später es
 * ist, desto schneller fertig. Wird erst geladen, wenn sie gebraucht werden: Das Kochbuch gehört nicht ins Start-Paket
 * der Tagesseite.
 */
export default function TrainingMealIdeas({
  profile,
  meal,
  remainingKcal,
  openMeals,
  maxMinutes,
}: {
  profile: Pick<Profile, 'diet' | 'avoid'>
  meal: MealType
  remainingKcal: number
  openMeals: number
  /** Zeitbudget: so lange darf ein Rezept höchstens dauern */
  maxMinutes: number
}) {
  const { recipes: own } = useVariantRecipes()
  const pool = [...own, ...RECIPES].filter((r) => matchesDiet(r, profile.diet, profile.avoid))
  const ideas = trainingMealIdeas(pool, { meal, remainingKcal, openMeals, maxMinutes })
  if (!ideas.length) return null
  const allQuick = ideas.every((r) => totalMinutes(r) <= maxMinutes)
  return (
    <Card className="p-0">
      <div className="px-4 pb-1 pt-3">
        <h3 className="font-semibold">Passend zum Training</h3>
        <p className="text-xs text-muted">
          Proteinreiche Ideen {FOR_MEAL[meal]}
          {allQuick ? `, in höchstens ${maxMinutes} Min. fertig` : ''} – passend zu den noch offenen kcal
        </p>
      </div>
      <ul aria-label="Rezeptideen passend zum Training">
        {ideas.map((r) => (
          <li key={r.id}>
            <Link to={`/rezepte/${r.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 transition hover:bg-surface-2/60">
              <span aria-hidden className="text-2xl">
                {recipeEmoji(r)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{r.title}</span>
                <span className="block text-xs text-muted tabular">
                  {fmtInt(r.nutrition.kcal)} kcal · {fmtInt(r.nutrition.protein)} g Eiweiß · {totalMinutes(r)} Min.
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
