import type { Frage, GespeicherteFrage } from '../types';

/** Vergleicht die fachlichen Inhalte zweier Fragen (ohne Herkunfts-Metadaten). */
export function gleicherInhalt(a: Frage, b: Frage): boolean {
  const felder: (keyof Frage)[] = [
    'thema', 'typ', 'frage', 'antworten', 'richtig', 'erklaerung', 'quelle',
    'schwierigkeit', 'bild', 'geprueft', 'stand', 'unterthema',
  ];
  return felder.every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));
}

/**
 * Ermittelt, welche mitgelieferten Fragen in die lokale Datenbank geschrieben werden müssen:
 * - neue IDs werden übernommen (außer der Nutzer hat sie gelöscht),
 * - unveränderte mitgelieferte Fragen werden aktualisiert, wenn sich die Datei geändert hat,
 * - in der App bearbeitete oder eigene Fragen werden nie überschrieben.
 */
export function abzugleichendeFragen(
  dateien: Frage[],
  vorhanden: Map<string, GespeicherteFrage>,
  geloescht: Set<string>,
): GespeicherteFrage[] {
  const ergebnis: GespeicherteFrage[] = [];
  for (const f of dateien) {
    if (geloescht.has(f.id)) continue;
    const alt = vorhanden.get(f.id);
    if (!alt) {
      ergebnis.push({ ...f, herkunft: 'mitgeliefert', bearbeitet: false });
    } else if (alt.herkunft === 'mitgeliefert' && !alt.bearbeitet && !gleicherInhalt(alt, f)) {
      ergebnis.push({ ...f, herkunft: 'mitgeliefert', bearbeitet: false });
    }
  }
  return ergebnis;
}
