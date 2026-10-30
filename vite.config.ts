/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { alsDataUrl, bilderEinbetten } from './scripts/bilder-einbetten';

// Tests laufen immer in deutscher Zeitzone, damit Sommerzeit-Wechsel mitgetestet werden.
process.env.TZ = 'Europe/Berlin';

const pfad = (relativ: string) => fileURLToPath(new URL(relativ, import.meta.url));
const lesePublic = (datei: string) => readFileSync(pfad(`./public/${datei}`));

/**
 * Offline-Einzeldatei (npm run build:offline): eine einzige HTML-Datei mit allem darin – zum
 * Öffnen per Doppelklick am PC und als Inhalt der Android-App. Ohne Service Worker; Bilder der
 * Fragen und das Favicon werden eingebettet.
 */
function einzeldateiPlugins(): PluginOption[] {
  return [
    {
      name: 'trei-fragen-bilder-einbetten',
      enforce: 'pre',
      transform(code, id) {
        if (!/[\\/]src[\\/]data[\\/]fragen[\\/][^\\/]+\.json$/.test(id.split('?')[0])) return null;
        return { code: bilderEinbetten(code, lesePublic), map: null };
      },
    },
    {
      name: 'trei-html-ohne-zusatzdateien',
      transformIndexHtml: (html) =>
        html
          .replace('href="./favicon.svg"', `href="${alsDataUrl(lesePublic('favicon.svg'), 'favicon.svg')}"`)
          .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, ''),
    },
    viteSingleFile(),
  ];
}

const pwaPlugin = () =>
  VitePWA({
    // neue Versionen erst nach Bestätigung aktivieren (Hinweis in der App)
    registerType: 'prompt',
    injectRegister: false,
    // Manifest mit Zugangsdaten laden – nötig im passwortgeschützten Ordner (.htaccess)
    useCredentials: true,
    // Icons und Bilder aus public/ erfasst schon globPatterns – nicht doppelt eintragen
    includeManifestIcons: false,
    manifest: {
      name: 'TREI-Trainer',
      short_name: 'TREI-Trainer',
      description: 'Lern-App für den TREI-Sachkundenachweis – offline, ohne Konto, Daten bleiben auf dem Gerät',
      lang: 'de',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0f172a',
      theme_color: '#0f172a',
      categories: ['education'],
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // alles für den Offline-Betrieb vorab speichern (Fragen stecken im JavaScript)
      globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,gif,ico}'], // Manifest fügt das Plugin selbst hinzu
      cleanupOutdatedCaches: true,
      navigateFallback: 'index.html',
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    },
  });

// base './' sorgt dafür, dass die App in jedem Unterordner läuft (z. B. /trei/ auf dem Webspace).
export default defineConfig(({ mode }) => {
  const einzeldatei = mode === 'einzeldatei';
  return {
    define: {
      __APP_STAND__: JSON.stringify(new Date().toISOString()),
      __EINZELDATEI__: JSON.stringify(einzeldatei),
    },
    base: './',
    plugins: [react(), tailwindcss(), ...(einzeldatei ? einzeldateiPlugins() : [pwaPlugin()])],
    ...(einzeldatei && {
      resolve: { alias: { 'virtual:pwa-register': pfad('./src/pwa/ohne-service-worker.ts') } },
      publicDir: false as const,
      build: { outDir: 'dist-offline' },
    }),
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  };
});
