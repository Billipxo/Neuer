import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

interface ToastItem {
  id: number
  text: string
  emoji?: string
  action?: ToastAction
}

type ShowToast = (text: string, emoji?: string, action?: ToastAction) => void

const ToastCtx = createContext<ShowToast>(() => {})

/** Hinweise ohne Aktion verschwinden schnell; mit Aktion (z. B. „Rückgängig“) bleibt genug Zeit zum Antippen */
const DURATION = 2600
const DURATION_WITH_ACTION = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), [])
  const show = useCallback<ShowToast>(
    (text, emoji, action) => {
      const id = Date.now() + Math.random()
      setItems((s) => [...s, { id, text, emoji, action }])
      setTimeout(() => dismiss(id), action ? DURATION_WITH_ACTION : DURATION)
    },
    [dismiss],
  )
  useEffect(() => {
    const onError = (e: Event) => show((e as CustomEvent<string>).detail, '⚠️')
    window.addEventListener('teller-error', onError)
    return () => window.removeEventListener('teller-error', onError)
  }, [show])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="safe-top pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-up flex max-w-full items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-lg ${
              t.action ? 'pointer-events-auto' : ''
            }`}
          >
            <span className="min-w-0">
              {t.emoji && <span aria-hidden className="mr-1.5">{t.emoji}</span>}
              {t.text}
            </span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  dismiss(t.id)
                  void t.action!.onClick()
                }}
                className="-my-2 -mr-2 min-h-10 shrink-0 rounded-xl px-3 font-semibold text-brand-soft underline decoration-2 underline-offset-4 transition hover:bg-bg/10 active:scale-95"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
