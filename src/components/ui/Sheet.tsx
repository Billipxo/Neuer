import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './Button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Vollbild auf dem Handy (z. B. für Suche) */
  tall?: boolean
}

/** Bottom-Sheet-Dialog mit Fokusfalle, Escape zum Schließen und Hintergrund-Klick */
export function Sheet({ open, onClose, title, children, footer, tall }: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((el) => !el.hasAttribute('disabled'))
    // Panel fokussieren (öffnet auf dem Handy keine Tastatur); gezielt mit data-autofocus überschreibbar
    const auto = panel?.querySelector<HTMLElement>('[data-autofocus]')
    ;(auto ?? panel)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      } else if (e.key === 'Tab') {
        const els = focusables()
        if (!els.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 animate-[fade-up_0.2s_ease-out]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl animate-sheet sm:rounded-3xl ${
          tall ? 'h-[92dvh]' : 'max-h-[90dvh]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-3">
          <div aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 id={titleId} className="mt-2 text-lg font-semibold">
            {title}
          </h2>
          <IconButton label="Schließen" onClick={onClose} className="-mr-2 mt-1">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-line px-5 pt-3 pb-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
