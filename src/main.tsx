import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { AuthProvider } from './auth/AuthProvider';
import { CookieBanner } from './components/CookieBanner';
import { PwaNotices } from './components/PwaNotices';
import { ProgressProvider } from './game/ProgressProvider';
import { mostrarTicoNoConsole } from './lib/easter-egg';
import { reiniciarPaginaComportamento } from './lib/comportamento';
import { iniciarMarketing } from './lib/marketing';
import { registrarVisita } from './lib/meta-pixel';
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

// Marketing (pixel da Meta e eventos): só no site publicado e SÓ depois do aceite de
// cookies (ver src/lib/consentimento.ts). Cada troca de tela conta uma visita.
const appRouter = router();
if (import.meta.env.PROD) {
  iniciarMarketing();
  appRouter.subscribe((state) => {
    registrarVisita(state.location.pathname);
    reiniciarPaginaComportamento(state.location.pathname);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProgressProvider>
        <RouterProvider router={appRouter} />
        <PwaNotices />
        <CookieBanner />
      </ProgressProvider>
    </AuthProvider>
  </StrictMode>,
);
