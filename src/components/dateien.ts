// Datei-Helfer für den Browser: Speichern, Teilen, Einlesen. Alles bleibt lokal auf dem Gerät.

const JSON_TYP = 'application/json';

/** Bietet einen Text als Datei zum Herunterladen an. */
export function dateiHerunterladen(inhalt: string, dateiname: string, typ = JSON_TYP): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: `${typ};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Kann das Gerät Dateien über das Teilen-Menü weitergeben (z. B. in die Cloud oder per Mail)? */
export function kannDateienTeilen(): boolean {
  try {
    return (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File(['{}'], 'test.json', { type: JSON_TYP })] })
    );
  } catch {
    return false;
  }
}

/** Öffnet das Teilen-Menü. Liefert false, wenn abgebrochen wurde. */
export async function dateiTeilen(inhalt: string, dateiname: string, titel: string): Promise<boolean> {
  try {
    await navigator.share({ files: [new File([inhalt], dateiname, { type: JSON_TYP })], title: titel });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false;
    throw e;
  }
}

/** Liest eine JSON-Datei; wirft einen verständlichen Fehler bei ungültigem Inhalt. */
export async function leseJsonDatei(datei: File): Promise<unknown> {
  const text = await datei.text();
  try {
    return JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new Error('Die Datei enthält kein gültiges JSON.');
  }
}

function leseAlsDataUrl(datei: Blob): Promise<string> {
  return new Promise((ok, fehler) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fehler(r.error);
    r.readAsDataURL(datei);
  });
}

function ladeBild(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fehler) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fehler(new Error('Das Bild konnte nicht gelesen werden.'));
    img.src = src;
  });
}

/** Kleine Bilder bleiben unverändert, größere werden auf diese Kantenlänge verkleinert. */
export const BILD_MAX_KANTE = 1600;
const BILD_MAX_BYTES = 400_000;

/**
 * Liest ein Bild als data-URL für das Feld „bild“. Große Fotos werden verkleinert
 * und als JPEG gespeichert, damit die lokale Datenbank klein bleibt.
 */
export async function bildAlsDataUrl(datei: File): Promise<string> {
  if (!datei.type.startsWith('image/')) throw new Error('Bitte eine Bilddatei wählen.');
  const roh = await leseAlsDataUrl(datei);
  if (datei.type === 'image/svg+xml') return roh;
  const img = await ladeBild(roh);
  const kante = Math.max(img.naturalWidth, img.naturalHeight);
  if (datei.size <= BILD_MAX_BYTES && kante <= BILD_MAX_KANTE) return roh;
  const faktor = Math.min(1, BILD_MAX_KANTE / kante);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * faktor);
  canvas.height = Math.round(img.naturalHeight * faktor);
  const ctx = canvas.getContext('2d');
  if (!ctx) return roh;
  ctx.fillStyle = '#ffffff'; // transparente Flächen weiß statt schwarz
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
