import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CloudOff, RefreshCw } from 'lucide-react'
import { isOfflineStore, useAuth } from '../../app/auth'
import type { SyncState } from '../../data/offlineStore'

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/**
 * Zeigt an, wenn die App offline ist oder noch Änderungen überträgt, und synchronisiert automatisch,
 * sobald wieder eine Verbindung besteht.
 */
export function SyncBanner() {
  const { store } = useAuth()
  const online = useOnline()
  const qc = useQueryClient()
  const offline = isOfflineStore(store) ? store : null
  const [sync, setSync] = useState<SyncState | null>(() => offline?.getSyncState() ?? null)

  useEffect(() => {
    if (!offline) return
    setSync(offline.getSyncState())
    return offline.subscribe(setSync)
  }, [offline])

  // Bei (wieder) bestehender Verbindung Warteschlange übertragen und Daten neu laden
  useEffect(() => {
    if (!offline || !online) return
    let cancelled = false
    offline.flush().then((done) => {
      if (done && !cancelled) qc.invalidateQueries()
    })
    return () => {
      cancelled = true
    }
  }, [offline, online, qc])

  const pending = sync?.pending ?? 0
  if (online && pending === 0) return null
  return (
    <div role="status" className="safe-top sticky top-0 z-40 -mx-4 mb-1 bg-bg/95 px-4 py-2 backdrop-blur">
      <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${online ? 'bg-surface-2' : 'bg-over/15'}`}>
        {online ? <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden /> : <CloudOff className="size-4 shrink-0" aria-hidden />}
        <span className="flex-1">
          {online
            ? `Synchronisiere ${pending} Änderung${pending === 1 ? '' : 'en'} …`
            : offline
              ? `Offline – Einträge werden gespeichert und später übertragen${pending ? ` (${pending} ausstehend)` : ''}.`
              : 'Offline – du kannst die App weiter nutzen.'}
        </span>
      </div>
    </div>
  )
}
