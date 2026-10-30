// Bettet die Bilder der Fragen (Pfade wie "bilder/netzsystem-a.svg" aus public/) als data-URL
// direkt in die Fragen ein. Gebraucht für die Offline-Einzeldatei und die Android-App,
// die ohne weitere Dateien auskommen müssen.
import { extname } from 'node:path';

const BILD_TYPEN: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function alsDataUrl(inhalt: Uint8Array, pfad: string): string {
  const typ = BILD_TYPEN[extname(pfad).toLowerCase()];
  if (!typ) throw new Error(`Bild „${pfad}“: unbekannter Dateityp (erlaubt: ${Object.keys(BILD_TYPEN).join(', ')})`);
  return `data:${typ};base64,${Buffer.from(inhalt).toString('base64')}`;
}

/**
 * Ersetzt in einer Fragen-Datei (JSON-Text) jeden Bild-Pfad durch eine data-URL.
 * leseBild bekommt den Pfad aus dem Feld „bild“ (relativ zu public/).
 */
export function bilderEinbetten(json: string, leseBild: (pfad: string) => Uint8Array): string {
  const fragen = JSON.parse(json) as { bild?: unknown }[];
  for (const frage of fragen) {
    if (typeof frage.bild === 'string' && frage.bild !== '' && !frage.bild.startsWith('data:')) {
      frage.bild = alsDataUrl(leseBild(frage.bild), frage.bild);
    }
  }
  return JSON.stringify(fragen);
}
