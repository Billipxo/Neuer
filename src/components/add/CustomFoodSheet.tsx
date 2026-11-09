import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Food, Nutrients } from '../../types'
import { toPer100, type NutrientBasis } from '../../lib/customFood'
import { useDeleteFood, useSaveFood } from '../../hooks/data'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { NumberInput } from '../ui/NumberInput'
import { Segmented } from '../ui/Segmented'
import { useToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
  onSaved?: (f: Food) => void
  /** Zum Bearbeiten */
  food?: Food | null
  /** Vorbelegung, z. B. Barcode aus einem Scan ohne Treffer */
  initialBarcode?: string | null
  initialName?: string
}

export function CustomFoodSheet({ open, onClose, onSaved, food, initialBarcode, initialName }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [basis, setBasis] = useState<NutrientBasis>('100g')
  const [values, setValues] = useState<Record<keyof Nutrients, number | null>>({ kcal: null, protein: null, carbs: null, fat: null })
  const [servingG, setServingG] = useState<number | null>(null)
  const [pieceG, setPieceG] = useState<number | null>(null)
  const save = useSaveFood()
  const del = useDeleteFood()
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setName(food?.name ?? initialName ?? '')
    setBrand(food?.brand ?? '')
    setBasis('100g')
    setValues(
      food
        ? { kcal: food.kcal_100, protein: food.protein_100, carbs: food.carbs_100, fat: food.fat_100 }
        : { kcal: null, protein: null, carbs: null, fat: null },
    )
    setServingG(food?.serving_g ?? null)
    setPieceG(food?.piece_g ?? null)
  }, [open, food, initialName])

  const n: Nutrients = {
    kcal: values.kcal ?? 0,
    protein: values.protein ?? 0,
    carbs: values.carbs ?? 0,
    fat: values.fat ?? 0,
  }
  const per100 = toPer100(n, basis, servingG)
  const valid = name.trim() && values.kcal !== null && per100

  async function submit() {
    if (!valid || !per100) return
    const saved = await save.mutateAsync({
      id: food?.id,
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: food?.barcode ?? initialBarcode ?? null,
      source: food?.source ?? 'custom',
      kcal_100: per100.kcal,
      protein_100: per100.protein,
      carbs_100: per100.carbs,
      fat_100: per100.fat,
      serving_g: servingG,
      piece_g: pieceG,
      image_url: food?.image_url ?? null,
      is_favorite: food?.is_favorite ?? false,
      last_used_at: food?.last_used_at ?? null,
      use_count: food?.use_count ?? 0,
    })
    toast(food ? 'Lebensmittel aktualisiert' : 'Lebensmittel angelegt')
    onSaved?.(saved)
    onClose()
  }

  const unitLabel = basis === '100g' ? 'pro 100 g' : 'pro Portion'
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={food ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel'}
      tall
      footer={
        <div className="flex gap-3">
          {food && (
            <Button
              variant="secondary"
              icon={<Trash2 className="size-4" aria-hidden />}
              onClick={async () => {
                if (!confirm(`„${food.name}“ wirklich löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.`)) return
                await del.mutateAsync(food.id)
                toast('Lebensmittel gelöscht')
                onClose()
              }}
            >
              Löschen
            </Button>
          )}
          <Button className="flex-1" size="lg" disabled={!valid || save.isPending} onClick={submit}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!food && initialBarcode && (
          <p className="rounded-2xl bg-surface-2 p-3 text-sm" role="status">
            Der Barcode <span className="font-mono">{initialBarcode}</span> ist bei Open Food Facts nicht bekannt. Lege das
            Produkt hier an – beim nächsten Scan wird es direkt erkannt.
          </p>
        )}
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Omas Apfelkuchen" />
        <Field label="Marke (optional)" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <div>
          <p className="mb-1.5 text-sm font-medium">Nährwerte angeben</p>
          <Segmented<NutrientBasis>
            label="Nährwerte angeben"
            value={basis}
            onChange={setBasis}
            options={[
              { value: '100g', label: 'pro 100 g' },
              { value: 'serving', label: 'pro Portion' },
            ]}
          />
        </div>
        <NumberInput
          label="Portionsgröße"
          suffix="g"
          value={servingG}
          min={0}
          onChange={setServingG}
          hint={basis === 'serving' ? 'Nötig zur Umrechnung – Schätzen ist okay.' : 'Optional – ermöglicht die Eingabe in Portionen.'}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={`Kalorien ${unitLabel}`} suffix="kcal" value={values.kcal} min={0} onChange={(v) => setValues((s) => ({ ...s, kcal: v }))} />
          <NumberInput label={`Eiweiß ${unitLabel}`} suffix="g" value={values.protein} min={0} onChange={(v) => setValues((s) => ({ ...s, protein: v }))} />
          <NumberInput label={`Kohlenhydrate ${unitLabel}`} suffix="g" value={values.carbs} min={0} onChange={(v) => setValues((s) => ({ ...s, carbs: v }))} />
          <NumberInput label={`Fett ${unitLabel}`} suffix="g" value={values.fat} min={0} onChange={(v) => setValues((s) => ({ ...s, fat: v }))} />
        </div>
        <NumberInput label="Gewicht pro Stück (optional)" suffix="g" value={pieceG} min={0} onChange={setPieceG} hint="Z. B. 60 g für ein Ei – dann kannst du in Stück eintragen." />
        {save.error && (
          <p role="alert" className="text-sm text-danger">
            {(save.error as Error).message}
          </p>
        )}
      </div>
    </Sheet>
  )
}
