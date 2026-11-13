/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Teller – Kalorien & Wochenplan',
        short_name: 'Teller',
        description: 'Kalorien im Blick, ausgewogen essen, Wochen planen und einkaufen.',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f8f5',
        theme_color: '#f7f8f5',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Langes Drücken auf das App-Symbol (Android, Desktop): direkt zur häufigsten Aktion
        shortcuts: [
          {
            name: 'Mahlzeit eintragen',
            short_name: 'Eintragen',
            description: 'Lebensmittel zur aktuellen Mahlzeit hinzufügen',
            url: '/hinzufuegen',
            icons: [{ src: 'shortcut-add.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Barcode scannen',
            short_name: 'Scannen',
            description: 'Produkt per Barcode eintragen',
            url: '/hinzufuegen?scan=1',
            icons: [{ src: 'shortcut-scan.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Einkaufsliste',
            short_name: 'Einkauf',
            url: '/einkauf',
            icons: [{ src: 'shortcut-shopping.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Wochenplan',
            short_name: 'Planer',
            url: '/planer',
            icons: [{ src: 'shortcut-plan.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('openfoodfacts.org'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-food-facts',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('images.openfoodfacts.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'off-images',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    // Der größte Chunk enthält das Kochbuch (reine Rezeptdaten, ca. 110 kB gzip). Er wird erst beim Öffnen
    // des Kochbuchs geladen und vom Service Worker für die Offline-Nutzung vorgehalten.
    // src/startBundle.test.ts wacht darüber, dass er nicht wieder in das Start-Paket rutscht.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
