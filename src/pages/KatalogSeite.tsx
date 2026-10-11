import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TYP_TEXT, themaTitel } from '../components/FrageTeile';
import { Seite } from '../components/Seite';
import { Chip, STATUS_INFO, StatusPunkt, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import {
  LEERER_FILTER,
  LERN_STATUS,
  anzahlAktiverFilter,
  filterAusParams,
  filterZuParams,
  filtereFragen,
  type KatalogFilter,
} from '../logic/katalog';
import { mischen } from '../logic/sitzung';
import { FRAGE_TYPEN, THEMEN, type ThemaId } from '../types';

/** Höchstzahl Fragen, wenn man die Treffer als Lernrunde startet */
const MAX_TREFFER_LERNEN = 100;

const alsUrl = (f: KatalogFilter) => filterZuParams(f).toString();

export function KatalogSeite() {
  const { fragen, fortschritte } = useDaten();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // Der Filter lebt im React-Zustand: schnelle Änderungen hintereinander bauen sauber aufeinander auf.
  // In die URL wird er nur gespiegelt, damit „Zurück“ aus der Detailansicht ihn wiederherstellt.
  const [filter, setFilter] = useState<KatalogFilter>(() => filterAusParams(params));
  /**
   * Von uns geschriebene URL-Zustände, die der Router noch nicht alle gemeldet hat. Er meldet
   * sie verzögert, bei schnellen Änderungen also kurz noch einen älteren Stand – der ist kein
   * Wechsel „von außen“ und darf den Filter nicht zurückdrehen.
   */
  const unterwegs = useRef(new Set<string>());
  const zuletztGeschrieben = useRef(alsUrl(filter));
  const [filterOffen, setFilterOffen] = useState(anzahlAktiverFilter(filter) > 0);
  const aktiv = anzahlAktiverFilter(filter);

  const setze = (aenderung: Partial<KatalogFilter>) => setFilter((alt) => ({ ...alt, ...aenderung }));

  // Filter → URL
  useEffect(() => {
    const ziel = alsUrl(filter);
    if (ziel === zuletztGeschrieben.current) return;
    zuletztGeschrieben.current = ziel;
    unterwegs.current.add(ziel);
    setParams(new URLSearchParams(ziel), { replace: true });
  }, [filter]); // nur bei Filteränderungen schreiben

  // URL von außen geändert (z. B. Link oder Adresszeile) → Filter übernehmen
  useEffect(() => {
    const ist = alsUrl(filterAusParams(params)); // vereinheitlicht, z. B. andere Reihenfolge
    if (ist === zuletztGeschrieben.current) {
      unterwegs.current.clear(); // Router ist auf dem neuesten Stand
      return;
    }
    if (unterwegs.current.has(ist)) return; // älterer eigener Stand, Router hinkt hinterher
    unterwegs.current.clear();
    zuletztGeschrieben.current = ist;
    setFilter(filterAusParams(params));
  }, [params]);

  const treffer = useMemo(() => filtereFragen(fragen, fortschritte, filter), [fragen, fortschritte, filter]);

  const trefferLernen = () => {
    const ids = mischen(treffer.map((f) => f.id)).slice(0, MAX_TREFFER_LERNEN);
    const query = alsUrl(filter);
    const zurueck = `/mehr/katalog${query ? `?${query}` : ''}`;
    navigate(`/sitzung?${new URLSearchParams({ ids: ids.join(','), zurueck })}`);
  };

  return (
    <Seite titel="Fragenkatalog">
      <div className="-mt-2 mb-3 flex items-center justify-between">
        <Link to="/mehr" className="text-sm text-slate-500 dark:text-slate-400">
          ‹ Mehr
        </Link>
        <Link
          to={`/mehr/neue-frage${filter.thema !== 'alle' ? `?thema=${filter.thema}` : ''}`}
          className="rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-slate-300 dark:ring-slate-700"
        >
          ✚ Neue Frage
        </Link>
      </div>
      <div className="flex gap-2">
        <input
          type="search"
          value={filter.suche}
          onChange={(e) => setze({ suche: e.target.value })}
          placeholder="Suchen, z. B. „RCD 30 mA“"
          aria-label="Volltextsuche"
          className="min-h-12 w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 text-base dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={() => setFilterOffen((o) => !o)}
          aria-expanded={filterOffen}
          className={`min-h-12 shrink-0 rounded-2xl px-4 font-medium ring-1 ${
            aktiv
              ? 'bg-slate-900 text-white ring-slate-900 dark:bg-marke-400 dark:text-slate-900 dark:ring-marke-400'
              : 'bg-white ring-slate-300 dark:bg-slate-900 dark:ring-slate-700'
          }`}
        >
          Filter{aktiv ? ` (${aktiv})` : ''}
        </button>
      </div>

      {filterOffen && (
        <div className="mt-3 space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Thema</span>
            <select
              value={filter.thema}
              onChange={(e) => setze({ thema: e.target.value as ThemaId | 'alle' })}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="alle">Alle Themen</option>
              {THEMEN.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titel}
                </option>
              ))}
            </select>
          </label>

          <FilterGruppe titel="Fragetyp">
            <Chip aktiv={filter.typ === 'alle'} onClick={() => setze({ typ: 'alle' })}>
              Alle
            </Chip>
            {FRAGE_TYPEN.map((t) => (
              <Chip key={t} aktiv={filter.typ === t} onClick={() => setze({ typ: t })}>
                {TYP_TEXT[t]}
              </Chip>
            ))}
          </FilterGruppe>

          <FilterGruppe titel="Lernstatus">
            <Chip aktiv={filter.status === 'alle'} onClick={() => setze({ status: 'alle' })}>
              Alle
            </Chip>
            {LERN_STATUS.map((s) => (
              <Chip key={s} aktiv={filter.status === s} onClick={() => setze({ status: s })}>
                <StatusPunkt status={s} mitText={false} />
                {STATUS_INFO[s].text}
              </Chip>
            ))}
          </FilterGruppe>

          <FilterGruppe titel="Geprüft">
            <Chip aktiv={filter.geprueft === 'alle'} onClick={() => setze({ geprueft: 'alle' })}>
              Alle
            </Chip>
            <Chip aktiv={filter.geprueft === 'ja'} onClick={() => setze({ geprueft: 'ja' })}>
              ✔ geprüft
            </Chip>
            <Chip aktiv={filter.geprueft === 'nein'} onClick={() => setze({ geprueft: 'nein' })}>
              ungeprüft
            </Chip>
          </FilterGruppe>

          <FilterGruppe titel="Nur …">
            <Chip aktiv={filter.markiert} onClick={() => setze({ markiert: !filter.markiert })}>
              ★ markierte
            </Chip>
            <Chip aktiv={filter.gemeldet} onClick={() => setze({ gemeldet: !filter.gemeldet })}>
              ⚑ gemeldete
            </Chip>
            <Chip aktiv={filter.mitNotiz} onClick={() => setze({ mitNotiz: !filter.mitNotiz })}>
              ✎ mit Notiz
            </Chip>
          </FilterGruppe>

          {aktiv > 0 && (
            <button
              type="button"
              className="text-sm font-medium text-slate-600 underline dark:text-slate-300"
              onClick={() => setFilter((alt) => ({ ...LEERER_FILTER, suche: alt.suche }))}
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      <div className="mt-4 mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {treffer.length} {treffer.length === 1 ? 'Frage' : 'Fragen'}
        </p>
        {treffer.length > 0 && (
          <button type="button" className={knopf('sekundaer', '', 'klein')} onClick={trefferLernen}>
            ▶ {treffer.length > MAX_TREFFER_LERNEN ? `${MAX_TREFFER_LERNEN} davon` : 'Diese'} lernen
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {treffer.map((f) => {
          const fp = fortschritte.get(f.id);
          return (
            <li key={f.id}>
              <Link
                to={`/mehr/frage/${encodeURIComponent(f.id)}`}
                className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <StatusPunkt status={fp?.status ?? 'neu'} mitText={false} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{themaTitel(f.thema)}</span>
                  <span>· {TYP_TEXT[f.typ]}</span>
                  {fp?.markiert && <span className="text-marke-500" title="markiert">★</span>}
                  {fp?.fehlerMeldung && <span className="text-red-500" title="Fehler gemeldet">⚑</span>}
                  {fp?.notiz && <span title="mit Notiz">✎</span>}
                  <span className={f.geprueft ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}>
                    {f.geprueft ? '✔ geprüft' : 'ungeprüft'}
                  </span>
                </div>
                <p className="line-clamp-3 leading-snug">{f.frage}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      {treffer.length === 0 && (
        <p className="mt-8 text-center text-slate-500 dark:text-slate-400">Keine Fragen gefunden.</p>
      )}
    </Seite>
  );
}

function FilterGruppe({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{titel}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}
