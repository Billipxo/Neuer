import { Link } from 'react-router-dom';
import { Karte, Seite } from '../components/Seite';
import { knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { THEMEN } from '../types';

export function StartSeite() {
  const { fragen } = useDaten();
  return (
    <Seite titel="TREI-Trainer">
      <Karte>
        <p className="text-lg font-semibold">{fragen.length} Fragen geladen</p>
        <p className="text-sm text-slate-500">davon {fragen.filter((f) => f.geprueft).length} geprüft</p>
      </Karte>
      <Link to="/sitzung?thema=alle&modus=empfohlen&zurueck=/" className={knopf('primaer', 'mt-4 w-full')}>
        ▶ Weiterlernen
      </Link>
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
