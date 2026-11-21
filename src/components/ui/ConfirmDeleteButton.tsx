import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, type ButtonProps } from './Button'

/** So lange wartet „Wirklich löschen?“ auf die Bestätigung */
export const CONFIRM_MS = 4000
/** Ein schneller Doppeltipp zählt nicht als Bestätigung */
const DOUBLE_TAP_MS = 400

/**
 * Löschen in zwei Schritten, ohne Dialog: Der erste Tipp macht aus dem Knopf „Wirklich löschen?“, erst der zweite
 * löscht. Ohne Bestätigung springt er nach ein paar Sekunden zurück. „Rückgängig“ gibt es danach trotzdem.
 */
export function ConfirmDeleteButton({
  onConfirm,
  label = 'Löschen',
  confirmLabel = 'Wirklich löschen?',
  variant = 'secondary',
  ...rest
}: Omit<ButtonProps, 'onClick' | 'children' | 'icon'> & {
  onConfirm: () => void | Promise<void>
  label?: string
  confirmLabel?: string
}) {
  const [armed, setArmed] = useState(false)
  const armedAt = useRef(0)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), CONFIRM_MS)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <>
      <Button
        {...rest}
        variant={armed ? 'danger' : variant}
        icon={<Trash2 className="size-4" aria-hidden />}
        onClick={() => {
          if (!armed) {
            armedAt.current = Date.now()
            setArmed(true)
            return
          }
          if (Date.now() - armedAt.current < DOUBLE_TAP_MS) return
          setArmed(false)
          void onConfirm()
        }}
      >
        {armed ? confirmLabel : label}
      </Button>
      <span className="sr-only" aria-live="polite">
        {armed ? 'Zum Löschen noch einmal tippen' : ''}
      </span>
    </>
  )
}
