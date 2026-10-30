import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { Fehlergrenze } from './components/Fehlergrenze';
import { DatenProvider } from './db/DatenContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fehlergrenze>
      <HashRouter>
        <DatenProvider>
          <App />
        </DatenProvider>
      </HashRouter>
    </Fehlergrenze>
  </StrictMode>,
);
