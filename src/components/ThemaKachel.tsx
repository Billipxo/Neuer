import { Link } from 'react-router-dom';
import type { Verteilung } from '../logic/sitzung';
import { AmpelLegende, Ampelbalken } from './ui';

/** Kachel für ein Thema oder einen Themenbereich: Titel, Kurzbeschreibung, Lernstand als Ampelbalken. */
export function ThemaKachel({ to, titel, kurz, v, gross }: { to: string; titel: string; kurz: string; v: Verteilung; gross?: boolean }) {
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
