import { useState, type FormEvent } from 'react'
import { Check, ListRestart, Package, PackageCheck, Plus, Share2, ShoppingBasket, Trash2, X } from 'lucide-react'
import type { ShoppingCategory, ShoppingItem } from '../types'
import { useShoppingItems, useAddToShopping, useDeleteShoppingItems, useUpdateShoppingItem } from '../hooks/shopping'
import { usePlanRange } from '../hooks/plan'
import { CATEGORY_LABELS, CATEGORY_ORDER, formatQuantity, groupByCategory, guessCategory, parseItemText, shoppingListText } from '../lib/shopping'
import { shiftISO, todayISO, weekDaysISO, weekStartISO, fmtDayShort } from '../lib/dates'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState, Spinner } from '../components/ui/EmptyState'
import { Sheet } from '../components/ui/Sheet'
import { Segmented } from '../components/ui/Segmented'
import { Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { useGenerateShopping } from '../components/planner/GenerateShoppingButton'
import { useUndoToast } from '../hooks/undo'

export function ShoppingPage() {
  const { data: items = [], isLoading } = useShoppingItems()
  const del = useDeleteShoppingItems()
  const toast = useToast()
  const undo = useUndoToast()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  const toBuy = items.filter((i) => !i.in_stock)
  const inStock = items.filter((i) => i.in_stock)
  const done = toBuy.filter((i) => i.checked).length
  const groups = groupByCategory(toBuy)

  return (
    <>
      <PageHeader
        title="Einkaufsliste"
        subtitle={toBuy.length ? `${done} von ${toBuy.length} erledigt` : undefined}
        actions={
          items.length > 0 && (
            <>
              <IconButton
                label="Liste teilen"
                onClick={async () => {
                  const text = shoppingListText(items)
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: 'Einkaufsliste', text })
                    } else {
                      await navigator.clipboard.writeText(text)
                      toast('Liste in die Zwischenablage kopiert', '📋')
                    }
                  } catch (e) {
                    if ((e as Error).name !== 'AbortError') toast('Teilen nicht möglich')
                  }
                }}
              >
                <Share2 className="size-5" />
              </IconButton>
              <IconButton label="Liste leeren" onClick={() => setClearOpen(true)}>
                <Trash2 className="size-5" />
              </IconButton>
            </>
          )
        }
      />

      {toBuy.length > 0 && (
        <div
          className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Einkauf erledigt"
          aria-valuemin={0}
          aria-valuemax={toBuy.length}
          aria-valuenow={done}
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(done / toBuy.length) * 100}%` }} />
        </div>
      )}

      <AddItemForm />

      <Button variant="secondary" block className="mt-3" icon={<ListRestart className="size-4" aria-hidden />} onClick={() => setGenerateOpen(true)}>
        Aus Wochenplan erzeugen
      </Button>

      {isLoading && <Spinner />}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={<ShoppingBasket className="size-10" />}
          title="Die Liste ist leer"
          text="Erzeuge sie aus deinem Wochenplan, übernimm Zutaten aus einem Rezept oder füge oben eigene Artikel hinzu."
        />
      )}

      <div className="mt-5 space-y-5">
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`cat-${g.category}`}>
            <h2 id={`cat-${g.category}`} className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
              {g.label}
            </h2>
            <Card className="p-1">
              <ul>
                {[...g.items.filter((i) => !i.checked), ...g.items.filter((i) => i.checked)].map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </ul>
            </Card>
          </section>
        ))}

        {inStock.length > 0 && (
          <section aria-labelledby="cat-stock">
            <h2 id="cat-stock" className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
              <PackageCheck className="size-4" aria-hidden /> Bereits im Vorrat
            </h2>
            <Card className="p-1 opacity-80">
              <ul>
                {inStock.map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>

      <GenerateSheet open={generateOpen} onClose={() => setGenerateOpen(false)} />

      <Sheet open={clearOpen} onClose={() => setClearOpen(false)} title="Liste leeren">
        <div className="space-y-2 pb-2">
          <Button
            variant="secondary"
            block
            size="lg"
            disabled={done === 0}
            onClick={async () => {
              const removed = items.filter((i) => i.checked)
              await del.mutateAsync(removed.map((i) => i.id))
              undo(`${removed.length} erledigte Artikel entfernt`, 'shopping_items', removed)
              setClearOpen(false)
            }}
          >
            Nur erledigte entfernen ({done})
          </Button>
          <Button
            variant="danger"
            block
            size="lg"
            onClick={async () => {
              const removed = [...items]
              await del.mutateAsync(removed.map((i) => i.id))
              undo('Liste geleert', 'shopping_items', removed)
              setClearOpen(false)
            }}
          >
            Alles entfernen ({items.length})
          </Button>
        </div>
      </Sheet>
    </>
  )
}

function ItemRow({ item: i }: { item: ShoppingItem }) {
  const update = useUpdateShoppingItem()
  const del = useDeleteShoppingItems()
  const undo = useUndoToast()
  return (
    <li className="flex items-center">
      <label className="flex min-h-13 flex-1 cursor-pointer items-center gap-3 rounded-2xl py-2 pl-3 pr-1 hover:bg-surface-2/60">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={i.checked}
          disabled={i.in_stock}
          onChange={() => update.mutate({ id: i.id, patch: { checked: !i.checked } })}
        />
        <span
          aria-hidden
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${
            i.checked ? 'border-brand bg-brand text-brand-ink animate-pop' : 'border-line'
          } ${i.in_stock ? 'opacity-30' : ''}`}
        >
          {i.checked && <Check className="size-4" strokeWidth={3} />}
        </span>
        <span className={`min-w-0 flex-1 truncate ${i.checked ? 'text-muted line-through' : ''}`}>{i.name}</span>
        <span className="shrink-0 text-sm text-muted tabular">{formatQuantity(i.amount === null ? null : Number(i.amount), i.unit)}</span>
      </label>
      <IconButton
        label={i.in_stock ? `${i.name}: doch einkaufen` : `${i.name}: bereits im Vorrat`}
        aria-pressed={i.in_stock}
        className={`size-10 ${i.in_stock ? 'text-brand' : 'text-muted'}`}
        onClick={() => update.mutate({ id: i.id, patch: { in_stock: !i.in_stock, checked: false } })}
      >
        {i.in_stock ? <PackageCheck className="size-4" /> : <Package className="size-4" />}
      </IconButton>
      {i.source === 'manual' && (
        <IconButton
          label={`${i.name} löschen`}
          className="size-10 text-muted"
          onClick={async () => {
            await del.mutateAsync([i.id])
            undo(`${i.name} entfernt`, 'shopping_items', [i])
          }}
        >
          <X className="size-4" />
        </IconButton>
      )}
    </li>
  )
}

