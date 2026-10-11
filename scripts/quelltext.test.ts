// Prüft den Quelltext auf Muster, die in manchen Browsern zu einer weißen Seite führen.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function dateien(ordner: string): string[] {
  return readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? dateien(join(ordner, e.name)) : /\.tsx?$/.test(e.name) ? [join(ordner, e.name)] : [],
  );
}

describe('Quelltext', () => {
  it('Effekte ohne geschweifte Klammern geben nur Aufräum-Funktionen zurück', () => {
    // Was ein Effekt zurückgibt, ruft React beim nächsten Durchlauf als Aufräum-Funktion auf.
    // Beispiel für den Fehler: useEffect(() => window.scrollTo(0, 0), [pos]) – neuere Browser
    // liefern bei scrollTo() ein Promise, React stürzt beim Seitenwechsel ab.
    const liefertAufraeumFunktion = /^abonniere\w*\(/;
    const funde: string[] = [];
    for (const datei of dateien('src')) {
      if (datei.includes('.test.')) continue;
      for (const treffer of readFileSync(datei, 'utf8').matchAll(/use(?:Layout)?Effect\(\(\) => (?!\{)(.*)/g)) {
        if (!liefertAufraeumFunktion.test(treffer[1])) funde.push(`${datei}: ${treffer[0].trim()}`);
      }
    }
    expect(funde).toEqual([]);
  });
});
