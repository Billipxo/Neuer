/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Tests laufen immer in deutscher Zeitzone, damit Sommerzeit-Wechsel mitgetestet werden.
process.env.TZ = 'Europe/Berlin';

// base './' sorgt dafür, dass die App in jedem Unterordner läuft (z. B. /trei/ auf dem Webspace).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // neue Versionen erst nach Bestätigung aktivieren (Hinweis in der App)
      registerType: 'prompt',
      injectRegister: false,
      // Manifest mit Zugangsdaten laden – nötig im passwortgeschützten Ordner (.htaccess)
      useCredentials: true,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'bilder/**/*'],
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
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
