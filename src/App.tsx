import { useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './app/auth'
import { useProfile } from './hooks/data'
import { AppShell, NAV_ITEMS } from './components/layout/AppShell'
import { Spinner } from './components/ui/EmptyState'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { TodayPage } from './pages/TodayPage'
import { AddFoodPage } from './pages/AddFoodPage'
import { DishEditorPage } from './pages/DishEditorPage'
import { ProfilePage } from './pages/ProfilePage'

/** Bereits umgesetzte Bereiche (wächst mit jeder Phase) */
const ENABLED = new Set(['/'])

export function App() {
  const { loading, store, userId } = useAuth()
  const qc = useQueryClient()
  const prevUser = useRef(userId)

  // Beim Wechsel des Kontos den Cache leeren (vor dem Rendern), damit keine fremden Daten sichtbar sind
  if (prevUser.current !== userId) {
    prevUser.current = userId
    qc.clear()
  }

  if (loading) return <Spinner />
  if (!store) return <LoginPage />
  return <Authed key={userId} />
}

function Authed() {
  const { data: profile, isLoading, error } = useProfile()
  if (isLoading) return <Spinner />
  if (error && !profile) {
    return <p className="p-6 text-center text-danger">Profil konnte nicht geladen werden: {(error as Error).message}</p>
  }
  if (!profile?.onboarded) return <OnboardingPage existing={profile ?? null} />

  return (
    <Routes>
      <Route element={<AppShell items={NAV_ITEMS.filter((i) => ENABLED.has(i.to))} />}>
        <Route index element={<TodayPage />} />
        <Route path="profil" element={<ProfilePage />} />
      </Route>
      <Route path="hinzufuegen" element={<AddFoodPage />} />
      <Route path="gerichte/neu" element={<DishEditorPage />} />
      <Route path="gerichte/:id" element={<DishEditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
