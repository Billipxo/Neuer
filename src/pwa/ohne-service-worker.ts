// Ersatz für „virtual:pwa-register“ in der Offline-Einzeldatei und der Android-App:
// Die App liegt dort schon vollständig auf dem Gerät, ein Service Worker wird nicht gebraucht
// (und funktioniert bei einer geöffneten Datei auch gar nicht).
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

export function registerSW(_optionen: RegisterSWOptions = {}): (neuLaden?: boolean) => Promise<void> {
  return async () => {};
}
