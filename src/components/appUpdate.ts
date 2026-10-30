// Update-Prüfung der installierten App – auch im passwortgeschützten Ordner (.htaccess).
//
// Hinter einem Passwortschutz vergisst der Browser die Anmeldung z. B. nach einem Neustart.
// Die App läuft dann weiter aus dem Offline-Speicher, aber die automatische Update-Prüfung
// des Service Workers bekommt nur „401“ – nach dem Passwort fragen darf der Browser dabei nicht.
// Eine normale Anfrage aus der Seite darf das: Darum fragt „Nach Updates suchen“ bei Bedarf
// nach den Zugangsdaten, die stille Prüfung im Hintergrund dagegen nie.

let registrierung: ServiceWorkerRegistration | undefined;
const zuhoerer = new Set<() => void>();

export function merkeRegistrierung(r: ServiceWorkerRegistration | undefined): void {
  registrierung = r;
}

/** Meldet, dass eine neue Version bereitsteht (zeigt den Hinweis „Neue Version verfügbar“). */
export function meldeNeueVersion(): void {
  zuhoerer.forEach((f) => f());
}

export function abonniereNeueVersion(f: () => void): () => void {
  zuhoerer.add(f);
  return () => zuhoerer.delete(f);
}

/** Stille Prüfung im Hintergrund – fragt nie nach dem Passwort. */
export function stillNachUpdateSchauen(): void {
  if (registrierung && navigator.onLine) registrierung.update().catch(() => {});
}

export type UpdateErgebnis = 'neu' | 'aktuell' | 'anmeldung' | 'offline' | 'fehler' | 'nicht-verfuegbar';

/** Prüfung auf Knopfdruck: fragt im geschützten Ordner bei Bedarf nach Benutzername und Passwort. */
export async function nachUpdateSuchen(): Promise<UpdateErgebnis> {
  if (!registrierung) return 'nicht-verfuegbar';
  if (!navigator.onLine) return 'offline';
  try {
    const antwort = await fetch('./sw.js', { cache: 'no-store' });
    if (antwort.status === 401) return 'anmeldung'; // Anmeldung abgebrochen oder falsch
    if (!antwort.ok) return 'fehler';
    await registrierung.update();
  } catch {
    return navigator.onLine ? 'fehler' : 'offline';
  }
  if (registrierung.waiting) {
    meldeNeueVersion(); // schon geladen, Hinweis vielleicht mit „Später“ geschlossen
    return 'neu';
  }
  // Wird gerade geladen: Sobald sie fertig ist, erscheint der Hinweis von selbst.
  return registrierung.installing ? 'neu' : 'aktuell';
}
