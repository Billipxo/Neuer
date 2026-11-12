import { SectionTitle } from '../ui/Card'

const IMPRESSUM = (import.meta.env.VITE_IMPRESSUM as string | undefined)?.trim()
const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim()

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-2 rounded-3xl bg-surface p-4 text-sm leading-relaxed ring-1 ring-line/60">{children}</div>
    </section>
  )
}

/** Über die App, Datenschutz in Klartext und Impressum – gemeinsam für Profil-Seite und Anmeldeseite */
export function AboutContent({ demo }: { demo?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="px-1 text-sm text-muted">
        Teller {__APP_VERSION__} · Kalorien im Blick, ausgewogen essen, entspannt planen. Ohne Werbung, ohne Tracking, ohne versteckte
        Datenweitergabe.
      </p>

      <Block title="Was gespeichert wird – und wo">
        <p>
          <strong>Mit Konto:</strong> Profil, Mahlzeiten, Gewicht, Wasser, Rezepte, Varianten, Wochenplan und Einkaufsliste liegen in der
          Datenbank des Betreibers (Supabase, laut Einrichtung in der EU). Jede Zeile ist an dein Konto gebunden; andere Nutzerinnen und
          Nutzer sehen deine Daten nicht (Row Level Security).
        </p>
        <p>
          <strong>Auf diesem Gerät:</strong> eine Kopie deiner Daten für den Offline-Betrieb, Einstellungen wie Farbschema und Ansicht sowie
          offene Änderungen, bis wieder Netz da ist.{demo ? ' Im Demo-Modus bleibt alles ausschließlich hier.' : ''}
        </p>
        <p>
          <strong>Anmeldung:</strong> per E-Mail-Link oder Code. Es gibt kein Passwort, das verloren gehen könnte.
        </p>
      </Block>

      <Block title="Dienste von Dritten">
        <p>
          <strong>Open Food Facts</strong> liefert Produktdaten für Suche und Barcode-Scan. Dorthin geht nur der Suchbegriff bzw. der
          Barcode – keine Kontodaten. Die Produktdaten stehen unter der Open Database License; Fehler in der Datenbank kann die App nicht
          ausschließen.
        </p>
        <p>
          <strong>Kamera</strong> wird nur für den Barcode-Scan genutzt und nur, wenn du sie erlaubst. Bilder verlassen das Gerät nicht.
        </p>
        <p>Weitere Dienste, Analyse-Werkzeuge oder Werbenetzwerke gibt es nicht.</p>
      </Block>

      <Block title="Deine Kontrolle">
        <p>Unter „Profil → Deine Daten“ kannst du jederzeit alles als CSV oder JSON herunterladen.</p>
        <p>
          „Konto löschen“ entfernt dein Konto und sämtliche Daten endgültig aus der Datenbank – ohne Rückfrage per E-Mail, ohne Wartefrist.
        </p>
      </Block>

      <Block title="Nährwerte und Gesundheit">
        <p>
          Nährwerte sind gerundete Richtwerte: Rezepte werden aus einer Zutatentabelle berechnet, Produkte stammen aus Herstellerangaben oder
          Open Food Facts. Allergen-Hinweise leiten sich aus den Zutaten ab und ersetzen keine Packungsangabe.
        </p>
        <p>
          Teller ist keine Ernährungs- oder medizinische Beratung und gibt keine Diagnosen oder Empfehlungen zur Behandlung. Bei Erkrankungen,
          Schwangerschaft, Essstörungen oder Unsicherheit ist eine Fachperson die richtige Anlaufstelle.
        </p>
      </Block>

      <Block title="Impressum">
        {IMPRESSUM ? (
          <p className="whitespace-pre-line">{IMPRESSUM}</p>
        ) : (
          <p className="text-muted">
            Noch nicht hinterlegt. Der Betreiber trägt Name, Anschrift und Kontakt über die Umgebungsvariable <code>VITE_IMPRESSUM</code>{' '}
            ein (siehe Anleitung).
          </p>
        )}
        {CONTACT && (
          <p>
            Kontakt:{' '}
            <a href={`mailto:${CONTACT}`} className="font-medium text-brand">
              {CONTACT}
            </a>
          </p>
        )}
      </Block>

      <Block title="Danke an">
        <p>Open Food Facts (Produktdaten, ODbL) · Lucide (Symbole, ISC) · Twemoji-kompatible Emojis des Systems · Supabase · Vite und React.</p>
      </Block>
    </div>
  )
}
