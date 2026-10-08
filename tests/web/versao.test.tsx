// @vitest-environment jsdom
// App aberto de um deploy anterior (src/lib/versao.ts): falha de import
// dinâmico recarrega UMA vez (trava no sessionStorage); versão do servidor
// diferente da do bundle + falha também; sem falha, não recarrega.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lazyPage } from '../../src/app/lazyPage';
import {
  APP_VERSION, aoFalharChunk, ehFalhaDeChunk, iniciarVersao, registrarVersaoDoServidor, versaoDivergente, zerarVersaoParaTestes,
} from '../../src/lib/versao';

let recarregou = 0;
beforeEach(() => {
  sessionStorage.clear();
  recarregou = 0;
  zerarVersaoParaTestes({ recarregar: () => { recarregou++; } });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const falha = (msg: string) => new TypeError(msg);

describe('falha de import dinâmico', () => {
  it('reconhece as mensagens de Chrome, Safari, Firefox e do Vite', () => {
    for (const msg of [
      'Failed to fetch dynamically imported module: https://www.aprovatico.com.br/assets/Hoje-abc.js',
      'Importing a module script failed.',
      'error loading dynamically imported module: https://x/assets/a.js',
      'Unable to preload CSS for /assets/index-x.css',
    ]) expect([msg, ehFalhaDeChunk(falha(msg))]).toEqual([msg, true]);
    expect(ehFalhaDeChunk(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('recarrega uma vez; a segunda falha na mesma aba não recarrega (sem loop)', () => {
    expect(aoFalharChunk()).toBe(true);
    expect(aoFalharChunk()).toBe(false);
    expect(aoFalharChunk()).toBe(false);
    expect(recarregou).toBe(1);
  });

  it('sem sessionStorage (bloqueado), não recarrega', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(aoFalharChunk()).toBe(false);
    expect(recarregou).toBe(0);
  });

  it('o evento vite:preloadError recarrega e evita o erro na tela', () => {
    iniciarVersao();
    const evento = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(evento);
    expect(recarregou).toBe(1);
    expect(evento.defaultPrevented).toBe(true);
  });
});

describe('versão do bundle × versão do servidor', () => {
  it('versão diferente sem falha: não recarrega (o aluno pode estar no meio de uma questão)', () => {
    expect(APP_VERSION).toBe('bundle-1');
    registrarVersaoDoServidor('servidor-2');
    expect(versaoDivergente()).toBe(true);
    expect(recarregou).toBe(0);
  });

  it('versão diferente + falha: recarrega uma vez por versão do servidor; deploy novo libera de novo', () => {
    registrarVersaoDoServidor('servidor-2');
    expect(aoFalharChunk()).toBe(true);
    expect(aoFalharChunk()).toBe(false);
    expect(sessionStorage.getItem('aprova-tico:recarga')).toBe('versao:servidor-2');
    registrarVersaoDoServidor('servidor-3');
    expect(aoFalharChunk()).toBe(true);
    expect(recarregou).toBe(2);
  });

  it('versão igual ou "dev" não conta como divergente', () => {
    registrarVersaoDoServidor('bundle-1');
    expect(versaoDivergente()).toBe(false);
    registrarVersaoDoServidor('dev');
    expect(versaoDivergente()).toBe(false);
    registrarVersaoDoServidor(undefined);
    expect(versaoDivergente()).toBe(false);
  });
});

describe('telas sob demanda (lazyPage)', () => {
  it('arquivo da tela sumiu: recarrega 1x; se não recarregar, a próxima tentativa baixa de novo', async () => {
    let tentativas = 0;
    const Tela = lazyPage(async () => {
      tentativas++;
      if (tentativas === 1) throw falha('Failed to fetch dynamically imported module: /assets/Hoje-velho.js');
      return () => <p>Tela nova</p>;
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    class Limite extends (await import('react')).Component<{ children: React.ReactNode }, { erro: boolean }> {
      state = { erro: false };
      static getDerivedStateFromError() { return { erro: true }; }
      render() { return this.state.erro ? <p>Algo deu errado</p> : this.props.children; }
    }
    const primeira = render(<Limite><Tela /></Limite>);
    expect(await screen.findByText('Algo deu errado')).toBeInTheDocument();
    expect(recarregou).toBe(1);
    primeira.unmount();
    render(<Limite><Tela /></Limite>);
    expect(await screen.findByText('Tela nova')).toBeInTheDocument();
    expect(tentativas).toBe(2);
  });
});
