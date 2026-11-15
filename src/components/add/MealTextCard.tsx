import { ArrowLeftRight, Check, Sparkles, X } from 'lucide-react'
import type { AmountUnit, MealType } from '../../types'
import { MEAL_TYPES } from '../../types'
import { MEAL_LABELS } from '../../lib/meals'
import { withAmount, type MealParse, type MealPart } from '../../lib/mealText'
import { fmtInt } from '../../lib/format'
import { Button } from '../ui/Button'

export interface MealTextEdits {
  /** Eingabe, zu der die Änderungen gehören – ändert sich der Text, gelten sie nicht mehr */
  text: string
  removed: number[]
  amounts: Record<number, { amount: number; unit: AmountUnit }>
  /** Anderer Treffer: Index in `alternatives` des ursprünglichen Eintrags */
  swaps: Record<number, number>
}

export const NO_EDITS = (text: string): MealTextEdits => ({ text, removed: [], amounts: {}, swaps: {} })

/** Erkannte Einträge mit den Änderungen der Nutzerin bzw. des Nutzers (getauscht, Menge geändert, entfernt) */
export function effectiveParts(parse: MealParse, edits: MealTextEdits): { index: number; original: MealPart; part: MealPart }[] {
  return parse.parts
    .map((original, index) => {
      const swap = edits.swaps[index]
      const base = swap !== undefined ? (original.alternatives[swap] ?? original) : original
      const changed = edits.amounts[index]
      return { index, original, part: changed ? (withAmount(base, changed.amount, changed.unit) ?? base) : base }
    })
    .filter((r) => !edits.removed.includes(r.index))
}

/** „Frühstück“, „Frühstück und Mittagessen“, „Frühstück, Mittagessen und Abendessen“ */
export function mealList(meals: MealType[]): string {
  const labels = meals.map((m) => MEAL_LABELS[m])
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} und ${labels[labels.length - 1]}` : (labels[0] ?? '')
}

interface Props {
  parse: MealParse
  edits: MealTextEdits
  /** Gewählte Mahlzeit – gilt für alles ohne eigene Mahlzeit im Text */
  meal: MealType
  busy?: boolean
  onRemove: (index: number) => void
  onEdit: (index: number) => void
  onSwap: (index: number) => void
  onAddAll: (parts: MealPart[]) => void
}

/** „2 Brötchen, 1 Cappuccino und eine Banane“: was die App erkannt hat – zum Prüfen und Eintragen mit einem Tipp */
export function MealTextCard({ parse, edits, meal, busy, onRemove, onEdit, onSwap, onAddAll }: Props) {
  const rows = effectiveParts(parse, edits)
  // Nach Mahlzeit gruppiert, in der Reihenfolge des Tages
  const meals = MEAL_TYPES.filter((m) => rows.some((r) => (r.part.meal ?? meal) === m))
  const groups = meals.map((m) => ({ meal: m, rows: rows.filter((r) => (r.part.meal ?? meal) === m) }))
  const total = rows.reduce((s, r) => s + r.part.kcal, 0)
  const sum = (key: 'protein' | 'carbs' | 'fat') => rows.reduce((s, r) => s + r.part.nutrients[key], 0)
  return (
    <section aria-labelledby="meal-text-title" className="mt-3 rounded-3xl bg-surface p-3 shadow-sm ring-1 ring-line animate-fade-up">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="size-4 text-brand" aria-hidden />
        <h2 id="meal-text-title" className="text-sm font-semibold">
          Erkannt für {mealList(meals.length ? meals : [meal])}
        </h2>
      </div>
      {groups.map((g) => (
        <div key={g.meal}>
          {groups.length > 1 && (
            <h3 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{MEAL_LABELS[g.meal]}</h3>
          )}
          <ul
            className="mt-1 divide-y divide-line"
            aria-label={groups.length > 1 ? `Erkannte Einträge: ${MEAL_LABELS[g.meal]}` : 'Erkannte Einträge'}
          >
            {g.rows.map(({ index, original, part }) => (
              <li key={index} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(index)}
                  aria-label={`${part.name}, ${part.amountLabel}, ${fmtInt(part.kcal)} kcal – Menge ändern`}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-2 text-left transition hover:bg-surface-2 active:bg-line/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{part.name}</span>
                    <span className="block truncate text-xs text-muted">{part.amountLabel}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtInt(part.kcal)} kcal</span>
                </button>
                {original.alternatives.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSwap(index)}
                    aria-label={`Andere Treffer für „${original.query}“`}
                    title="Andere Treffer"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    <ArrowLeftRight className="size-4" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`„${part.name}“ entfernen`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {parse.unknown.length > 0 && (
        <p className="px-1 pt-2 text-xs text-muted">
          Nicht erkannt: {parse.unknown.map((u) => `„${u}“`).join(', ')} – einzeln suchen oder selbst anlegen.
        </p>
      )}
      {rows.length > 0 && (
        <p className="px-1 pt-2 text-xs text-muted">
          Zusammen {fmtInt(sum('protein'))} g Eiweiß · {fmtInt(sum('carbs'))} g KH · {fmtInt(sum('fat'))} g Fett
        </p>
      )}
      {rows.length > 0 ? (
        <Button block className="mt-2" disabled={busy} icon={<Check className="size-4" aria-hidden />} onClick={() => onAddAll(rows.map((r) => r.part))}>
          {rows.length === 1 ? '1 Eintrag hinzufügen' : `Alle ${rows.length} hinzufügen`} · {fmtInt(total)} kcal
        </Button>
      ) : (
        <p className="px-1 pt-2 text-sm text-muted">Alles entfernt – tippe etwas Neues ein.</p>
      )}
    </section>
  )
}
