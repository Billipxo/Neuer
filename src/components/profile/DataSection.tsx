import { useState } from 'react'
import { Download, FileJson, Trash2 } from 'lucide-react'
import { useAuth, useStore } from '../../app/auth'
import { ALL_TABLES } from '../../data/store'
import type { LogEntry } from '../../types'
import { download, logToCsv } from '../../lib/export'
import { todayISO } from '../../lib/dates'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Field'
import { useToast } from '../ui/Toast'

export function DataSection() {
  const store = useStore()
  const { signOut } = useAuth()
  const toast = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportCsv() {
    const log = await store.list<LogEntry>('log_entries', { order: [{ column: 'date' }] })
    download(`teller-protokoll-${todayISO()}.csv`, logToCsv(log), 'text/csv;charset=utf-8')
    toast('CSV exportiert', '📄')
  }

  async function exportJson() {
    const data: Record<string, unknown> = { exportiert_am: new Date().toISOString(), profil: await store.getProfile() }
    for (const t of ALL_TABLES) data[t] = await store.list(t)
    download(`teller-daten-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json')
    toast('JSON exportiert', '📦')
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={exportCsv}>
          Protokoll (CSV)
        </Button>
        <Button variant="secondary" icon={<FileJson className="size-4" aria-hidden />} onClick={exportJson}>
          Alle Daten (JSON)
        </Button>
      </div>
      <Button
        variant="ghost"
        block
        className="mt-2 text-danger"
        icon={<Trash2 className="size-4" aria-hidden />}
        onClick={() => {
          setConfirmText('')
          setError(null)
          setDeleteOpen(true)
        }}
      >
        Konto löschen
      </Button>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Konto löschen?"
        footer={
          <Button
            variant="danger"
            block
            size="lg"
            disabled={confirmText.trim().toUpperCase() !== 'LÖSCHEN' || busy}
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                await store.deleteAccount()
                await signOut()
              } catch (e) {
                setError((e as Error).message)
                setBusy(false)
              }
            }}
          >
            {busy ? 'Wird gelöscht …' : 'Endgültig löschen'}
          </Button>
        }
      >
        <div className="space-y-4">
          <p>
            Dabei werden dein Konto und <strong>alle</strong> gespeicherten Daten dauerhaft entfernt: Profil, Protokoll,
            Lebensmittel, Gerichte, Wochenpläne, Einkaufsliste und Erfolge. Das lässt sich nicht rückgängig machen.
          </p>
          <p className="text-sm text-muted">Tipp: Exportiere vorher deine Daten als JSON.</p>
          <Field label="Zur Bestätigung „LÖSCHEN“ eingeben" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          {error && (
            <p role="alert" className="text-sm text-danger">
              Löschen fehlgeschlagen: {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  )
}
