import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { useDaten } from './db/DatenContext';
import { StartSeite } from './pages/StartSeite';
import { KatalogSeite } from './pages/KatalogSeite';
import { LernenSeite } from './pages/LernenSeite';
import { ThemaSeite } from './pages/ThemaSeite';
import { SitzungSeite } from './pages/SitzungSeite';
import { MehrSeite } from './pages/MehrSeite';
import { FrageDetailSeite } from './pages/FrageDetailSeite';
import { EinstellungenSeite } from './pages/EinstellungenSeite';
import { StatistikSeite } from './pages/StatistikSeite';
import { PruefungSeite } from './pages/PruefungSeite';
import { SimulationSeite } from './pages/SimulationSeite';
import { SimulationErgebnisSeite } from './pages/SimulationErgebnisSeite';
import { Hinweise, LevelAufstieg } from './components/Feier';

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

export function App() {
  useTheme();
  const { pathname } = useLocation();
  // Während einer Lernrunde oder Prüfung braucht es die Navigation nicht – mehr Platz für die Frage.
  const mitNavigation = !pathname.startsWith('/sitzung') && pathname !== '/pruefung/laeuft';
  return (
    <>
      <Routes>
        <Route path="/" element={<StartSeite />} />
        <Route path="/lernen" element={<LernenSeite />} />
        <Route path="/lernen/:thema" element={<ThemaSeite />} />
        <Route path="/sitzung" element={<SitzungSeite />} />
        <Route path="/pruefung" element={<PruefungSeite />} />
        <Route path="/pruefung/laeuft" element={<SimulationSeite />} />
        <Route path="/pruefung/ergebnis/:id" element={<SimulationErgebnisSeite />} />
        <Route path="/statistik" element={<StatistikSeite />} />
        <Route path="/mehr" element={<MehrSeite />} />
        <Route path="/mehr/katalog" element={<KatalogSeite />} />
        <Route path="/mehr/frage/:id" element={<FrageDetailSeite />} />
        <Route path="/mehr/einstellungen" element={<EinstellungenSeite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {mitNavigation && <Navigation />}
      <Hinweise />
      <LevelAufstieg />
    </>
  );
}
