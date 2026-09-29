import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { AuthProvider } from './auth/AuthProvider';
import { ProgressProvider } from './game/ProgressProvider';
import './styles/global.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/landing.css';
import './styles/game.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProgressProvider>
        <RouterProvider router={router()} />
      </ProgressProvider>
    </AuthProvider>
  </StrictMode>,
);
