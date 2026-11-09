import { useState, type FormEvent } from 'react'
import { MailCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../app/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'

export function LoginPage() {
  const { sendMagicLink, startLocalMode } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setState('sending')
    try {
      await sendMagicLink(email.trim())
      setState('sent')
    } catch (err) {
      setError((err as Error).message)
      setState('idle')
    }
  }

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <img src="/pwa-192x192.png" alt="" className="mx-auto mb-5 size-20 rounded-3xl shadow-lg animate-pop" />
        <h1 className="text-3xl font-bold tracking-tight">Teller</h1>
        <p className="mt-2 text-muted">Kalorien im Blick, ausgewogen essen, entspannt planen.</p>
      </div>

      {state === 'sent' ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-6 text-center ring-1 ring-line" role="status">
          <MailCheck className="mx-auto mb-3 size-10 text-brand" aria-hidden />
          <h2 className="text-lg font-semibold">Schau in dein Postfach</h2>
          <p className="mt-1 text-sm text-muted">
            Wir haben einen Anmeldelink an <strong className="text-ink">{email}</strong> geschickt. Tippe auf den Link,
            um dich anzumelden.
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => setState('idle')}>
            Andere E-Mail verwenden
          </Button>
        </div>
      ) : isSupabaseConfigured ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="E-Mail-Adresse"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="du@beispiel.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Du bekommst einen Link per E-Mail – kein Passwort nötig."
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" block disabled={state === 'sending' || !email.includes('@')}>
            {state === 'sending' ? 'Wird gesendet …' : 'Anmeldelink senden'}
          </Button>
        </form>
      ) : (
        <div className="rounded-3xl bg-surface p-5 text-sm ring-1 ring-line">
          <p className="font-semibold">Supabase ist noch nicht eingerichtet.</p>
          <p className="mt-1 text-muted">
            Trage <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> ein, um
            dich per Magic Link anzumelden und deine Daten geräteübergreifend zu speichern.
          </p>
        </div>
      )}

      {state !== 'sent' && (
        <div className="mt-8 text-center">
          <Button variant="ghost" icon={<Sparkles className="size-4" aria-hidden />} onClick={startLocalMode}>
            Ohne Konto ausprobieren
          </Button>
          <p className="mt-1 text-xs text-muted">Demo-Modus: Daten bleiben nur auf diesem Gerät.</p>
        </div>
      )}
    </main>
  )
}
