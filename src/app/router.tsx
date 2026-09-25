import type { ReactElement } from 'react';
import { createBrowserRouter, Link, type RouteObject } from 'react-router';
import { RequireAuth, FullScreenMessage } from '../auth/RequireAuth';
import { AppLayout } from '../layouts/AppLayout';
import { Cadastro } from '../pages/Cadastro';
import { EmConstrucao } from '../pages/EmConstrucao';
import { Entrar } from '../pages/Entrar';
import { Landing } from '../pages/Landing';
import { Perfil } from '../pages/Perfil';
import { RedefinirSenha } from '../pages/RedefinirSenha';
import { Trilha } from '../pages/Trilha';
import { NAV } from './nav';

const READY: Record<string, ReactElement> = {
  '/jogar': <Trilha />,
  '/perfil': <Perfil />,
};

function NotFound() {
  return (
    <FullScreenMessage title="Página não encontrada">
      <Link to="/" className="btn btn-primary">Ir para o início</Link>
    </FullScreenMessage>
  );
}

export const routes: RouteObject[] = [
  { path: '/', element: <Landing /> },
  { path: '/entrar', element: <Entrar /> },
  { path: '/cadastro', element: <Cadastro /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: NAV.map((item) => ({
      path: item.path,
      element: READY[item.path] ?? <EmConstrucao title={item.label} readyIn={item.readyIn} />,
    })),
  },
  { path: '*', element: <NotFound /> },
];

export const router = () => createBrowserRouter(routes);
