import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, Leaf, Plus, Trash2, Wand2, X } from 'lucide-react'
import type { MealType, RecipeIngredient } from '../types'
import { MEAL_TYPES } from '../types'
import { CHAPTERS, type ChapterId } from '../data/chapters'
import { MEAL_LABELS } from '../lib/meals'
import { hasAirfryerVariant, recipeSteps, TAG_LABELS } from '../lib/recipes'
import { fmt1, fmtInt } from '../lib/format'
import {
  changeUnit,
  customKindOf,
  draftFromRecipe,
  draftFromVariant,
  draftProblems,
  emptyDraft,
  fmtSigned,
  formatDiff,
  ingredientKcal,
  nutritionDiff,
  suggestChapter,
  swapIngredient,
  swapSuggestions,
  unitOptions,
  variantToRecipe,
  type CustomIngredientInput,
  type VariantDraft,
} from '../lib/variants'
import { useProfile } from '../hooks/data'
import { useDeleteVariant, useResolvedRecipe, useSaveVariant } from '../hooks/variants'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Field, Select, TextArea } from '../components/ui/Field'
import { NumberInput } from '../components/ui/NumberInput'
import { Chip, Segmented } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'
import { Spinner } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { NutrientGrid } from '../components/add/NutrientGrid'
import { IngredientPickerSheet } from '../components/add/IngredientPickerSheet'
import { BarcodeScannerSheet } from '../components/add/BarcodeScannerSheet'
import { getProductByBarcode } from '../lib/openFoodFacts'
import { IngredientSearchSheet } from '../components/recipes/IngredientSearchSheet'
import { CustomIngredientSheet } from '../components/recipes/CustomIngredientSheet'

type Method = 'airfryer' | 'oven'

type SheetState =
  | { kind: 'search'; replace?: number }
  | { kind: 'foods'; replace?: number }
  | { kind: 'custom'; replace?: number; initial?: Partial<CustomIngredientInput>; editing?: boolean }
  | { kind: 'scan'; replace?: number }
  | null

const OWN_TAGS = ['variante', 'eigen']

function customInitial(ing: RecipeIngredient): Partial<CustomIngredientInput> {
  const c = ing.custom!
  return { name: ing.name, kcal: c.kcal, protein: c.protein, carbs: c.carbs, fat: c.fat, fiber: c.fiber, unit_g: c.unit_g ?? null, ...customKindOf(c.flags) }
}

/**
 * Rezept abwandeln, eigene Variante bearbeiten oder eigenes Rezept anlegen.
 * Die Nährwerte werden bei jeder Änderung aus den Zutaten neu berechnet.
 */
