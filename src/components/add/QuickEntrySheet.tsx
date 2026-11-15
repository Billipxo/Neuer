import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { QuickEntryInput } from '../../lib/log'
import { suggestFoods } from '../../lib/basicFoods'
import { fmtInt } from '../../lib/format'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { NumberInput } from '../ui/NumberInput'

/** Schnell-Eintrag: nur Kalorien (und optional Makros) – z. B. für Essen im Restaurant */
export function QuickEntrySheet({
  open,
  onClose,
  onAdd,
  initialName = '',
  busy,
  confirmLabel = 'Hinzufügen',
}: {
  open: boolean
  onClose: () => void
  onAdd: (input: QuickEntryInput) => void
  initialName?: string
  busy?: boolean
  confirmLabel?: string
}) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState<number | null>(null)
  const [protein, setProtein] = useState<number | null>(null)
  const [carbs, setCarbs] = useState<number | null>(null)
  const [fat, setFat] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setKcal(null)
    setProtein(null)
    setCarbs(null)
    setFat(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Passende typische Mengen zum Namen, z. B. „Döner Kebab · 1 Döner ≈ 753 kcal“
  const suggestions = useMemo(() => suggestFoods(name, 6).filter((h) => h.typicalGrams).slice(0, 3), [name])
  const round1 = (n: number) => Math.round(n * 10) / 10

  const valid = kcal !== null && kcal > 0
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Schnell-Eintrag"
      footer={
        <Button block size="lg" disabled={!valid || busy} onClick={() => valid && onAdd({ name, kcal, protein, carbs, fat })}>
          {busy ? 'Speichern …' : confirmLabel}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">Für alles, was du nicht nachschlagen möchtest – ein Schätzwert genügt.</p>
        <NumberInput label="Kalorien" suffix="kcal" value={kcal} min={0} max={10000} onChange={setKcal} />
        <Field label="Was war es? (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Döner beim Imbiss" />
        {suggestions.length > 0 && (
          <div role="group" aria-label="Vorschläge für die Kalorien" className="-mt-1 space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Sparkles className="size-3.5 text-brand" aria-hidden /> Vorschlag übernehmen (Richtwert, anpassbar):
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => {
                    const g = h.typicalGrams!
                    setKcal(Math.round((h.food.kcal_100 * g) / 100))
                    setProtein(round1((h.food.protein_100 * g) / 100))
                    setCarbs(round1((h.food.carbs_100 * g) / 100))
                    setFat(round1((h.food.fat_100 * g) / 100))
                  }}
                  className="min-h-9 rounded-full bg-brand-soft px-3 text-left text-sm font-medium text-brand transition hover:bg-brand-soft/70"
                >
                  {h.name} · {h.typicalLabel} ≈ {fmtInt(h.kcal)} kcal
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-sm font-medium">Makros (optional)</p>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput label="Eiweiß" suffix="g" value={protein} min={0} onChange={setProtein} />
            <NumberInput label="Kohlenh." suffix="g" value={carbs} min={0} onChange={setCarbs} />
            <NumberInput label="Fett" suffix="g" value={fat} min={0} onChange={setFat} />
          </div>
        </div>
      </div>
    </Sheet>
  )
}
