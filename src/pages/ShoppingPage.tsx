import { Check, ShoppingBasket } from 'lucide-react'
import { useShoppingItems, useUpdateShoppingItem } from '../hooks/shopping'
import { formatQuantity, groupByCategory } from '../lib/shopping'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { EmptyState, Spinner } from '../components/ui/EmptyState'

export function ShoppingPage() {
  const { data: items = [], isLoading } = useShoppingItems()
  const update = useUpdateShoppingItem()
  const groups = groupByCategory(items)

  return (
    <>
      <PageHeader title="Einkaufsliste" />
      {isLoading && <Spinner />}
      {!isLoading && items.length === 0 && (
        <EmptyState icon={<ShoppingBasket className="size-10" />} title="Die Liste ist leer" text="Füge Zutaten aus einem Rezept hinzu." />
      )}
      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`cat-${g.category}`}>
            <h2 id={`cat-${g.category}`} className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
              {g.label}
            </h2>
            <Card className="p-1">
              <ul>
                {g.items.map((i) => (
                  <li key={i.id}>
                    <label className="flex min-h-13 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 hover:bg-surface-2/60">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={i.checked}
                        onChange={() => update.mutate({ id: i.id, patch: { checked: !i.checked } })}
                      />
                      <span
                        aria-hidden
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${
                          i.checked ? 'border-brand bg-brand text-brand-ink' : 'border-line'
                        }`}
                      >
                        {i.checked && <Check className="size-4" strokeWidth={3} />}
                      </span>
                      <span className={`flex-1 ${i.checked ? 'text-muted line-through' : ''}`}>{i.name}</span>
                      <span className="text-sm text-muted tabular">{formatQuantity(i.amount === null ? null : Number(i.amount), i.unit)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>
    </>
  )
}
