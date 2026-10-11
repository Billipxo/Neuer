import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Seite } from './components/Seite';
import { useDaten } from './db/DatenContext';
import { StartSeite } from './pages/StartSeite';
import { KatalogSeite } from './pages/KatalogSeite';

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
  return (
    <>
      <Routes>
        <Route path="/" element={<StartSeite />} />
        <Route path="/lernen" element={<Folgt titel="Lernen" />} />
        <Route path="/pruefung" element={<Folgt titel="Prüfungssimulation" />} />
        <Route path="/statistik" element={<Folgt titel="Statistik" />} />
        <Route path="/mehr" element={<KatalogSeite />} />
      </Routes>
      <Navigation />
    </>
  );
}
