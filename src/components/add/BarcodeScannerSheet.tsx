import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'

interface Props {
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

/** Kamera-Barcode-Scanner (EAN/UPC) mit manueller Eingabe als Ausweichmöglichkeit */
export function BarcodeScannerSheet({ open, onClose, onDetected }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const detectedRef = useRef(onDetected)
  detectedRef.current = onDetected

  useEffect(() => {
    if (!open) return
    setError(null)
    let stopped = false
    let scanner: import('html5-qrcode').Html5Qrcode | null = null

    ;(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (stopped) return
        scanner = new Html5Qrcode('barcode-reader', {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          useBarCodeDetectorIfSupported: true,
        })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w, h) => ({ width: Math.min(w * 0.85, 320), height: Math.min(h * 0.5, 160) }) },
          (text) => {
            if (stopped) return
            stopped = true
            navigator.vibrate?.(40)
            scanner?.stop().catch(() => {})
            detectedRef.current(text)
          },
          () => {},
        )
      } catch (e) {
        if (!stopped)
          setError(
            'Die Kamera konnte nicht gestartet werden. Bitte erlaube den Kamerazugriff oder gib den Barcode unten ein.' +
              (e instanceof Error && e.message ? ` (${e.message})` : ''),
          )
      }
    })()

    return () => {
      stopped = true
      if (scanner?.isScanning) scanner.stop().catch(() => {})
    }
  }, [open])

  return (
    <Sheet open={open} onClose={onClose} title="Barcode scannen">
      <div className="space-y-4">
        <div id="barcode-reader" className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/90" />
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : (
          <p className="text-center text-sm text-muted">Halte den Barcode in den Rahmen.</p>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.trim()) onDetected(manual.trim())
          }}
        >
          <Field
            className="flex-1"
            label="Barcode manuell eingeben"
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
            placeholder="z. B. 4000417025005"
          />
          <Button type="submit" size="lg" disabled={manual.length < 8}>
            Suchen
          </Button>
        </form>
      </div>
    </Sheet>
  )
}
