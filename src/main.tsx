import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MutationCache, QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthProvider } from './app/auth'
import { ToastProvider } from './components/ui/Toast'
import { App } from './App'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import './index.css'
import { friendlyError } from './lib/errors'

const queryClient = new QueryClient({
  // Fehler beim Speichern verständlich anzeigen (siehe ToastProvider)
  mutationCache: new MutationCache({
    onError: (error) => window.dispatchEvent(new CustomEvent('teller-error', { detail: friendlyError(error) })),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'offlineFirst' },
  },
})

// Zwischengespeicherte Daten bleiben offline lesbar
const persister = createSyncStoragePersister({ storage: window.localStorage, key: 'teller-query-cache' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
      onSuccess={() => queryClient.invalidateQueries()}
    >
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
