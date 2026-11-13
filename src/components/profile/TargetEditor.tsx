import { Calculator, RotateCcw } from 'lucide-react'
import type { GoalType } from '../../types'
import {
  DEFAULT_MACRO_PERCENTS,
  GOAL_DEFAULT_ADJUSTMENT,
  isCompleteBody,
  macroGrams,
  suggestKcalTarget,
  sumPercents,
  totalEnergyExpenditure,
} from '../../lib/nutrition'
import { fmtInt } from '../../lib/format'
import { NumberInput } from '../ui/NumberInput'
import { Segmented } from '../ui/Segmented'
import { Button } from '../ui/Button'
import type { ProfileDraft } from './types'

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: 'Abnehmen',
  maintain: 'Halten',
  gain: 'Zunehmen',
  custom: 'Eigene Zahl',
}

export function GoalPicker({ draft, onChange }: { draft: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void }) {
  return (
    <Segmented<GoalType>
      label="Ziel"
      value={draft.goal}
      onChange={(goal) => onChange({ goal, kcal_adjustment: GOAL_DEFAULT_ADJUSTMENT[goal] })}
      options={(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
    />
  )
}

export function KcalTargetEditor({ draft, onChange }: { draft: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void }) {
  const body = { sex: draft.sex ?? undefined, age: draft.age ?? undefined, height_cm: draft.height_cm ?? undefined, weight_kg: draft.weight_kg ?? undefined }
  const canSuggest = isCompleteBody(body) && draft.goal !== 'custom'
  const activity = draft.activity_level ?? 'light'
  const tdee = canSuggest ? totalEnergyExpenditure(body, activity) : 0
  const suggestion = canSuggest ? suggestKcalTarget(body, activity, draft.kcal_adjustment) : null

  return (
    <div className="space-y-4">
      {canSuggest && suggestion !== null && (
        <div className="rounded-2xl bg-brand-soft/60 p-4">
          <div className="flex items-start gap-3">
            <Calculator className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">Vorschlag: {fmtInt(suggestion)} kcal</p>
              <p className="text-muted">
                Geschätzter Bedarf {fmtInt(tdee)} kcal (Mifflin-St Jeor × Aktivität)
                {draft.kcal_adjustment !== 0 &&
                  ` ${draft.kcal_adjustment > 0 ? '+' : '−'} ${fmtInt(Math.abs(draft.kcal_adjustment))} kcal`}
                . Nur ein Richtwert – du entscheidest.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <NumberInput
              className="flex-1"
              label="Zu- oder Abschlag"
              suffix="kcal"
              value={draft.kcal_adjustment}
              min={-2000}
              max={2000}
              onChange={(v) => onChange({ kcal_adjustment: Math.round(v ?? 0) })}
              hint="Negativ = weniger, positiv = mehr"
            />
            <Button className="mb-5" onClick={() => onChange({ kcal_target: suggestion })}>
              Übernehmen
            </Button>
          </div>
        </div>
      )}
      <NumberInput
        label="Dein Tagesziel"
        suffix="kcal"
        value={draft.kcal_target}
        min={0}
        max={10000}
        onChange={(v) => onChange({ kcal_target: Math.round(v ?? 0) })}
        hint={
          canSuggest
            ? 'Frei änderbar – der Vorschlag oben ist optional.'
            : 'Trag deine Wunschzahl ein. Mit Körperdaten kann die App einen Vorschlag machen.'
        }
      />
    </div>
  )
}

export function MacroEditor({ draft, onChange }: { draft: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void }) {
  const pct = { protein: draft.protein_pct, carbs: draft.carbs_pct, fat: draft.fat_pct }
  const total = sumPercents(pct)
  const grams = macroGrams(draft.kcal_target, pct)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <NumberInput label="Eiweiß" suffix="%" value={draft.protein_pct} min={0} max={100} onChange={(v) => onChange({ protein_pct: Math.round(v ?? 0) })} hint={`≈ ${fmtInt(grams.protein)} g`} />
        <NumberInput label="Kohlenh." suffix="%" value={draft.carbs_pct} min={0} max={100} onChange={(v) => onChange({ carbs_pct: Math.round(v ?? 0) })} hint={`≈ ${fmtInt(grams.carbs)} g`} />
        <NumberInput label="Fett" suffix="%" value={draft.fat_pct} min={0} max={100} onChange={(v) => onChange({ fat_pct: Math.round(v ?? 0) })} hint={`≈ ${fmtInt(grams.fat)} g`} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className={total === 100 ? 'text-muted' : 'font-medium text-over'} aria-live="polite">
          Summe: {total} %{total !== 100 && ' – bitte auf 100 % bringen'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="size-4" aria-hidden />}
          onClick={() =>
            onChange({
              protein_pct: DEFAULT_MACRO_PERCENTS.protein,
              carbs_pct: DEFAULT_MACRO_PERCENTS.carbs,
              fat_pct: DEFAULT_MACRO_PERCENTS.fat,
            })
          }
        >
          25 / 45 / 30
        </Button>
      </div>
    </div>
  )
}

export function WaterTargetEditor({ draft, onChange }: { draft: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void }) {
  return (
    <NumberInput
      label="Wasserziel pro Tag"
      suffix="ml"
      value={draft.water_target_ml}
      min={0}
      max={10000}
      onChange={(v) => onChange({ water_target_ml: Math.round(v ?? 0) })}
    />
  )
}