/** Eigenen Artikel hinzufügen, z. B. „Kaffee“ oder „2 l Milch“ */
function AddItemForm() {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<ShoppingCategory | 'auto'>('auto')
  const add = useAddToShopping()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseItemText(text)
    if (!parsed) return
    await add.mutateAsync({
      items: [{ ...parsed, category: category === 'auto' ? guessCategory(parsed.name) : category }],
      source: 'manual',
    })
    setText('')
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-surface p-3 ring-1 ring-line/60">
      <div className="flex gap-2">
        <label htmlFor="new-item" className="sr-only">
          Artikel hinzufügen
        </label>
        <input
          id="new-item"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Artikel, z. B. „2 l Milch“ oder „Kaffee“"
          enterKeyHint="done"
          className="min-h-12 min-w-0 flex-1 rounded-2xl bg-surface-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <Button type="submit" size="lg" className="px-4" disabled={!text.trim() || add.isPending} aria-label="Hinzufügen">
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
      <Select
        className="mt-2"
        label="Kategorie"
        value={category}
        onChange={(e) => setCategory(e.target.value as ShoppingCategory | 'auto')}
        options={[{ value: 'auto', label: 'Automatisch erkennen' }, ...CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))]}
      />
    </form>
  )
}

function GenerateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const thisWeek = weekStartISO(todayISO())
  const [week, setWeek] = useState(thisWeek)
  const days = weekDaysISO(week)
  const { data: planItems = [], isLoading } = usePlanRange(days[0], days[6])
  const gen = useGenerateShopping()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Aus Wochenplan erzeugen"
      footer={
        <Button
          block
          size="lg"
          disabled={gen.pending || isLoading || planItems.length === 0}
          onClick={async () => {
            if (await gen.run(planItems)) onClose()
          }}
        >
          Liste erzeugen
        </Button>
      }
    >
      <div className="space-y-4">
        <Segmented
          label="Woche"
          value={week}
          onChange={setWeek}
          options={[
            { value: thisWeek, label: 'Diese Woche' },
            { value: shiftISO(thisWeek, 7), label: 'Nächste Woche' },
          ]}
        />
        <p className="text-sm text-muted">
          {fmtDayShort(days[0])} – {fmtDayShort(days[6])}: {planItems.length} geplante Einträge.
          {planItems.length === 0 && ' Plane zuerst ein paar Mahlzeiten im Wochenplaner.'}
        </p>
        <p className="rounded-2xl bg-surface-2 p-3 text-sm">
          Zutaten werden zusammengeführt und nach Kategorien sortiert. Frühere Artikel aus dem Plan werden ersetzt – eigene
          Artikel und „im Vorrat“-Markierungen bleiben erhalten.
        </p>
      </div>
    </Sheet>
  )
}
