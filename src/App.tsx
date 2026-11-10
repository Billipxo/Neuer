import { lazy, Suspense, useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './app/auth'
import { useProfile } from './hooks/data'
import { AppShell, NAV_ITEMS } from './components/layout/AppShell'
import { Spinner } from './components/ui/EmptyState'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { TodayPage } from './pages/TodayPage'
import { AchievementWatcher } from './components/achievements/AchievementWatcher'
import { TimerTray } from './components/cooking/TimerTray'

const AddFoodPage = lazy(() => import('./pages/AddFoodPage').then((m) => ({ default: m.AddFoodPage })))
const DishEditorPage = lazy(() => import('./pages/DishEditorPage').then((m) => ({ default: m.DishEditorPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const RecipesPage = lazy(() => import('./pages/RecipesPage').then((m) => ({ default: m.RecipesPage })))
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage').then((m) => ({ default: m.RecipeDetailPage })))
const ShoppingPage = lazy(() => import('./pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })))
const PlannerPage = lazy(() => import('./pages/PlannerPage').then((m) => ({ default: m.PlannerPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const PantryPage = lazy(() => import('./pages/PantryPage').then((m) => ({ default: m.PantryPage })))
const KnowledgePage = lazy(() => import('./pages/KnowledgePage').then((m) => ({ default: m.KnowledgePage })))
const GuidePage = lazy(() => import('./pages/GuidePage').then((m) => ({ default: m.GuidePage })))
const CookModePage = lazy(() => import('./pages/CookModePage').then((m) => ({ default: m.CookModePage })))


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
    <Suspense fallback={<Spinner />}>
    <AchievementWatcher />
    <TimerTray />
    <Routes>
      <Route element={<AppShell items={NAV_ITEMS} />}>
        <Route index element={<TodayPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="rezepte" element={<RecipesPage />} />
        <Route path="rezepte/wissen" element={<KnowledgePage />} />
        <Route path="rezepte/zutaten" element={<PantryPage />} />
        <Route path="rezepte/wissen/:id" element={<GuidePage />} />
        <Route path="einkauf" element={<ShoppingPage />} />
        <Route path="planer" element={<PlannerPage />} />
        <Route path="verlauf" element={<HistoryPage />} />
      </Route>
      <Route path="rezepte/:id" element={<RecipeDetailPage />} />
      <Route path="rezepte/:id/kochen" element={<CookModePage />} />
      <Route path="hinzufuegen" element={<AddFoodPage />} />
      <Route path="gerichte/neu" element={<DishEditorPage />} />
      <Route path="gerichte/:id" element={<DishEditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
