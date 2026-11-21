import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuth, useStore } from '../../app/auth'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Field'

/** „Konto löschen“ – im Bereich „Konto“, mit Bestätigung durch Eintippen von LÖSCHEN */
export function DeleteAccount() {
  const store = useStore()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <Button
        variant="ghost"
        block
        className="text-danger!"
        icon={<Trash2 className="size-4" aria-hidden />}
        onClick={() => {
          setConfirmText('')
          setError(null)
          setOpen(true)
        }}
      >
        Konto löschen
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
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
            Dabei werden dein Konto und <strong>alle</strong> gespeicherten Daten dauerhaft entfernt: Profil, Protokoll, Lebensmittel, Gerichte,
            Wochenpläne, Einkaufsliste und Erfolge. Das lässt sich nicht rückgängig machen.
          </p>
          <p className="text-sm text-muted">Tipp: Sichere vorher deine Daten – unter „Deine Daten“ → „Alle Daten (JSON)“.</p>
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
