import { describe, expect, it } from 'vitest';
import { alsDataUrl, bilderEinbetten } from './bilder-einbetten';

const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');

describe('bilderEinbetten', () => {
  it('ersetzt Bild-Pfade durch data-URLs und lässt den Rest unverändert', () => {
    const gelesen: string[] = [];
    const json = JSON.stringify([
      { id: 'a', bild: 'bilder/skizze.svg', frage: 'Mit Bild' },
      { id: 'b', bild: null, frage: 'Ohne Bild' },
      { id: 'c', bild: 'data:image/png;base64,AAAA', frage: 'Schon eingebettet' },
    ]);
    const ergebnis = JSON.parse(
      bilderEinbetten(json, (pfad) => {
        gelesen.push(pfad);
        return svg;
      }),
    );
    expect(gelesen).toEqual(['bilder/skizze.svg']);
    expect(ergebnis[0].bild).toBe(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
    expect(ergebnis[0].frage).toBe('Mit Bild');
    expect(ergebnis[1].bild).toBeNull();
    expect(ergebnis[2].bild).toBe('data:image/png;base64,AAAA');
  });

  it('meldet fehlende Bilder und unbekannte Dateitypen verständlich', () => {
    const json = JSON.stringify([{ id: 'a', bild: 'bilder/fehlt.svg' }]);
    expect(() =>
      bilderEinbetten(json, () => {
        throw new Error('Datei nicht gefunden');
      }),
    ).toThrow('Datei nicht gefunden');
    expect(() => alsDataUrl(svg, 'bilder/plan.pdf')).toThrow('unbekannter Dateityp');
  });

  it('erkennt den Bildtyp an der Endung, auch in Großbuchstaben', () => {
    expect(alsDataUrl(svg, 'bilder/FOTO.JPG')).toMatch(/^data:image\/jpeg;base64,/);
    expect(alsDataUrl(svg, 'bilder/x.png')).toMatch(/^data:image\/png;base64,/);
  });
});
