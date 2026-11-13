import { defineConfig, devices } from '@playwright/test'

/**
 * Zwei Test-Reihen:
 * - „demo“ (immer): App ohne Konto, Daten im Browser.
 * - „konto“ (mit E2E_KONTO=1): App mit Anmeldung gegen das Test-Backend aus e2e/backend – dahinter eine echte
 *   PostgreSQL mit allen Migrationen. Braucht psql und einen PostgreSQL-Server (PGHOST, PGUSER, PGPASSWORD).
 */
const withAccount = Boolean(process.env.E2E_KONTO)
const BACKEND = 'http://127.0.0.1:54321'

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Pixel 7'],
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    serviceWorkers: 'block',
    trace: 'off',
  },
  projects: [
    { name: 'demo', testMatch: /app\.spec\.ts/, use: { baseURL: 'http://localhost:4173' } },
    ...(withAccount ? [{ name: 'konto', testMatch: /konto\.spec\.ts/, use: { baseURL: 'http://localhost:4174' } }] : []),
  ],
  webServer: [
    {
      // Ohne Supabase-Variablen → Demo-Modus mit lokalem Speicher
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    },
    ...(withAccount
      ? [
          {
            command: 'node e2e/backend/server.mjs',
            url: `${BACKEND}/__health`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
          {
            // Eigener Build mit Anmeldung; die Adresse des Test-Backends wird beim Bauen fest eingetragen
            command: 'npx vite build --outDir dist-konto && npx vite preview --outDir dist-konto --port 4174 --strictPort',
            url: 'http://localhost:4174',
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
            env: { VITE_SUPABASE_URL: BACKEND, VITE_SUPABASE_ANON_KEY: 'e2e-anon-key' },
          },
        ]
      : []),
  ],
})
