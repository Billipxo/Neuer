import { useEffect, useState } from 'react'

/** Hält den Bildschirm wach, solange die Komponente sichtbar ist (falls der Browser das unterstützt) */
export function useWakeLock(active = true): { supported: boolean; locked: boolean } {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!active || !supported) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release()
          return
        }
        setLocked(true)
        sentinel.addEventListener('release', () => setLocked(false))
      } catch {
        setLocked(false)
      }
    }
    // Beim Zurückkehren in die App erneut anfordern – der Browser gibt die Sperre beim Verlassen frei
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => {})
    }
  }, [active, supported])

  return { supported, locked }
}
