import type { ReactElement } from 'react';
import { createBrowserRouter, Link, type RouteObject } from 'react-router';
import { RequireAuth, FullScreenMessage } from '../auth/RequireAuth';
import { AppLayout } from '../layouts/AppLayout';
import { Cadastro } from '../pages/Cadastro';
import { Entrar } from '../pages/Entrar';
import { Landing } from '../pages/Landing';
import { Perfil } from '../pages/Perfil';
import { Planos } from '../pages/Planos';
import { Privacidade } from '../pages/Privacidade';
import { RedefinirSenha } from '../pages/RedefinirSenha';
import { Redacao, RedacaoRelatorio } from '../pages/Redacao';
import { Trilha } from '../pages/Trilha';
import { Fase, Jogos, Praticar, Revisar } from '../pages/Sessoes';
import { Aventura, Conquistas, Disciplinas, Missoes, Ranking } from '../pages/Painel';
import { NAV } from './nav';

const READY: Record<string, ReactElement> = {
  '/jogar': <Trilha />,
  '/perfil': <Perfil />,
  '/redacao': <Redacao />,
  '/planos': <Planos />,
  '/aventura': <Aventura />,
  '/missoes': <Missoes />,
  '/ranking': <Ranking />,
  '/disciplinas': <Disciplinas />,
  '/jogos': <Jogos />,
  '/revisar': <Revisar />,
  '/conquistas': <Conquistas />,
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
  { path: '/privacidade', element: <Privacidade /> },
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      ...NAV.map((item) => ({
        path: item.path,
        element: READY[item.path],
      })),
      { path: '/fase/:id', element: <Fase /> },
      { path: '/praticar/:disciplina', element: <Praticar /> },
      { path: '/redacao/:id', element: <RedacaoRelatorio /> },
    ],
  },
  { path: '*', element: <NotFound /> },
];

export const router = () => createBrowserRouter(routes);
