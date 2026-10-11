import { useMemo, useState } from 'react';
import { Karte, Seite } from '../components/Seite';
import { useDaten } from '../db/DatenContext';
import { THEMEN } from '../types';

const TYP_TEXT = { einfach: 'Einfach', mehrfach: 'Mehrfach', rechnen: 'Rechnen', karte: 'Karteikarte' } as const;

export function KatalogSeite() {
  const { fragen } = useDaten();
  const [suche, setSuche] = useState('');
  const treffer = useMemo(() => {
    const s = suche.trim().toLowerCase();
    if (!s) return fragen;
    return fragen.filter((f) =>
      [f.id, f.frage, f.erklaerung, f.quelle, f.unterthema ?? '', THEMEN.find((t) => t.id === f.thema)?.titel ?? '', ...f.antworten, typeof f.richtig === 'string' ? f.richtig : '']
        .join(' ')
        .toLowerCase()
        .includes(s),
    );
  }, [fragen, suche]);

  return (
    <Seite titel="Fragenkatalog">
      <input
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder="Volltextsuche …"
        className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base dark:border-slate-700 dark:bg-slate-900"
      />
      <p className="mb-2 text-sm text-slate-500">{treffer.length} Treffer</p>
      <ul className="space-y-2">
        {treffer.map((f) => (
          <li key={f.id}>
            <Karte>
              <div className="mb-1 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{THEMEN.find((t) => t.id === f.thema)?.titel}</span>
                <span>· {TYP_TEXT[f.typ]}</span>
                <span>· {'★'.repeat(f.schwierigkeit)}</span>
                <span className={f.geprueft ? 'text-green-600' : 'text-amber-600'}>
                  · {f.geprueft ? 'geprüft' : 'ungeprüft'}
                </span>
              </div>
              <p>{f.frage}</p>
            </Karte>
          </li>
        ))}
      </ul>
    </Seite>
  );
}
