import { useEffect, useMemo, useState } from 'react'
import type { RecipeIngredient } from '../../types'
import { parseIngredientList, parseSteps } from '../../lib/recipeImport'
import { fmt1 } from '../../lib/format'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { TextArea } from '../ui/Field'

function amountText(i: RecipeIngredient): string {
  return i.amount === null ? 'Menge offen' : `${fmt1(i.amount)} ${i.unit}`
}

/** Zutatenliste einfügen (z. B. von einer Webseite kopiert) – erkannte Zutaten werden übernommen */
export function IngredientImportSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (ingredients: RecipeIngredient[]) => void
}) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText('')
  }, [open])
  const parsed = useMemo(() => parseIngredientList(text), [text])
  const n = parsed.ingredients.length
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Zutaten aus Text"
      footer={
        <Button block size="lg" disabled={!n} onClick={() => onAdd(parsed.ingredients)}>
          {n === 1 ? '1 Zutat übernehmen' : `${n} Zutaten übernehmen`}
        </Button>
      }
    >
      <div className="space-y-3">
        <TextArea
          label="Zutatenliste"
          hint="Eine Zutat je Zeile, z. B. von einer Webseite kopiert. Mengen und Einheiten erkennt die App, Nährwerte kommen aus der Nährwerttabelle."
          placeholder={'200 g Mehl\n2 EL Olivenöl\n1 Zwiebel, fein gewürfelt\n1 Prise Salz'}
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {n > 0 && (
          <ul className="divide-y divide-line rounded-2xl bg-surface-2 px-3 text-sm" aria-label="Erkannte Zutaten">
            {parsed.ingredients.map((i, idx) => (
              <li key={idx} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{i.name}</span>
                  {i.note && <span className="text-muted"> · {i.note}</span>}
                </span>
                <span className={`shrink-0 tabular-nums ${i.amount === null ? 'text-muted' : ''}`}>{amountText(i)}</span>
              </li>
            ))}
          </ul>
        )}
        {parsed.unknown.length > 0 && (
          <p className="text-xs text-muted">
            Nicht erkannt: {parsed.unknown.map((u) => `„${u}“`).join(', ')} – nach dem Übernehmen über „Zutat hinzufügen“ ergänzen
            (auch als eigene Zutat mit eigenen Werten).
          </p>
        )}
        {parsed.ingredients.some((i) => i.amount === null) && (
          <p className="text-xs text-muted">Bei „Menge offen“ trägst du die Menge danach selbst ein (z. B. Gramm statt Stück).</p>
        )}
      </div>
    </Sheet>
  )
}

/** Zubereitung einfügen – nummerierte Schritte oder Absätze werden zu einzelnen Schritten */
export function StepsImportSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (steps: string[]) => void }) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText('')
  }, [open])
  const steps = useMemo(() => parseSteps(text), [text])
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Zubereitung aus Text"
      footer={
        <Button block size="lg" disabled={!steps.length} onClick={() => onAdd(steps)}>
          {steps.length === 1 ? '1 Schritt übernehmen' : `${steps.length} Schritte übernehmen`}
        </Button>
      }
    >
      <div className="space-y-3">
        <TextArea
          label="Zubereitung"
          hint="Nummerierte Schritte („1. …“) oder Absätze werden zu einzelnen Schritten. Zeitangaben wie „20 Minuten“ werden im Kochmodus zu Timern."
          placeholder={'1. Zwiebel fein hacken.\n2. Öl erhitzen und die Zwiebel glasig dünsten.\n3. Tomaten zugeben und 20 Minuten köcheln lassen.'}
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {steps.length > 0 && (
          <ol className="list-decimal space-y-1.5 rounded-2xl bg-surface-2 py-2 pl-8 pr-3 text-sm" aria-label="Erkannte Schritte">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </div>
    </Sheet>
  )
}
