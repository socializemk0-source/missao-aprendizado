// Telas do app carregadas sob demanda: cada uma vira um arquivo separado no
// build, baixado só quando a pessoa abre a tela. Quem só vê a página inicial
// não baixa o app inteiro.
import { lazy, Suspense, type ComponentType } from 'react';
import { Loading } from '../auth/RequireAuth';

const loaders: (() => Promise<unknown>)[] = [];

export function lazyPage(load: () => Promise<ComponentType>): ComponentType {
  let Loaded: ComponentType | null = null;
  let pending: Promise<ComponentType> | null = null;
  const run = () => (pending ??= load().then((C) => (Loaded = C)));
  loaders.push(run);
  const Lazy = lazy(() => run().then((C) => ({ default: C })));
  return function Page() {
    // Já baixada (ex.: abriu antes): aparece direto, sem "Carregando…".
    if (Loaded) return <Loaded />;
    return <Suspense fallback={<Loading />}><Lazy /></Suspense>;
  };
}

// Baixa todas as telas de uma vez (usado nos testes).
export const preloadPages = () => Promise.all(loaders.map((l) => l()));
