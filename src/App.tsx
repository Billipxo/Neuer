import { lazy, Suspense, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './app/auth'
import { HouseholdProvider, useHousehold } from './app/household'
import { PENDING_INVITE_KEY, normalizeInviteCode } from './lib/household'
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
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const VariantEditorPage = lazy(() => import('./pages/VariantEditorPage').then((m) => ({ default: m.VariantEditorPage })))


/** Beim Wechsel auf eine neue Seite nach oben scrollen – beim Zurückgehen bleibt die Position erhalten */
function ScrollToTop() {
  const { key } = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    if (type !== 'POP') window.scrollTo(0, 0)
  }, [key, type])
  return null
}

/** Einladungslink (/beitreten/CODE): Code merken und zum Profil, wo sich der Beitritt öffnet */
function InviteRoute() {
  const { code } = useParams()
  if (code) {
    try {
      localStorage.setItem(PENDING_INVITE_KEY, normalizeInviteCode(code))
    } catch {
      /* ohne Speicher lässt sich der Code im Profil eintippen */
    }
  }
  return <Navigate to="/profil" replace />
}

/** Wurde vor Anmeldung und Einrichtung ein Einladungslink geöffnet, geht es danach direkt zum Beitritt */
function PendingInvite() {
  const navigate = useNavigate()
  const { supported, available, loadFailed } = useHousehold()
  useEffect(() => {
    // Im Demo-Modus bleibt die Einladung gemerkt, bis ein Konto da ist (Hinweis steht im Profil)
    if (!supported || loadFailed) return
    try {
      if (!localStorage.getItem(PENDING_INVITE_KEY)) return
      // Kennt die Datenbank den Haushalt nicht, lässt sich der Einladung nicht folgen
      if (!available) localStorage.removeItem(PENDING_INVITE_KEY)
      else if (window.location.pathname !== '/profil') navigate('/profil', { replace: true })
    } catch {
      /* kein Speicher – nichts zu tun */
    }
  }, [navigate, supported, available, loadFailed])
  return null
}

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
    <HouseholdProvider>
    <Suspense fallback={<Spinner />}>
    <ScrollToTop />
    <PendingInvite />
    <AchievementWatcher />
    <TimerTray />
    <Routes>
      <Route element={<AppShell items={NAV_ITEMS} />}>
        <Route index element={<TodayPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="ueber" element={<AboutPage />} />
        <Route path="rezepte" element={<RecipesPage />} />
        <Route path="rezepte/wissen" element={<KnowledgePage />} />
        <Route path="rezepte/zutaten" element={<PantryPage />} />
        <Route path="rezepte/wissen/:id" element={<GuidePage />} />
        <Route path="einkauf" element={<ShoppingPage />} />
        <Route path="planer" element={<PlannerPage />} />
        <Route path="verlauf" element={<HistoryPage />} />
      </Route>
      <Route path="rezepte/neu" element={<VariantEditorPage />} />
      <Route path="rezepte/:id" element={<RecipeDetailPage />} />
      <Route path="rezepte/:id/kochen" element={<CookModePage />} />
      <Route path="rezepte/:id/abwandeln" element={<VariantEditorPage />} />
      <Route path="hinzufuegen" element={<AddFoodPage />} />
      <Route path="gerichte/neu" element={<DishEditorPage />} />
      <Route path="gerichte/:id" element={<DishEditorPage />} />
      <Route path="beitreten/:code" element={<InviteRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </HouseholdProvider>
  )
}
