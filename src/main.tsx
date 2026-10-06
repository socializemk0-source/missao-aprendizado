import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { AuthProvider } from './auth/AuthProvider';
import { AvisoCookies } from './components/AvisoCookies';
import { PwaNotices } from './components/PwaNotices';
import { ProgressProvider } from './game/ProgressProvider';
import { mostrarTicoNoConsole } from './lib/easter-egg';
import { iniciarMedicao } from './lib/medicao';
import { ligarPixel } from './lib/pixel';
import './lib/prefs'; // aplica tema, animações e modo foco no <html>
import { initPwa, registerServiceWorker } from './lib/pwa';
import './styles/global.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/landing.css';
import './styles/game.css';

// App instalável: avisos do navegador desde o início; o service worker só no
// site publicado (em desenvolvimento ele guardaria arquivos que mudam a toda hora).
initPwa();
if (import.meta.env.PROD) window.addEventListener('load', () => void registerServiceWorker());

// Surpresa para quem abre o F12 / "Inspecionar".
mostrarTicoNoConsole();

// Medição de marketing: origem da visita e páginas abertas (o pixel só com aceite).
const appRouter = router();
void ligarPixel();
iniciarMedicao(appRouter);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProgressProvider>
        <RouterProvider router={appRouter} />
        <PwaNotices />
        <AvisoCookies />
      </ProgressProvider>
    </AuthProvider>
  </StrictMode>,
);
