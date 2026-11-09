import type { Nutrients } from '../../types'
import { fmt1, fmtInt } from '../../lib/format'

export function NutrientGrid({ n }: { n: Nutrients }) {
  const items = [
    { label: 'kcal', value: fmtInt(n.kcal) },
    { label: 'Eiweiß', value: `${fmt1(n.protein)} g` },
    { label: 'Kohlenh.', value: `${fmt1(n.carbs)} g` },
    { label: 'Fett', value: `${fmt1(n.fat)} g` },
  ]
  return (
    <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-2 p-3 text-center text-sm">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs text-muted">{i.label}</dt>
          <dd className="font-semibold tabular">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
