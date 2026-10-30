import { Link } from 'react-router-dom';
import { Karte, Seite } from '../components/Seite';
import { Meter, knopf } from '../components/ui';
import { BEREICHE } from '../data/bereiche';
import { useDaten } from '../db/DatenContext';
import { bereicheVon } from '../logic/bereiche';
import { lektionsUmfang, naechsteLektion } from '../logic/lektion';
import { THEMEN } from '../types';

/** Erklärmodus: alle Lektionen nach Themen, mit Stand und „Weiter mit …“. */
export function ErklaerenSeite() {
  const { profil } = useDaten();
  const fertig = BEREICHE.filter((b) => profil.lektionen[b.id]).length;
  const naechste = naechsteLektion(BEREICHE, profil.lektionen);

  return (
    <Seite titel="Erklären">
      <p className="mb-4 text-slate-600 dark:text-slate-300">
        Jeder Themenbereich als kurze Lektion: erst lesen, dann Verständnisfragen beantworten. So verstehst du den Stoff,
        bevor du ihn übst.
      </p>

      <Karte>
        <p className="font-semibold">
          {fertig} von {BEREICHE.length} Lektionen abgeschlossen
        </p>
        <div className="mt-2">
          <Meter anteil={fertig / BEREICHE.length} label="Abgeschlossene Lektionen" />
        </div>
        {naechste ? (
          <Link to={`/erklaeren/${naechste.id}`} className={knopf('primaer', 'mt-4 w-full py-3 text-center')}>
            ▶ {fertig === 0 ? 'Erste Lektion' : 'Weiter mit'}: {naechste.titel}
          </Link>
        ) : (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">🎉 Alle Lektionen geschafft – wiederhole sie, wann immer du willst.</p>
        )}
      </Karte>

      <Link
        to="/lernen/formeln"
        className="mt-2 flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
      >
        <span className="w-8 shrink-0 text-center text-2xl" aria-hidden>
          📐
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Formelsammlung</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">Alle Formeln für die Rechenaufgaben zum Nachschlagen</span>
        </span>
        <span className="text-slate-400" aria-hidden>
          ›
        </span>
      </Link>

      {THEMEN.map((t) => {
        const bereiche = bereicheVon(BEREICHE, t.id);
        if (bereiche.length === 0) return null;
        const fertigImThema = bereiche.filter((b) => profil.lektionen[b.id]).length;
        return (
          <section key={t.id} className="mt-6">
            <h2 className="mb-2 flex justify-between text-sm font-semibold tracking-wide text-slate-500 uppercase">
              <span>{t.titel}</span>
              <span className="font-normal normal-case">
                {fertigImThema}/{bereiche.length}
              </span>
            </h2>
            <ul className="space-y-2">
              {bereiche.map((b) => {
                const stand = profil.lektionen[b.id];
                const umfang = lektionsUmfang(b);
                return (
                  <li key={b.id}>
                    <Link
                      to={`/erklaeren/${b.id}`}
                      className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
                    >
                      <span className="w-8 shrink-0 text-center text-2xl" aria-hidden>
                        {stand ? '✅' : '📖'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{b.titel}</span>
                        <span className="block text-sm text-slate-500 dark:text-slate-400">
                          {umfang.seiten} Seiten · {umfang.fragen} Fragen
                          {stand && ` · zuletzt ${stand.richtig}/${stand.gesamt} richtig`}
                        </span>
                      </span>
                      <span className="text-slate-400" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Seite>
  );
}
