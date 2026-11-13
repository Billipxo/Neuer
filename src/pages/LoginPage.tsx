import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '../components/ui/Sheet'
import { AboutContent } from '../components/about/AboutContent'
import { MailCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../app/auth'
import { authLinkProblem, isSupabaseConfigured, supabaseConfigProblem } from '../lib/supabase'
import { loginError, withoutLinkProblem } from '../lib/authMessages'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'

/** Demo-Modus anzeigen? Ohne Supabase immer; mit Supabase nur, wenn VITE_ENABLE_DEMO=true gesetzt ist */
const showDemo = !isSupabaseConfigured || import.meta.env.VITE_ENABLE_DEMO === 'true'

export function LoginPage() {
  const [aboutOpen, setAboutOpen] = useState(false)
  const { sendMagicLink, verifyCode, startLocalMode } = useAuth()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Hinweis auf einen abgelaufenen Link nur einmal zeigen: Angaben aus der Adresszeile nehmen
  useEffect(() => {
    if (authLinkProblem) window.history.replaceState(null, '', withoutLinkProblem(window.location.href))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setState('sending')
    try {
      await sendMagicLink(email.trim())
      setState('sent')
    } catch (err) {
      setError(loginError((err as Error).message))
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

      {authLinkProblem && state !== 'sent' && (
        <p role="alert" className="mb-4 rounded-2xl bg-over/15 p-4 text-sm">
          {authLinkProblem}
        </p>
      )}

      {state === 'sent' ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-6 text-center ring-1 ring-line" role="status">
          <MailCheck className="mx-auto mb-3 size-10 text-brand" aria-hidden />
          <h2 className="text-lg font-semibold">Schau in dein Postfach</h2>
          <p className="mt-1 text-sm text-muted">
            Wir haben einen Anmeldelink an <strong className="text-ink">{email}</strong> geschickt. Tippe auf den Link
            in der Mail – du wirst dort angemeldet, wo du ihn öffnest. Jeder Link gilt nur einmal. Keine Mail da? Schau
            auch im Spam-Ordner nach.
          </p>
          <form
            className="mt-5 space-y-3 text-left"
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              setVerifying(true)
              try {
                await verifyCode(email.trim(), code.trim())
              } catch (err) {
                setError(/expired|invalid/i.test((err as Error).message) ? 'Der Code ist ungültig oder abgelaufen.' : loginError((err as Error).message))
              } finally {
                setVerifying(false)
              }
            }}
          >
            <Field
              label="Oder Code aus der E-Mail eingeben"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="123456"
              hint="Praktisch, wenn die App auf dem Startbildschirm installiert ist."
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" block disabled={code.length < 6 || verifying}>
              {verifying ? 'Prüfe …' : 'Mit Code anmelden'}
            </Button>
          </form>
          <Button variant="ghost" className="mt-2" onClick={() => setState('idle')}>
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
      ) : supabaseConfigProblem ? (
        <div role="alert" className="rounded-3xl bg-surface p-5 text-sm ring-1 ring-line">
          <p className="font-semibold">Die Verbindung zur Datenbank ist falsch eingestellt.</p>
          <p className="mt-1">{supabaseConfigProblem}</p>
          <p className="mt-2 text-muted">
            Bei Vercel unter <strong>Environment Variables</strong> korrigieren und die App danach neu ausliefern
            (<strong>Deployments</strong> → <strong>Redeploy</strong>).
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-surface p-5 text-sm ring-1 ring-line">
          <p className="font-semibold">Supabase ist noch nicht eingerichtet.</p>
          <p className="mt-1 text-muted">
            Trage <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> ein, um
            dich per Magic Link anzumelden und deine Daten geräteübergreifend zu speichern.
          </p>
        </div>
      )}

      {state !== 'sent' && showDemo && (
        <div className="mt-8 text-center">
          <Button variant="ghost" icon={<Sparkles className="size-4" aria-hidden />} onClick={startLocalMode}>
            Ohne Konto ausprobieren
          </Button>
          <p className="mt-1 text-xs text-muted">Demo-Modus: Daten bleiben nur auf diesem Gerät.</p>
        </div>
      )}
      <p className="mt-10 text-center text-xs text-muted">
        <button type="button" onClick={() => setAboutOpen(true)} className="min-h-9 rounded-lg px-2 underline-offset-2 hover:underline">
          Über Teller · Datenschutz · Impressum
        </button>
      </p>
      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title="Über Teller" tall>
        <AboutContent demo={showDemo} />
      </Sheet>
    </main>
  )
}
