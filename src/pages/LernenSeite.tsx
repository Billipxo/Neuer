import { Link } from 'react-router-dom';
import { Seite } from '../components/Seite';
import { AmpelLegende, Ampelbalken } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { statusVerteilung, type Verteilung } from '../logic/sitzung';
import { THEMEN } from '../types';

function ThemaKachel({ to, titel, kurz, v, gross }: { to: string; titel: string; kurz: string; v: Verteilung; gross?: boolean }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-semibold ${gross ? 'text-lg' : ''}`}>{titel}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{kurz}</p>
        </div>
        <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
          {v.gelernt}/{v.gesamt}
        </span>
      </div>
      <div className="mt-3">
        <Ampelbalken v={v} />
      </div>
      {gross && (
        <div className="mt-2">
          <AmpelLegende v={v} />
        </div>
      )}
    </Link>
  );
}

export function LernenSeite() {
  const { fragen, fortschritte } = useDaten();
  return (
    <Seite titel="Lernen">
      <ThemaKachel
        to="/lernen/alle"
        titel="Alle Themen gemischt"
        kurz="Fragen aus allen Bereichen"
        v={statusVerteilung(fragen, fortschritte)}
        gross
      />
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
