/** Zeitpunkt des Builds (ISO-Text), wird von Vite eingesetzt – zeigt, welche Version installiert ist. */
declare const __APP_STAND__: string;

/**
 * true in der Offline-Einzeldatei (Datei für den PC und Inhalt der Android-App):
 * kein Service Worker, neue Versionen kommen als neue Datei bzw. neue App.
 */
declare const __EINZELDATEI__: boolean;
