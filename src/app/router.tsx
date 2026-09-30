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
import { SimuladoTela, Simulados } from '../pages/Simulados';
import { Trilha } from '../pages/Trilha';
import { Fase, Praticar, Revisar } from '../pages/Sessoes';
import { Desafio, JogosHub } from '../pages/Jogos';
import { JogoTela } from '../games/JogoTela';
import { Aventura, Conquistas, Disciplinas, Missoes, Ranking } from '../pages/Painel';
import { NAV } from './nav';

const READY: Record<string, ReactElement> = {
  '/jogar': <Trilha />,
  '/perfil': <Perfil />,
  '/redacao': <Redacao />,
  '/simulados': <Simulados />,
  '/planos': <Planos />,
  '/aventura': <Aventura />,
  '/missoes': <Missoes />,
  '/ranking': <Ranking />,
  '/disciplinas': <Disciplinas />,
  '/jogos': <JogosHub />,
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

// Se uma tela quebrar, a pessoa vê isto em vez da página de erro do React Router.
function ErrorScreen() {
  return (
    <FullScreenMessage title="Algo deu errado nesta tela">
      <p className="muted">Seu progresso continua salvo. Recarregue a página ou volte para o início.</p>
      <div className="quiz-end-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Recarregar a página</button>
        <Link to="/" className="btn btn-secondary">Ir para o início</Link>
      </div>
    </FullScreenMessage>
  );
}

const pages: RouteObject[] = [
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
      { path: '/simulado/:id', element: <SimuladoTela /> },
      { path: '/jogos/desafio', element: <Desafio /> },
      { path: '/jogos/:slug', element: <JogoTela /> },
    ],
  },
  { path: '*', element: <NotFound /> },
];

export const routes: RouteObject[] = pages.map((r) => ({ ...r, errorElement: <ErrorScreen /> }));

export const router = () => createBrowserRouter(routes);
