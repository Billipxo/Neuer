import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Seite } from './components/Seite';
import { useDaten } from './db/DatenContext';
import { StartSeite } from './pages/StartSeite';
import { KatalogSeite } from './pages/KatalogSeite';
import { LernenSeite } from './pages/LernenSeite';
import { ThemaSeite } from './pages/ThemaSeite';
import { SitzungSeite } from './pages/SitzungSeite';
import { MehrSeite } from './pages/MehrSeite';
import { FrageDetailSeite } from './pages/FrageDetailSeite';
import { EinstellungenSeite } from './pages/EinstellungenSeite';

function useTheme() {
  const { profil } = useDaten();
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const anwenden = () => {
      const dunkel = profil.theme === 'dunkel' || (profil.theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dunkel);
    };
    anwenden();
    mq.addEventListener('change', anwenden);
    return () => mq.removeEventListener('change', anwenden);
  }, [profil.theme]);
}

const Folgt = ({ titel }: { titel: string }) => (
  <Seite titel={titel}>
    <p className="text-slate-500">Kommt in einem der nächsten Schritte.</p>
  </Seite>
);

export function App() {
  useTheme();
  const { pathname } = useLocation();
  // Während einer Lernrunde braucht es die Navigation nicht – mehr Platz für die Frage.
  const mitNavigation = !pathname.startsWith('/sitzung');
  return (
    <>
      <Routes>
        <Route path="/" element={<StartSeite />} />
        <Route path="/lernen" element={<LernenSeite />} />
        <Route path="/lernen/:thema" element={<ThemaSeite />} />
        <Route path="/sitzung" element={<SitzungSeite />} />
        <Route path="/pruefung" element={<Folgt titel="Prüfungssimulation" />} />
        <Route path="/statistik" element={<Folgt titel="Statistik" />} />
        <Route path="/mehr" element={<MehrSeite />} />
        <Route path="/mehr/katalog" element={<KatalogSeite />} />
        <Route path="/mehr/frage/:id" element={<FrageDetailSeite />} />
        <Route path="/mehr/einstellungen" element={<EinstellungenSeite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {mitNavigation && <Navigation />}
    </>
  );
}
