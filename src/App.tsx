import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { useDaten } from './db/DatenContext';
import { StartSeite } from './pages/StartSeite';
import { KatalogSeite } from './pages/KatalogSeite';
import { LernenSeite } from './pages/LernenSeite';
import { ThemaSeite } from './pages/ThemaSeite';
import { BereichSeite } from './pages/BereichSeite';
import { ErklaerungenSeite } from './pages/ErklaerungenSeite';
import { FormelnSeite } from './pages/FormelnSeite';
import { SitzungSeite } from './pages/SitzungSeite';
import { MehrSeite } from './pages/MehrSeite';
import { FrageDetailSeite } from './pages/FrageDetailSeite';
import { EinstellungenSeite } from './pages/EinstellungenSeite';
import { StatistikSeite } from './pages/StatistikSeite';
import { PruefungSeite } from './pages/PruefungSeite';
import { SimulationSeite } from './pages/SimulationSeite';
import { SimulationErgebnisSeite } from './pages/SimulationErgebnisSeite';
import { FrageEditorSeite } from './pages/FrageEditorSeite';
import { DatenSeite } from './pages/DatenSeite';
import { Hinweise, LevelAufstieg } from './components/Feier';
import { UpdateHinweis } from './components/UpdateHinweis';

function useTheme() {
  const { profil } = useDaten();
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    // In der Android-App meldet das Handy selbst, ob es auf dunkles Design gestellt ist.
    const systemDunkel = () => window.TreiAndroid?.istDunkel() ?? mq.matches;
    const anwenden = () => {
      const dunkel = profil.theme === 'dunkel' || (profil.theme === 'system' && systemDunkel());
      document.documentElement.classList.toggle('dark', dunkel);
    };
    anwenden();
    mq.addEventListener('change', anwenden);
    window.addEventListener('trei-dunkel', anwenden);
    return () => {
      mq.removeEventListener('change', anwenden);
      window.removeEventListener('trei-dunkel', anwenden);
    };
  }, [profil.theme]);
}

/** Eine neu geöffnete Seite beginnt oben; bei „Zurück“ stellt der Browser die alte Position wieder her. */
function useNachObenBeiSeitenwechsel(pathname: string) {
  const art = useNavigationType();
  const vorher = useRef(pathname);
  useEffect(() => {
    if (vorher.current !== pathname && art !== 'POP') window.scrollTo(0, 0);
    vorher.current = pathname;
  }, [pathname, art]);
}

export function App() {
  useTheme();
  const { pathname } = useLocation();
  useNachObenBeiSeitenwechsel(pathname);
  // Während einer Lernrunde oder Prüfung braucht es die Navigation nicht – mehr Platz für die Frage.
  const mitNavigation =
    !pathname.startsWith('/sitzung') &&
    pathname !== '/pruefung/laeuft' &&
    pathname !== '/mehr/neue-frage' &&
    !pathname.endsWith('/bearbeiten');
  return (
    <>
      <Routes>
        <Route path="/" element={<StartSeite />} />
        <Route path="/lernen" element={<LernenSeite />} />
        <Route path="/lernen/erklaerungen" element={<ErklaerungenSeite />} />
        <Route path="/lernen/formeln" element={<FormelnSeite />} />
        <Route path="/lernen/:thema" element={<ThemaSeite />} />
        <Route path="/lernen/:thema/:bereich" element={<BereichSeite />} />
        <Route path="/sitzung" element={<SitzungSeite />} />
        <Route path="/pruefung" element={<PruefungSeite />} />
        <Route path="/pruefung/laeuft" element={<SimulationSeite />} />
        <Route path="/pruefung/ergebnis/:id" element={<SimulationErgebnisSeite />} />
        <Route path="/statistik" element={<StatistikSeite />} />
        <Route path="/mehr" element={<MehrSeite />} />
        <Route path="/mehr/katalog" element={<KatalogSeite />} />
        <Route path="/mehr/frage/:id" element={<FrageDetailSeite />} />
        <Route path="/mehr/frage/:id/bearbeiten" element={<FrageEditorSeite />} />
        <Route path="/mehr/neue-frage" element={<FrageEditorSeite />} />
        <Route path="/mehr/daten" element={<DatenSeite />} />
        <Route path="/mehr/einstellungen" element={<EinstellungenSeite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {mitNavigation && <Navigation />}
      <Hinweise />
      <LevelAufstieg />
      <UpdateHinweis />
    </>
  );
}
