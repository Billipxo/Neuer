import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FormelGruppeAnzeige } from '../components/Formeln';
import { Seite } from '../components/Seite';
import { FORMELN } from '../data/formeln';

const anker = (id: string) => `formeln-${id}`;

/** Die ganze Formelsammlung; ?gruppe=<id> springt direkt zu einer Gruppe. */
export function FormelnSeite() {
  const [params] = useSearchParams();
  const gruppe = params.get('gruppe');

  // Erst nach dem „nach oben“ beim Seitenwechsel (App) zur gewünschten Gruppe springen.
  useEffect(() => {
    if (!gruppe) return;
    const zeitgeber = window.setTimeout(() => document.getElementById(anker(gruppe))?.scrollIntoView(), 0);
    return () => window.clearTimeout(zeitgeber);
  }, [gruppe]);

  return (
    <Seite titel="Formelsammlung">
      <Link to="/lernen" className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400">
        ‹ Lernen
      </Link>
      <p className="mb-4 text-slate-600 dark:text-slate-300">
        Alle Formeln für die Rechenaufgaben – ohne Rechenbeispiele, so wie die Formelsammlung, die du im
        schriftlichen Teil der Prüfung benutzen darfst. Bei Aufgaben, für die du eine Formel brauchst, gibt es den Knopf
        „📐 Formeln“.
      </p>
      <nav aria-label="Formelgruppen" className="mb-6 flex flex-wrap gap-2">
        {FORMELN.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => document.getElementById(anker(g.id))?.scrollIntoView({ behavior: 'smooth' })}
            className="min-h-11 rounded-full bg-white px-4 text-sm font-medium ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-700"
          >
            {g.titel}
          </button>
        ))}
      </nav>
      {FORMELN.map((g) => (
        <section key={g.id} id={anker(g.id)} className="mb-8 scroll-mt-4">
          <h2 className="text-lg font-bold">{g.titel}</h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{g.kurz}</p>
          <FormelGruppeAnzeige gruppe={g} />
        </section>
      ))}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Stand: 2026-10. Werte und Formeln mit deinem Tabellenbuch und den Kursunterlagen abgleichen – maßgeblich sind die
        aktuellen Normen, TAB und Gesetze.
      </p>
    </Seite>
  );
}
