import { Link } from 'react-router-dom';
import { Seite } from '../components/Seite';
import { ThemaKachel } from '../components/ThemaKachel';
import { useDaten } from '../db/DatenContext';
import { statusVerteilung } from '../logic/sitzung';
import { THEMEN } from '../types';

export function LernenSeite() {
  const { fragen, fortschritte } = useDaten();
  return (
    <Seite titel="Üben">
      <p className="mb-4 text-slate-600 dark:text-slate-300">
        Prüfungsfragen beantworten wie in der Fahrschul-App: Nach jeder Antwort siehst du sofort die Lösung mit Erklärung.
        Falsche Fragen kommen wieder, bis sie sitzen.
      </p>
      <ThemaKachel
        to="/lernen/alle"
        titel="Alle Themen gemischt"
        kurz="Fragen aus allen Bereichen"
        v={statusVerteilung(fragen, fortschritte)}
        gross
      />
      <Link
        to="/lernen/formeln"
        className="mt-2 flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
      >
        <span className="w-8 shrink-0 text-center text-2xl" aria-hidden>
          📐
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Formelsammlung</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            Alle Formeln für die Rechenaufgaben, ohne Rechenbeispiele
          </span>
        </span>
        <span className="text-slate-400" aria-hidden>
          ›
        </span>
      </Link>
      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Themen</h2>
      <ul className="space-y-2">
        {THEMEN.map((t) => (
          <li key={t.id}>
            <ThemaKachel
              to={`/lernen/${t.id}`}
              titel={t.titel}
              kurz={t.kurz}
              v={statusVerteilung(
                fragen.filter((f) => f.thema === t.id),
                fortschritte,
              )}
            />
          </li>
        ))}
      </ul>
    </Seite>
  );
}
