import '@testing-library/jest-dom/vitest';
import { beforeAll } from 'vitest';

// Nos testes de tela, as telas do app (carregadas sob demanda no site) já
// chegam baixadas: a tela aparece direto, sem "Carregando…".
beforeAll(async () => {
  if (typeof window === 'undefined') return;
  await import('./src/app/router');
  const { preloadPages } = await import('./src/app/lazyPage');
  await preloadPages();
});
