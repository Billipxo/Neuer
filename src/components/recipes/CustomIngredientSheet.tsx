import { useEffect, useState } from 'react'
import { ScanBarcode } from 'lucide-react'
import type { RecipeIngredient } from '../../types'
import { CUSTOM_KIND_LABELS, EXTRA_ALLERGEN_LABELS, customIngredient, type CustomIngredientInput, type CustomKind, type ExtraAllergen } from '../../lib/variants'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { NumberInput } from '../ui/NumberInput'
import { Chip, Segmented } from '../ui/Segmented'
import { Switch } from '../ui/Switch'

const KINDS = Object.keys(CUSTOM_KIND_LABELS) as CustomKind[]
const EXTRAS = Object.keys(EXTRA_ALLERGEN_LABELS) as ExtraAllergen[]

/** Eigene Zutat mit Nährwerten pro 100 g anlegen oder bearbeiten */
export function CustomIngredientSheet({
  open,
  onClose,
  onSave,
  initial,
  onScan,
  title,
}: {
  open: boolean
  onClose: () => void
  onSave: (ing: RecipeIngredient) => void
  initial?: Partial<CustomIngredientInput>
  /** Werte per Barcode-Scan füllen */
  onScan?: () => void
  title?: string
}) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState<number | null>(null)
  const [protein, setProtein] = useState<number | null>(null)
  const [carbs, setCarbs] = useState<number | null>(null)
  const [fat, setFat] = useState<number | null>(null)
  const [fiber, setFiber] = useState<number | null>(null)
  const [unitG, setUnitG] = useState<number | null>(null)
  const [kind, setKind] = useState<CustomKind>('plant')
  const [glutenFree, setGlutenFree] = useState(false)
  const [extra, setExtra] = useState<ExtraAllergen[]>([])

  // Beim Öffnen mit den übergebenen Werten starten (z. B. aus Open Food Facts oder einer bestehenden Zutat)
  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setKcal(initial?.kcal ?? null)
    setProtein(initial?.protein ?? null)
    setCarbs(initial?.carbs ?? null)
    setFat(initial?.fat ?? null)
    setFiber(initial?.fiber ?? null)
    setUnitG(initial?.unit_g ?? null)
    setKind(initial?.kind ?? 'plant')
    setGlutenFree(initial?.glutenFree ?? false)
    setExtra(initial?.extra ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const valid = name.trim().length > 0 && kcal !== null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title ?? 'Eigene Zutat'}
      tall
      footer={
        <Button
          block
          size="lg"
          disabled={!valid}
          onClick={() => {
            onSave(
              customIngredient({
                name,
                kcal: kcal ?? 0,
                protein: protein ?? 0,
                carbs: carbs ?? 0,
                fat: fat ?? 0,
                fiber,
                kind,
                glutenFree,
                extra,
                unit_g: unitG,
              }),
            )
            onClose()
          }}
        >
          Zutat übernehmen
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name" data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Schmand 24 %" />
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Nährwerte pro 100 g (von der Packung)</p>
            {onScan && (
              <Button variant="secondary" size="sm" icon={<ScanBarcode className="size-4" aria-hidden />} onClick={onScan}>
                Scannen
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Kalorien" suffix="kcal" value={kcal} min={0} onChange={setKcal} />
            <NumberInput label="Eiweiß" suffix="g" value={protein} min={0} onChange={setProtein} />
            <NumberInput label="Kohlenhydrate" suffix="g" value={carbs} min={0} onChange={setCarbs} />
            <NumberInput label="Fett" suffix="g" value={fat} min={0} onChange={setFat} />
            <NumberInput label="Ballaststoffe (optional)" suffix="g" value={fiber} min={0} onChange={setFiber} />
            <NumberInput label="Gramm pro Stück (optional)" suffix="g" value={unitG} min={0} onChange={setUnitG} hint="Dann lässt sich die Zutat in Stück angeben" />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Art der Zutat</p>
          <Segmented<CustomKind> label="Art der Zutat" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: CUSTOM_KIND_LABELS[k] }))} />
          <p className="mt-1 text-xs text-muted">Damit wird das Rezept als vegetarisch oder vegan gekennzeichnet – oder eben nicht.</p>
        </div>
        <Switch label="Glutenfrei" description="Ohne Angabe gilt die Zutat vorsichtshalber als glutenhaltig." checked={glutenFree} onChange={setGlutenFree} />
        <div>
          <p className="mb-1.5 text-sm font-medium">Enthält außerdem</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Weitere Allergene">
            {EXTRAS.map((e) => (
              <Chip key={e} active={extra.includes(e)} onClick={() => setExtra((l) => (l.includes(e) ? l.filter((x) => x !== e) : [...l, e]))}>
                {EXTRA_ALLERGEN_LABELS[e]}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
