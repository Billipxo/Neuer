import { useRef, useState } from 'react'
import { Download, FileJson, Trash2, Upload } from 'lucide-react'
import { useAuth, useStore } from '../../app/auth'
import { ALL_TABLES } from '../../data/store'
import type { LogEntry } from '../../types'
import { download, logToCsv } from '../../lib/export'
import { todayISO } from '../../lib/dates'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Field'
import { useToast } from '../ui/Toast'
import { Switch } from '../ui/Switch'
import { IMPORT_ORDER, TABLE_LABELS, parseBackup, type Backup } from '../../lib/backup'
import { previewImport, useImportBackup, type ImportPreview } from '../../hooks/backup'
import { fmtDate } from '../../lib/dates'
import { useHousehold } from '../../app/household'

export function DataSection() {
  const store = useStore()
  // Für den Export der ungefilterte Speicher: im Haushalt sollen auch die privaten Plan-Einträge in die Sicherung
  const { signOut, userId, store: ownStore } = useAuth()
  const { household } = useHousehold()
  const toast = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [restore, setRestore] = useState<{ backup: Backup; preview: ImportPreview } | null>(null)
  const [withProfile, setWithProfile] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importBackup = useImportBackup()

  /** Gewählte Sicherungsdatei prüfen und eine Vorschau zeigen – eingespielt wird erst nach Bestätigung */
  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const preview = await previewImport(store, backup, userId)
      // Auf einem leeren Konto ist es vermutlich eine Wiederherstellung: Einstellungen gleich mit übernehmen
      setWithProfile(Boolean(preview.plan.profile) && preview.accountEmpty)
      setImportError(null)
      setRestore({ backup, preview })
    } catch (e) {
      toast((e as Error).message || 'Die Datei konnte nicht gelesen werden.', '⚠️')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function exportCsv() {
    const log = await store.list<LogEntry>('log_entries', { order: [{ column: 'date' }] })
    download(`teller-protokoll-${todayISO()}.csv`, logToCsv(log), 'text/csv;charset=utf-8')
    toast('CSV exportiert', '📄')
  }

  async function exportJson() {
    const source = ownStore ?? store
    const data: Record<string, unknown> = { exportiert_am: new Date().toISOString(), profil: await source.getProfile() }
    for (const t of ALL_TABLES) {
      const rows = await source.list<{ user_id?: string | null }>(t)
      // Rezepte und Gerichte anderer Haushalts-Mitglieder gehören nicht in die eigene Sicherung
      data[t] = t === 'dishes' || t === 'recipe_variants' ? rows.filter((r) => !r.user_id || r.user_id === userId) : rows
    }
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
      <Button variant="secondary" block className="mt-2" icon={<Upload className="size-4" aria-hidden />} onClick={() => fileRef.current?.click()}>
        Sicherung einspielen (JSON)
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-label="Sicherungsdatei auswählen"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <p className="mt-2 text-xs text-muted">
        „Alle Daten (JSON)“ ist zugleich deine Sicherung: Sie lässt sich hier wieder einspielen – auch in einem anderen Konto oder auf einem
        neuen Gerät.
      </p>
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
        open={!!restore}
        onClose={() => setRestore(null)}
        title="Sicherung einspielen"
        footer={
          <Button
            block
            size="lg"
            disabled={importBackup.isPending || !restore || (restore.preview.plan.total === 0 && !withProfile)}
            onClick={async () => {
              if (!restore) return
              setImportError(null)
              try {
                const plan = await importBackup.mutateAsync({ backup: restore.backup, withProfile })
                toast(plan.total ? `Sicherung eingespielt: ${plan.total} Einträge übernommen` : 'Einstellungen übernommen', '📦')
                setRestore(null)
              } catch (e) {
                setImportError((e as Error).message || 'Unbekannter Fehler')
              }
            }}
          >
            {importBackup.isPending ? 'Wird eingespielt …' : 'Einspielen'}
          </Button>
        }
      >
        {restore && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {restore.backup.exportedAt ? `Sicherung vom ${fmtDate(restore.backup.exportedAt.slice(0, 10))}. ` : ''}
              Vorhandenes wird nicht überschrieben und nichts doppelt angelegt – du kannst dieselbe Sicherung gefahrlos mehrfach einspielen.
              {household ? ' Wochenplan und Einkaufsliste landen im gemeinsamen Haushalt.' : ''}
            </p>
            {restore.preview.plan.total === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-3 text-sm" role="status">
                Alles aus dieser Sicherung ist schon vorhanden.
              </p>
            ) : (
              <ul className="divide-y divide-line/70 rounded-2xl bg-surface-2/60 px-3 text-sm" aria-label="Inhalt der Sicherung">
                {IMPORT_ORDER.filter((t) => restore.preview.plan.counts[t].added + restore.preview.plan.counts[t].skipped > 0).map((t) => {
                  const c = restore.preview.plan.counts[t]
                  return (
                    <li key={t} className="flex items-baseline justify-between gap-3 py-2">
                      <span>{TABLE_LABELS[t]}</span>
                      <span className="shrink-0 text-muted tabular">
                        {c.added} neu{c.skipped ? ` · ${c.skipped} schon da` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {restore.preview.plan.profile && (
              <Switch
                label="Profil und Einstellungen übernehmen"
                description="Tagesziel, Makros, Favoriten, Ernährungsweise und Unverträglichkeiten aus der Sicherung ersetzen die aktuellen."
                checked={withProfile}
                onChange={setWithProfile}
              />
            )}
            {importError && (
              <p role="alert" className="text-sm text-danger">
                Einspielen nicht abgeschlossen: {importError} Du kannst es einfach noch einmal versuchen – bereits Übernommenes wird
                übersprungen.
              </p>
            )}
          </div>
        )}
      </Sheet>

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
