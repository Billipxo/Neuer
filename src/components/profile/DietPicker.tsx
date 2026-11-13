import type { DietPreference } from '../../types'
import { Segmented } from '../ui/Segmented'

const OPTIONS: { value: DietPreference; label: string }[] = [
  { value: 'all', label: 'Alles' },
  { value: 'vegetarian', label: 'Vegetarisch' },
  { value: 'vegan', label: 'Vegan' },
]

/** Ernährungsweise für Rezeptvorschläge */
export function DietPicker({ value, onChange }: { value: DietPreference; onChange: (d: DietPreference) => void }) {
  return (
    <div>
      <p className="mb-1.5 font-medium">Ernährungsweise</p>
      <Segmented<DietPreference> label="Ernährungsweise" value={value} onChange={onChange} options={OPTIONS} />
      <p className="mt-1.5 text-sm text-muted">Wochenvorschläge und Empfehlungen zeigen dann nur passende Rezepte. In der Galerie lässt sich das jederzeit ausschalten.</p>
    </div>
  )
}
