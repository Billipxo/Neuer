import { Link } from 'react-router-dom';
import { Seite } from '../components/Seite';
import { BEREICHE } from '../data/bereiche';
import { bereicheVon } from '../logic/bereiche';
import { THEMEN } from '../types';

/** Übersicht aller Erklärungen, nach Themen sortiert. */
export function ErklaerungenSeite() {
  return (
    <Seite titel="Erklärungen">
      <Link to="/lernen" className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400">
        ‹ Lernen
      </Link>
      <p className="mb-4 text-slate-600 dark:text-slate-300">
        Das Wichtigste zu jedem Themenbereich zum Nachlesen. Tippe einen Bereich an – dort kannst du ihn danach gleich
        üben.
      </p>
      {THEMEN.map((t) => {
        const bereiche = bereicheVon(BEREICHE, t.id);
        if (bereiche.length === 0) return null;
        return (
          <section key={t.id} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">{t.titel}</h2>
            <ul className="space-y-2">
              {bereiche.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/lernen/${b.thema}/${b.id}?von=erklaerungen`}
                    className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
                  >
                    <span className="w-8 shrink-0 text-center text-2xl" aria-hidden>
                      📖
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{b.titel}</span>
                      <span className="block text-sm text-slate-500 dark:text-slate-400">{b.kurz}</span>
                    </span>
                    <span className="text-slate-400" aria-hidden>
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Seite>
  );
}
