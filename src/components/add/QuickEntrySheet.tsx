import { useEffect, useState } from 'react'
import type { QuickEntryInput } from '../../lib/log'
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
