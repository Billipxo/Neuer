// Brücke zur Android-App (android/src/de/treitrainer/app/MainActivity.java).
// Dort stellt die WebView das Objekt window.TreiAndroid bereit – im Browser gibt es es nicht.

export interface TreiAndroidBruecke {
  /** Öffnet „Speichern unter“ und speichert den Text; das Ergebnis kommt als Ereignis „trei-gespeichert“. */
  speichern(dateiname: string, inhalt: string, mimeTyp: string): void;
  /** Ist das Handy auf dunkles Design gestellt? Änderungen kommen als Ereignis „trei-dunkel“. */
  istDunkel(): boolean;
}

declare global {
  interface Window {
    TreiAndroid?: TreiAndroidBruecke;
  }
}

/** Speichert eine Datei über die Android-App. Liefert false, wenn abgebrochen wurde oder es nicht geklappt hat. */
export function androidSpeichern(
  bruecke: TreiAndroidBruecke,
  inhalt: string,
  dateiname: string,
  mimeTyp: string,
): Promise<boolean> {
  return new Promise((fertig) => {
    const ergebnis = (e: Event) => {
      window.removeEventListener('trei-gespeichert', ergebnis);
      fertig((e as CustomEvent<{ ok?: boolean }>).detail?.ok === true);
    };
    window.addEventListener('trei-gespeichert', ergebnis);
    bruecke.speichern(dateiname, inhalt, mimeTyp);
  });
}
