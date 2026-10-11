import { Link } from 'react-router-dom';
import { Karte, Seite } from '../components/Seite';
import { knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { waehleFragen, type LernModus } from '../logic/sitzung';
import { THEMEN } from '../types';

export function StartSeite() {
  const { fragen, fortschritte, profil } = useDaten();
  const anzahl = (modus: LernModus) =>
    waehleFragen(fragen, fortschritte, { thema: 'alle', modus, nurGeprueft: profil.nurGeprueft }).length;
  const falsch = anzahl('falsch');
  const faellig = anzahl('faellig');
  return (
    <Seite titel="TREI-Trainer">
      <Karte>
        <p className="text-lg font-semibold">{fragen.length} Fragen geladen</p>
        <p className="text-sm text-slate-500">davon {fragen.filter((f) => f.geprueft).length} geprüft</p>
      </Karte>
      <Link to="/sitzung?thema=alle&modus=empfohlen&zurueck=/" className={knopf('primaer', 'mt-4 w-full')}>
        ▶ Weiterlernen
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <SchnellStart to="/sitzung?thema=alle&modus=falsch&zurueck=/" icon="🔁" titel="Fehler wiederholen" zahl={falsch} />
        <SchnellStart to="/sitzung?thema=alle&modus=faellig&zurueck=/" icon="⏰" titel="Fällig" zahl={faellig} />
      </div>
      <ul className="mt-4 space-y-2">
        {THEMEN.map((t) => (
          <li key={t.id}>
            <Karte className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{t.titel}</p>
                <p className="text-xs text-slate-500">{t.kurz}</p>
              </div>
              <span className="text-sm text-slate-500">{fragen.filter((f) => f.thema === t.id).length}</span>
            </Karte>
          </li>
        ))}
      </ul>
    </Seite>
  );
}

function SchnellStart({ to, icon, titel, zahl }: { to: string; icon: string; titel: string; zahl: number }) {
  const inhalt = (
    <>
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="text-2xl font-bold tabular-nums">{zahl}</span>
      <span className="text-sm font-medium">{titel}</span>
    </>
  );
  const klassen =
    'flex min-h-24 flex-col items-start justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800';
  return zahl > 0 ? (
    <Link to={to} className={`${klassen} active:scale-[0.98]`}>
      {inhalt}
    </Link>
  ) : (
    <div className={`${klassen} opacity-50`} aria-disabled>
      {inhalt}
    </div>
  );
}
