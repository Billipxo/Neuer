import type { ActivityLevel, Sex } from '../../types'
import { ACTIVITY_LABELS } from '../../lib/nutrition'
import { NumberInput } from '../ui/NumberInput'
import { Segmented } from '../ui/Segmented'
import { Select } from '../ui/Field'
import type { ProfileDraft } from './types'

/** Körperdaten; das optionale Zielgewicht wird im Onboarding ausgeblendet, damit der Einstieg kurz bleibt */
export function BodyForm({ draft, onChange, showTarget = true }: { draft: ProfileDraft; onChange: (patch: Partial<ProfileDraft>) => void; showTarget?: boolean }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium" id="sex-label">
          Geschlecht (für die Formel)
        </p>
        <Segmented<Sex | 'none'>
          label="Geschlecht für die Formel"
          value={draft.sex ?? 'none'}
          onChange={(v) => onChange({ sex: v === 'none' ? null : v })}
          options={[
            { value: 'female', label: 'Weiblich' },
            { value: 'male', label: 'Männlich' },
            { value: 'none', label: 'Keine Angabe' },
          ]}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumberInput label="Alter" suffix="J." value={draft.age} min={0} max={130} onChange={(v) => onChange({ age: v === null ? null : Math.round(v) })} />
        <NumberInput label="Größe" suffix="cm" value={draft.height_cm} min={0} max={260} onChange={(v) => onChange({ height_cm: v })} />
        <NumberInput label="Gewicht" suffix="kg" value={draft.weight_kg} min={0} max={500} onChange={(v) => onChange({ weight_kg: v })} />
      </div>
      {showTarget && (
        <NumberInput
          label="Zielgewicht (optional)"
          suffix="kg"
          value={draft.target_weight_kg}
          min={0}
          max={500}
          onChange={(v) => onChange({ target_weight_kg: v })}
          hint="Zeigt im Verlauf den Weg dorthin – als Orientierung, ohne Druck."
        />
      )}
      <Select
        label="Aktivität im Alltag"
        value={draft.activity_level ?? 'light'}
        onChange={(e) => onChange({ activity_level: e.target.value as ActivityLevel })}
        options={Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({ value, label }))}
      />
    </div>
  )
}