export function VariantEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: profile } = useProfile()
  const resolved = useResolvedRecipe(id)
  const save = useSaveVariant()
  const del = useDeleteVariant()

  /** Vorhandene Variante, die bearbeitet wird */
  const existing = resolved.variant
  /** Kochbuch-Rezept, auf dem die Variante beruht (bei einer neuen Variante das aufgerufene Rezept) */
  const base = existing ? resolved.base : resolved.recipe

  const [draft, setDraft] = useState<VariantDraft | null>(null)
  const [chapterTouched, setChapterTouched] = useState(false)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [scanBusy, setScanBusy] = useState(false)

  // Entwurf anlegen, sobald klar ist, was bearbeitet wird
  useEffect(() => {
    if (draft) return
    if (!id) {
      setDraft(emptyDraft())
      return
    }
    if (existing) {
      setDraft(draftFromVariant(existing))
      setChapterTouched(true)
      return
    }
    if (resolved.recipe) {
      const wanted = params.get('methode')
      const method: Method = wanted === 'oven' ? 'oven' : wanted === 'airfryer' ? 'airfryer' : (profile?.has_airfryer ?? true) ? 'airfryer' : 'oven'
      setDraft(draftFromRecipe(resolved.recipe, method))
      setChapterTouched(true)
    }
  }, [draft, id, existing, resolved.recipe, params, profile?.has_airfryer])

  const preview = useMemo(() => (draft ? variantToRecipe({ ...draft, id: existing?.id ?? 'entwurf' }, base) : null), [draft, base, existing?.id])
  const diff = preview && base ? formatDiff(nutritionDiff(preview, base)) : []
  const suggestions = useMemo(() => (draft ? swapSuggestions(draft) : []), [draft])

  if (!draft || !preview) {
    if (id && !resolved.isLoading && !resolved.recipe) return <Navigate to="/rezepte" replace />
    return <Spinner />
  }

  const patch = (p: Partial<VariantDraft>) => setDraft((d) => (d ? { ...d, ...p } : d))
  const setIngredients = (fn: (list: RecipeIngredient[]) => RecipeIngredient[]) =>
    setDraft((d) => {
      if (!d) return d
      const ingredients = fn(d.ingredients)
      // Bei eigenen Rezepten das Kapitel vorschlagen, solange keins gewählt wurde
      const chapter = !d.base_recipe_id && !chapterTouched ? suggestChapter(ingredients) : d.chapter
      return { ...d, ingredients, chapter }
    })
  const updateIngredient = (idx: number, p: Partial<RecipeIngredient>) => setIngredients((l) => l.map((x, i) => (i === idx ? { ...x, ...p } : x)))
  const placeIngredient = (ing: RecipeIngredient, replace?: number) =>
    setIngredients((l) => (replace === undefined ? [...l, ing] : l.map((x, i) => (i === replace ? swapIngredient(x, ing) : x))))
  const toggleMeal = (m: MealType) => patch({ meal: draft.meal.includes(m) ? draft.meal.filter((x) => x !== m) : [...draft.meal, m] })

  const methodSwitch = Boolean(base && hasAirfryerVariant(base))
  const method: Method = draft.airfryer ? 'airfryer' : 'oven'
  function switchMethod(m: Method) {
    if (!base?.airfryer) return
    patch({
      steps: [...recipeSteps(base, m)],
      airfryer: m === 'airfryer' ? { temp_c: base.airfryer.temp_c, time_min: base.airfryer.time_min } : null,
    })
    toast(m === 'airfryer' ? 'Schritte für die Heißluftfritteuse übernommen' : 'Schritte für den Backofen übernommen')
  }

  async function submit() {
    if (!draft) return
    const clean: VariantDraft = {
      ...draft,
      title: draft.title.trim(),
      steps: draft.steps.map((s) => s.trim()).filter(Boolean),
      note: draft.note?.trim() || null,
    }
    const problems = draftProblems(clean)
    if (!base && clean.meal.length === 0) problems.push('Wähle mindestens eine Mahlzeit, zu der das Rezept passt.')
    if (problems.length) {
      toast(problems[0])
      return
    }
    const saved = await save.mutateAsync({ ...clean, id: existing?.id })
    toast(existing ? 'Gespeichert' : base ? 'Variante gespeichert' : 'Rezept gespeichert', '✨')
    navigate(`/rezepte/${saved.id}`, { replace: true })
  }

  async function remove() {
    if (!existing) return
    if (!confirm(`„${existing.title}“ wirklich löschen?`)) return
    await del.mutateAsync(existing.id)
    toast(base ? 'Variante gelöscht' : 'Rezept gelöscht')
    navigate(base ? `/rezepte/${base.id}` : '/rezepte', { replace: true })
  }

  const title = existing ? (base ? 'Variante bearbeiten' : 'Rezept bearbeiten') : base ? 'Rezept abwandeln' : 'Eigenes Rezept'
  /** Zutat, die gerade ersetzt wird (undefined = neue Zutat anhängen) */
  const replaceIndex = sheet?.replace

  /** Gescannten Barcode bei Open Food Facts nachschlagen und die Werte ins Formular übernehmen */
  async function onBarcode(code: string) {
    const replace = replaceIndex
    setSheet(null)
    setScanBusy(true)
    try {
      const p = await getProductByBarcode(code)
      if (p) {
        setSheet({
          kind: 'custom',
          replace,
          initial: { name: p.brand ? `${p.name} (${p.brand})` : p.name, kcal: p.kcal_100, protein: p.protein_100, carbs: p.carbs_100, fat: p.fat_100 },
        })
        toast('Nährwerte aus Open Food Facts übernommen', '📷')
      } else {
        toast(`Barcode ${code} nicht gefunden – bitte die Werte von der Packung eintragen`)
        setSheet({ kind: 'custom', replace })
      }
    } catch {
      toast('Keine Verbindung zu Open Food Facts – bitte die Werte von der Packung eintragen')
      setSheet({ kind: 'custom', replace })
    } finally {
      setScanBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-44 safe-top">
      <PageHeader title={title} back />
      {base && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-brand-soft/60 px-3 py-2.5 text-sm">
          <Wand2 className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            Basiert auf{' '}
            <Link to={`/rezepte/${base.id}`} className="font-medium text-brand">
              {base.title}
            </Link>
            . Das Original bleibt unverändert – deine Variante wird mit neu berechneten Nährwerten gespeichert.
          </span>
        </p>
      )}

      <div className="space-y-4">
        <Field label="Titel" value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="z. B. Bolognese mit Linsen" />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Portionen" suffix="Port." value={draft.servings} min={0} onChange={(v) => patch({ servings: v ?? 0 })} />
          <NumberInput label="Zubereitungszeit" suffix="Min." value={draft.time_min} min={0} onChange={(v) => patch({ time_min: v ?? 0 })} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Passt zu</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Mahlzeiten">
            {MEAL_TYPES.map((m) => (
              <Chip key={m} active={draft.meal.includes(m)} onClick={() => toggleMeal(m)}>
                {MEAL_LABELS[m]}
              </Chip>
            ))}
          </div>
        </div>
        {!base && (
          <>
            <Select
              label="Kapitel im Kochbuch"
              value={draft.chapter}
              onChange={(e) => {
                setChapterTouched(true)
                patch({ chapter: e.target.value as ChapterId })
              }}
              options={CHAPTERS.map((c) => ({ value: c.id, label: `${c.emoji} ${c.title}` }))}
            />
            <Switch
              label="Für die Heißluftfritteuse"
              description="Dann gehören Temperatur und Garzeit zum Rezept."
              checked={Boolean(draft.airfryer)}
              onChange={(v) => patch({ airfryer: v ? { temp_c: 180, time_min: 15 } : null })}
            />
          </>
        )}
      </div>

      <SectionTitle>Nährwerte pro Portion</SectionTitle>
      <NutrientGrid n={preview.nutrition} />
      <p className="mt-2 px-1 text-xs text-muted tabular">
        Ballaststoffe: {fmtInt(preview.fiber)} g · wird bei jeder Änderung aus den Zutaten neu berechnet
        {base && (diff.length ? ` · gegenüber dem Original: ${diff.join(', ')}` : ' · wie das Original')}
      </p>
      {draft.ingredients.length > 0 && preview.tags.some((t) => !OWN_TAGS.includes(t)) && (
        <ul className="mt-2 flex flex-wrap gap-1.5 px-1" aria-label="Eigenschaften">
          {preview.tags
            .filter((t) => !OWN_TAGS.includes(t))
            .map((t) => (
              <li key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
                {TAG_LABELS[t] ?? t}
              </li>
            ))}
        </ul>
      )}

      <SectionTitle>Zutaten</SectionTitle>
      <Card className="p-2">
        {draft.ingredients.length === 0 && (
          <p className="p-3 text-sm text-muted">Noch keine Zutaten. Füge die erste hinzu – die Nährwerte rechnen sich von selbst.</p>
        )}
        <ul className="divide-y divide-line/70">
          {draft.ingredients.map((ing, idx) => {
            const units = unitOptions(ing)
            const unitList = units.includes(ing.unit) ? units : [ing.unit, ...units]
            return (
              <li key={idx} className="flex items-center gap-1.5 px-1 py-2">
                <button
                  type="button"
                  onClick={() => setSheet(ing.custom ? { kind: 'custom', replace: idx, initial: customInitial(ing), editing: true } : { kind: 'search', replace: idx })}
                  aria-label={`${ing.name} ersetzen`}
                  className="min-w-0 flex-1 rounded-xl py-1 text-left transition hover:bg-surface-2"
                >
                  <span className="block truncate text-[15px]">{ing.name}</span>
                  <span className="block truncate text-xs text-muted tabular">
                    {[ing.note, `${fmtInt(ingredientKcal(ing))} kcal`, ing.custom ? 'eigene Zutat' : null].filter(Boolean).join(' · ')}
                  </span>
                </button>
                <NumberInput
                  className="w-[4.75rem] shrink-0"
                  label={`Menge ${ing.name}`}
                  hideLabel
                  value={ing.amount}
                  min={0}
                  onChange={(v) => updateIngredient(idx, { amount: v })}
                />
                <label htmlFor={`unit-${idx}`} className="sr-only">
                  Einheit {ing.name}
                </label>
                <select
                  id={`unit-${idx}`}
                  value={ing.unit}
                  onChange={(e) => setIngredients((l) => l.map((x, i) => (i === idx ? changeUnit(x, e.target.value) : x)))}
                  className="min-h-12 max-w-[5.5rem] shrink-0 rounded-2xl bg-surface-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {unitList.map((u) => (
                    <option key={u} value={u}>
                      {u || '–'}
                    </option>
                  ))}
                </select>
                <IconButton label={`${ing.name} entfernen`} className="-mr-1 size-10" onClick={() => setIngredients((l) => l.filter((_, i) => i !== idx))}>
                  <X className="size-4" />
                </IconButton>
              </li>
            )
          })}
        </ul>
        <Button variant="ghost" block icon={<Plus className="size-4" aria-hidden />} onClick={() => setSheet({ kind: 'search' })}>
          Zutat hinzufügen
        </Button>
      </Card>
      {scanBusy && <Spinner label="Produkt wird gesucht …" />}
      {suggestions.length > 0 && (
        <Card className="mt-3 p-3">
          <p className="flex items-center gap-2 px-1 text-sm font-semibold">
            <Leaf className="size-4 text-brand" aria-hidden /> Leichter oder vollwertiger
          </p>
          <ul className="mt-1 divide-y divide-line/70" aria-label="Tausch-Vorschläge">
            {suggestions.map((sg) => (
              <li key={`${sg.index}-${sg.to.name}`} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1 px-1">
                  <p className="truncate text-[15px]">
                    {sg.from.name} → {sg.to.name}
                  </p>
                  <p className="truncate text-xs text-muted tabular">
                    {sg.kcalDelta ? `${fmtSigned(sg.kcalDelta, ' kcal')} pro Portion · ` : ''}
                    {sg.why}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setIngredients((l) => l.map((x, i) => (i === sg.index ? sg.to : x)))}>
                  Tauschen
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="mt-2 px-1 text-xs text-muted">
        Tipp: Auf den Namen tippen, um eine Zutat zu ersetzen – Menge und Einheit bleiben, wenn sie passen. Produkte lassen sich auch per
        Barcode scannen.
      </p>

      <SectionTitle>Zubereitung</SectionTitle>
      {methodSwitch && (
        <Segmented<Method>
          className="mb-3"
          label="Schritte für"
          value={method}
          onChange={switchMethod}
          options={[
            { value: 'airfryer', label: 'Heißluftfritteuse' },
            { value: 'oven', label: 'Backofen' },
          ]}
        />
      )}
      {draft.airfryer && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <NumberInput label="Heißluftfritteuse" suffix="°C" value={draft.airfryer.temp_c} min={0} onChange={(v) => patch({ airfryer: { ...draft.airfryer!, temp_c: v ?? 0 } })} />
          <NumberInput label="Garzeit" suffix="Min." value={draft.airfryer.time_min} min={0} onChange={(v) => patch({ airfryer: { ...draft.airfryer!, time_min: v ?? 0 } })} />
        </div>
      )}
      {draft.steps.length === 0 && <p className="mb-2 px-1 text-sm text-muted">Noch keine Schritte. Zeitangaben wie „10 Minuten“ werden im Kochmodus zu Timern.</p>}
      <ol className="space-y-2">
        {draft.steps.map((s, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span aria-hidden className="mt-3 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">
              {idx + 1}
            </span>
            <TextArea
              className="min-w-0 flex-1"
              label={`Schritt ${idx + 1}`}
              hideLabel
              rows={2}
              value={s}
              onChange={(e) => patch({ steps: draft.steps.map((x, i) => (i === idx ? e.target.value : x)) })}
              placeholder="Was ist zu tun?"
            />
            <IconButton label={`Schritt ${idx + 1} entfernen`} className="mt-1" onClick={() => patch({ steps: draft.steps.filter((_, i) => i !== idx) })}>
              <X className="size-4" />
            </IconButton>
          </li>
        ))}
      </ol>
      <Button variant="ghost" block className="mt-2" icon={<Plus className="size-4" aria-hidden />} onClick={() => patch({ steps: [...draft.steps, ''] })}>
        Schritt hinzufügen
      </Button>

      <SectionTitle>Notiz (optional)</SectionTitle>
      <TextArea
        label="Notiz"
        hideLabel
        rows={3}
        value={draft.note ?? ''}
        onChange={(e) => patch({ note: e.target.value })}
        placeholder="Was hast du geändert, und warum? Die Notiz erscheint auf der Rezeptseite."
      />

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-2.5">
          <p className="mb-2 truncate text-center text-xs text-muted tabular" aria-live="polite">
            {fmtInt(preview.nutrition.kcal)} kcal · {fmt1(preview.nutrition.protein)} g Eiweiß · {fmt1(preview.nutrition.carbs)} g KH ·{' '}
            {fmt1(preview.nutrition.fat)} g Fett pro Portion
            {diff.length > 0 && ` · ${diff[0]}`}
          </p>
          <div className="flex gap-2">
            {existing && (
              <Button variant="secondary" icon={<Trash2 className="size-4" aria-hidden />} disabled={del.isPending} onClick={remove}>
                Löschen
              </Button>
            )}
            <Button size="lg" className="flex-1" icon={<Check className="size-5" aria-hidden />} disabled={save.isPending} onClick={submit}>
              {existing ? 'Speichern' : base ? 'Variante speichern' : 'Rezept speichern'}
            </Button>
          </div>
        </div>
      </div>

      <IngredientSearchSheet
        open={sheet?.kind === 'search'}
        onClose={() => setSheet(null)}
        title={replaceIndex !== undefined && sheet?.kind === 'search' ? `${draft.ingredients[replaceIndex]?.name ?? 'Zutat'} ersetzen` : 'Zutat hinzufügen'}
        onPick={(ing) => {
          placeIngredient(ing, replaceIndex)
          setSheet(null)
        }}
        onCustom={() => setSheet({ kind: 'custom', replace: replaceIndex })}
        onFoods={() => setSheet({ kind: 'foods', replace: replaceIndex })}
        onScan={() => setSheet({ kind: 'scan', replace: replaceIndex })}
      />
      <BarcodeScannerSheet open={sheet?.kind === 'scan'} onClose={() => setSheet(null)} onDetected={onBarcode} />
      <IngredientPickerSheet
        open={sheet?.kind === 'foods'}
        onClose={() => setSheet((s) => (s?.kind === 'foods' ? null : s))}
        onPick={(i) =>
          setSheet({
            kind: 'custom',
            replace: replaceIndex,
            initial: { name: i.name, kcal: i.kcal_100, protein: i.protein_100, carbs: i.carbs_100, fat: i.fat_100 },
          })
        }
      />
      <CustomIngredientSheet
        open={sheet?.kind === 'custom'}
        onClose={() => setSheet(null)}
        initial={sheet?.kind === 'custom' ? sheet.initial : undefined}
        title={sheet?.kind === 'custom' && sheet.editing ? 'Eigene Zutat bearbeiten' : 'Eigene Zutat'}
        onSave={(ing) => placeIngredient(ing, replaceIndex)}
        onScan={() => setSheet({ kind: 'scan', replace: replaceIndex })}
      />
    </div>
  )
}
