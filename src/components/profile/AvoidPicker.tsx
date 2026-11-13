import type { Allergen } from '../../types'
import { ALLERGEN_LABELS, ALLERGENS } from '../../lib/recipeNutrition'
import { Chip } from '../ui/Segmented'

/** Unverträglichkeiten und Allergien – Rezepte mit diesen Zutaten werden bei Vorschlägen weggelassen */
export function AvoidPicker({ value, onChange }: { value: Allergen[]; onChange: (v: Allergen[]) => void }) {
  const toggle = (a: Allergen) => onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a])
  return (
    <div>
      <p className="mb-1.5 font-medium">Unverträglichkeiten & Allergien</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Unverträglichkeiten">
        {ALLERGENS.map((a) => (
          <Chip key={a} active={value.includes(a)} onClick={() => toggle(a)}>
            {ALLERGEN_LABELS[a]}
          </Chip>
        ))}
      </div>
      <p className="mt-1.5 text-sm text-muted">
        Rezepte mit diesen Zutaten werden bei Vorschlägen, im Planer und in der Zutaten-Suche weggelassen; im Kochbuch zeigt „Für mich
        passend“ nur Passendes. Jede Rezeptseite nennt alle enthaltenen Allergene – bei Zöliakie oder starken Allergien trotzdem die
        Packungsangaben prüfen.
      </p>
    </div>
  )
}
