import { Link } from 'react-router-dom';
import { Seite } from '../components/Seite';
import { BEREICHE } from '../data/bereiche';
import { useDaten } from '../db/DatenContext';

function Eintrag({ to, icon, titel, text, zahl }: { to: string; icon: string; titel: string; text: string; zahl?: number }) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-16 items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
      >
        <span className="w-8 shrink-0 text-center text-2xl" aria-hidden>
          {icon}
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{titel}</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">{text}</span>
        </span>
        {zahl !== undefined && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold dark:bg-slate-800">{zahl}</span>
        )}
        <span className="text-slate-400" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}

export function MehrSeite() {
  const { fragen, fortschritte } = useDaten();
  const zaehle = (bedingung: (id: string) => boolean) => fragen.filter((f) => bedingung(f.id)).length;
  const markiert = zaehle((id) => !!fortschritte.get(id)?.markiert);
  const gemeldet = zaehle((id) => !!fortschritte.get(id)?.fehlerMeldung);
  const notizen = zaehle((id) => !!fortschritte.get(id)?.notiz);
  const ungeprueft = fragen.filter((f) => !f.geprueft).length;

  return (
    <Seite titel="Mehr">
      <ul className="space-y-2">
        <Eintrag to="/lernen/erklaerungen" icon="📖" titel="Erklärungen" text="Das Wichtigste zu jedem Themenbereich" zahl={BEREICHE.length} />
        <Eintrag to="/lernen/formeln" icon="📐" titel="Formelsammlung" text="Alle Formeln für die Rechenaufgaben" />
        <Eintrag to="/mehr/katalog" icon="🔎" titel="Fragenkatalog" text="Alle Fragen suchen, filtern und ansehen" zahl={fragen.length} />
        <Eintrag to="/mehr/neue-frage" icon="✚" titel="Neue Frage" text="Eigene Frage aus dem Kurs anlegen" />
        <Eintrag to="/mehr/daten" icon="💾" titel="Daten & Sicherung" text="Lernstand sichern, Fragen importieren und exportieren" />
        <Eintrag to="/mehr/einstellungen" icon="⚙️" titel="Einstellungen" text="Tagesziel, Prüfungsdatum, Darstellung, Lernrunden" />
      </ul>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Fragen prüfen</h2>
      <ul className="space-y-2">
        <Eintrag to="/mehr/katalog?geprueft=nein" icon="☑️" titel="Ungeprüfte Fragen" text="Mit den Kursunterlagen abgleichen" zahl={ungeprueft} />
        <Eintrag to="/mehr/katalog?gemeldet=1" icon="⚑" titel="Gemeldete Fehler" text="Fragen, an denen du etwas gemeldet hast" zahl={gemeldet} />
        <Eintrag to="/mehr/katalog?notiz=1" icon="✎" titel="Fragen mit Notiz" text="Deine eigenen Merkhilfen" zahl={notizen} />
        <Eintrag to="/mehr/katalog?markiert=1" icon="★" titel="Markierte Fragen" text="Mit ★ markiert" zahl={markiert} />
      </ul>

      <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
        TREI-Trainer · Alle Daten bleiben auf diesem Gerät.
        <br />
        Kein Konto, kein Server, kein Tracking.
      </p>
    </Seite>
  );
}
