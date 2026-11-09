import { useState } from 'react'
import { Droplets, X } from 'lucide-react'
import { useAddWater, useDeleteWater, useWater } from '../../hooks/data'
import { fmtInt } from '../../lib/format'
import { Sheet } from '../ui/Sheet'
import { Button, IconButton } from '../ui/Button'
import { NumberInput } from '../ui/NumberInput'

export function WaterSheet({ open, onClose, date, target }: { open: boolean; onClose: () => void; date: string; target: number }) {
  const { data = [] } = useWater(date)
  const add = useAddWater()
  const del = useDeleteWater()
  const [custom, setCustom] = useState<number | null>(null)
  const total = data.reduce((s, w) => s + Number(w.ml), 0)
  const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0

  return (
    <Sheet open={open} onClose={onClose} title="Wasser">
      <div className="space-y-5">
        <div className="text-center">
          <Droplets className="mx-auto size-8 text-water" aria-hidden />
          <p className="mt-1 text-3xl font-bold tabular">{fmtInt(total)} ml</p>
          <p className="text-sm text-muted">von {fmtInt(target)} ml</p>
          <div
            className="mx-auto mt-3 h-3 max-w-xs overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Wasser"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={total}
          >
            <div className="h-full rounded-full bg-water transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[200, 250, 500].map((ml) => (
            <Button key={ml} variant="secondary" size="lg" onClick={() => add.mutate({ date, ml })}>
              + {ml} ml
            </Button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <NumberInput className="flex-1" label="Eigene Menge" suffix="ml" value={custom} min={0} max={5000} onChange={setCustom} />
          <Button
            size="lg"
            disabled={!custom}
            onClick={() => {
              if (custom) add.mutate({ date, ml: Math.round(custom) })
              setCustom(null)
            }}
          >
            Hinzufügen
          </Button>
        </div>
        {data.length > 0 && (
          <ul className="divide-y divide-line/70 rounded-2xl bg-surface-2/60">
            {data.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-3 py-1 text-sm">
                <span className="tabular">{fmtInt(Number(w.ml))} ml</span>
                <IconButton label={`${w.ml} ml entfernen`} onClick={() => del.mutate(w.id)}>
                  <X className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
