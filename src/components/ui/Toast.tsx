import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  text: string
  emoji?: string
}

const ToastCtx = createContext<(text: string, emoji?: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const show = useCallback((text: string, emoji?: string) => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { id, text, emoji }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 2600)
  }, [])
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
            className="animate-fade-up rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-lg"
          >
            {t.emoji && <span aria-hidden className="mr-1.5">{t.emoji}</span>}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
