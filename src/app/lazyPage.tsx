// Telas do app carregadas sob demanda: cada uma vira um arquivo separado no
// build, baixado só quando a pessoa abre a tela. Quem só vê a página inicial
// não baixa o app inteiro.
import { lazy, Suspense, type ComponentType } from 'react';
import { Loading } from '../auth/RequireAuth';
import { aoFalharChunk, ehFalhaDeChunk } from '../lib/versao';

const loaders: (() => Promise<unknown>)[] = [];

export function lazyPage(load: () => Promise<ComponentType>): ComponentType {
  let Loaded: ComponentType | null = null;
  let pending: Promise<ComponentType> | null = null;
  // Arquivo da tela que não existe mais (deploy novo): recarrega 1x (src/lib/versao.ts).
  // Se não recarregar, a tela de erro aparece e um novo clique tenta de novo.
  const criar = () => lazy(() => run().then((C) => ({ default: C })));
  const run = () => (pending ??= load().then((C) => (Loaded = C), (err: unknown) => {
    pending = null;
    Lazy = criar(); // o React.lazy guarda a falha para sempre: a próxima vez começa do zero
    if (ehFalhaDeChunk(err)) aoFalharChunk();
    throw err;
  }));
  loaders.push(run);
  let Lazy = criar();
  return function Page() {
    // Já baixada (ex.: abriu antes): aparece direto, sem "Carregando…".
    if (Loaded) return <Loaded />;
    return <Suspense fallback={<Loading />}><Lazy /></Suspense>;
  };
}

// Baixa todas as telas de uma vez (usado nos testes).
export const preloadPages = () => Promise.all(loaders.map((l) => l()));
