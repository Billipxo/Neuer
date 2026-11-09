import { useEffect, useState } from 'react'
import { useSaveWeight, useWeights } from '../../hooks/data'
import { fmt1 } from '../../lib/format'
import { fmtDate } from '../../lib/dates'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { NumberInput } from '../ui/NumberInput'
import { useToast } from '../ui/Toast'

export function WeightSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const { data = [] } = useWeights()
  const save = useSaveWeight()
  const toast = useToast()
  const forDay = data.find((w) => w.date === date)
  const last = data[data.length - 1]
  const [kg, setKg] = useState<number | null>(null)

  useEffect(() => {
    if (open) setKg(forDay ? Number(forDay.kg) : last ? Number(last.kg) : null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Gewicht eintragen"
      footer={
        <Button
          block
          size="lg"
          disabled={!kg || save.isPending}
          onClick={async () => {
            if (!kg) return
            await save.mutateAsync({ date, kg })
            toast('Gewicht gespeichert', '⚖️')
            onClose()
          }}
        >
          Speichern
        </Button>
      }
    >
      <NumberInput label={`Gewicht am ${fmtDate(date)}`} suffix="kg" value={kg} min={0} max={500} onChange={setKg} />
      {last && (
        <p className="mt-3 text-sm text-muted">
          Letzter Eintrag: {fmt1(Number(last.kg))} kg am {fmtDate(last.date)}
        </p>
      )}
    </Sheet>
  )
}
