import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Star, Trash2, X } from 'lucide-react'
import type { DishIngredient } from '../types'
import { useDeleteDish, useDishes, useSaveDish } from '../hooks/data'
import { dishPerServing, dishTotals, nutrientsForGrams } from '../lib/nutrition'
import { fmtInt } from '../lib/format'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { NumberInput } from '../components/ui/NumberInput'
import { useToast } from '../components/ui/Toast'
import { NutrientGrid } from '../components/add/NutrientGrid'
import { IngredientPickerSheet } from '../components/add/IngredientPickerSheet'

export function DishEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: dishes = [], isLoading } = useDishes()
  const existing = id ? dishes.find((d) => d.id === id) : undefined
  const save = useSaveDish()
  const del = useDeleteDish()

  const [name, setName] = useState('')
  const [servings, setServings] = useState<number | null>(1)
  const [ingredients, setIngredients] = useState<DishIngredient[]>([])
  const [favorite, setFavorite] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setServings(Number(existing.servings))
      setIngredients(existing.ingredients)
      setFavorite(existing.is_favorite)
    }
  }, [existing])

  if (id && isLoading) return null
  const perServing = dishPerServing({ ingredients, servings: servings ?? 1 })
  const total = dishTotals(ingredients)
  const valid = name.trim() && ingredients.length > 0 && servings && servings > 0

  async function submit() {
    if (!valid) return
    await save.mutateAsync({
      id: existing?.id,
      name: name.trim(),
      servings: servings!,
      ingredients,
      is_favorite: favorite,
      last_used_at: existing?.last_used_at ?? null,
    })
    toast(existing ? 'Gericht gespeichert' : 'Gericht angelegt', '🍽️')
    navigate(-1)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-32 safe-top">
      <PageHeader
        title={existing ? 'Gericht bearbeiten' : 'Neues Gericht'}
        back
        actions={
          <IconButton label={favorite ? 'Aus Favoriten entfernen' : 'Als Favorit markieren'} aria-pressed={favorite} onClick={() => setFavorite((f) => !f)}>
            <Star className={`size-5 ${favorite ? 'fill-carbs text-carbs' : ''}`} />
          </IconButton>
        }
      />
      <div className="space-y-4">
        <Field label="Name des Gerichts" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Mein Frühstücksmüsli" />
        <NumberInput label="Ergibt Portionen" suffix="Port." value={servings} min={0} onChange={setServings} />
      </div>

      <SectionTitle>Zutaten</SectionTitle>
      <Card className="p-2">
        {ingredients.length === 0 && <p className="p-3 text-sm text-muted">Noch keine Zutaten. Füge die erste hinzu.</p>}
        <ul className="divide-y divide-line/70">
          {ingredients.map((ing, idx) => {
            const kcal = nutrientsForGrams({ kcal: ing.kcal_100, protein: ing.protein_100, carbs: ing.carbs_100, fat: ing.fat_100 }, ing.grams).kcal
            return (
              <li key={idx} className="flex items-center gap-2 px-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{ing.name}</p>
                  <p className="text-xs text-muted tabular">{fmtInt(kcal)} kcal</p>
                </div>
                <NumberInput
                  className="w-28"
                  label={`Menge ${ing.name}`}
                  hideLabel
                  suffix="g"
                  value={ing.grams}
                  min={0}
                  onChange={(v) => setIngredients((list) => list.map((x, i) => (i === idx ? { ...x, grams: v ?? 0 } : x)))}
                />
                <IconButton label={`${ing.name} entfernen`} onClick={() => setIngredients((list) => list.filter((_, i) => i !== idx))}>
                  <X className="size-4" />
                </IconButton>
              </li>
            )
          })}
        </ul>
        <Button variant="ghost" block icon={<Plus className="size-4" aria-hidden />} onClick={() => setPickerOpen(true)}>
          Zutat hinzufügen
        </Button>
      </Card>

      {ingredients.length > 0 && (
        <>
          <SectionTitle>Pro Portion</SectionTitle>
          <NutrientGrid n={perServing} />
          <p className="mt-2 px-1 text-xs text-muted tabular">Gesamt: {fmtInt(total.kcal)} kcal</p>
        </>
      )}

      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-3 px-4 py-3">
          {existing && (
            <Button
              variant="secondary"
              icon={<Trash2 className="size-4" aria-hidden />}
              onClick={async () => {
                if (!confirm(`„${existing.name}“ wirklich löschen?`)) return
                await del.mutateAsync(existing.id)
                toast('Gericht gelöscht')
                navigate(-1)
              }}
            >
              Löschen
            </Button>
          )}
          <Button size="lg" className="flex-1" disabled={!valid || save.isPending} onClick={submit}>
            Speichern
          </Button>
        </div>
      </div>

      <IngredientPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(i) => setIngredients((l) => [...l, i])} />
    </div>
  )
}
