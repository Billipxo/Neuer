/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tests laufen immer in deutscher Zeitzone, damit Sommerzeit-Wechsel mitgetestet werden.
process.env.TZ = 'Europe/Berlin';

// base './' sorgt dafür, dass die App in jedem Unterordner läuft (z. B. /trei/ auf dem Webspace).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
