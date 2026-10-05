import type { ReactElement } from 'react';
import { createBrowserRouter, Link, type RouteObject } from 'react-router';
import { RequireAuth, FullScreenMessage } from '../auth/RequireAuth';
import { AppLayout } from '../layouts/AppLayout';
import { Cadastro } from '../pages/Cadastro';
import { Entrar } from '../pages/Entrar';
import { Landing } from '../pages/Landing';
import { Privacidade } from '../pages/Privacidade';
import { Termos } from '../pages/Termos';
import { RedefinirSenha } from '../pages/RedefinirSenha';
import { lazyPage } from './lazyPage';
import { NAV } from './nav';

// Telas do app (só com login): cada uma é baixada quando é aberta.
const Hoje = lazyPage(() => import('../pages/Hoje').then((m) => m.Hoje));
const Trilha = lazyPage(() => import('../pages/Trilha').then((m) => m.Trilha));
const Perfil = lazyPage(() => import('../pages/Perfil').then((m) => m.Perfil));
const Planos = lazyPage(() => import('../pages/Planos').then((m) => m.Planos));
const Redacao = lazyPage(() => import('../pages/Redacao').then((m) => m.Redacao));
const RedacaoRelatorio = lazyPage(() => import('../pages/Redacao').then((m) => m.RedacaoRelatorio));
const Simulados = lazyPage(() => import('../pages/Simulados').then((m) => m.Simulados));
const SimuladoTela = lazyPage(() => import('../pages/Simulados').then((m) => m.SimuladoTela));
const Fase = lazyPage(() => import('../pages/Sessoes').then((m) => m.Fase));
const Praticar = lazyPage(() => import('../pages/Sessoes').then((m) => m.Praticar));
const Revisar = lazyPage(() => import('../pages/Sessoes').then((m) => m.Revisar));
const JogosHub = lazyPage(() => import('../pages/Jogos').then((m) => m.JogosHub));
const Desafio = lazyPage(() => import('../pages/Jogos').then((m) => m.Desafio));
const JogoTela = lazyPage(() => import('../games/JogoTela').then((m) => m.JogoTela));
const Comecar = lazyPage(() => import('../pages/Comecar').then((m) => m.Comecar));
const Aventura = lazyPage(() => import('../pages/Painel').then((m) => m.Aventura));
const Conquistas = lazyPage(() => import('../pages/Painel').then((m) => m.Conquistas));
const Disciplinas = lazyPage(() => import('../pages/Painel').then((m) => m.Disciplinas));
const Missoes = lazyPage(() => import('../pages/Painel').then((m) => m.Missoes));
const Ranking = lazyPage(() => import('../pages/Painel').then((m) => m.Ranking));

const READY: Record<string, ReactElement> = {
  '/hoje': <Hoje />,
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
  { path: '/termos', element: <Termos /> },
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      ...NAV.map((item) => ({
        path: item.path,
        element: READY[item.path],
      })),
      { path: '/comecar', element: <Comecar /> },
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
