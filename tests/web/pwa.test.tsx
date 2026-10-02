// @vitest-environment jsdom
// App instalável: botão/dica de instalar, aviso sem internet e aviso de
// versão nova. O service worker só é registrado no site publicado.
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaNotices } from '../../src/components/PwaNotices';
import { applyUpdate, initPwa, registerServiceWorker, resetPwaForTests } from '../../src/lib/pwa';
import { me, renderAt, session } from './render';

const signedIn = { status: 'signedIn' as const, session, me };

// O navegador (Chrome/Android) avisa que dá para instalar.
function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn(async () => {});
  event.userChoice = Promise.resolve({ outcome });
  act(() => { window.dispatchEvent(event); });
  return event;
}

function asIphone() {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  );
}

beforeEach(() => {
  localStorage.clear();
  initPwa();
  resetPwaForTests();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('instalar o app (Perfil)', () => {
  it('Android/Chrome: botão "Instalar o app" abre o pedido do navegador', async () => {
    const user = userEvent.setup();
    renderAt('/perfil', signedIn);
    const event = offerInstall();
    expect(event.defaultPrevented).toBe(true); // o navegador não mostra a barra dele; o botão é nosso
    await user.click(await screen.findByRole('button', { name: 'Instalar o app' }));
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('O Aprova Tico já está instalado neste aparelho.')).toBeInTheDocument();
  });

  it('se a pessoa desiste, o botão continua para tentar depois', async () => {
    const user = userEvent.setup();
    renderAt('/perfil', signedIn);
    const first = offerInstall('dismissed');
    await user.click(await screen.findByRole('button', { name: 'Instalar o app' }));
    expect(first.prompt).toHaveBeenCalled();
    // O Chrome manda um pedido novo depois de uma desistência.
    offerInstall();
    expect(await screen.findByRole('button', { name: 'Instalar o app' })).toBeInTheDocument();
  });

  it('iPhone: mostra o passo a passo do Safari', async () => {
    asIphone();
    renderAt('/perfil', signedIn);
    const card = await screen.findByRole('region', { name: 'Instalar o app' });
    expect(card).toHaveTextContent('Compartilhar');
    expect(card).toHaveTextContent('Adicionar à Tela de Início');
    expect(screen.queryByRole('button', { name: 'Instalar o app' })).not.toBeInTheDocument();
  });

  it('já aberto como app instalado: avisa que está instalado', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('standalone'), addEventListener() {}, removeEventListener() {} }));
    renderAt('/perfil', signedIn);
    expect(await screen.findByText('O Aprova Tico já está instalado neste aparelho.')).toBeInTheDocument();
  });

  it('navegador sem instalação: explica onde instalar', async () => {
    renderAt('/perfil', signedIn);
    const card = await screen.findByRole('region', { name: 'Instalar o app' });
    expect(card).toHaveTextContent('Chrome');
    expect(card).toHaveTextContent('Safari');
  });
});

describe('aviso de instalar na Trilha', () => {
  it('aparece quando dá para instalar, instala e some', async () => {
    const user = userEvent.setup();
    renderAt('/jogar', signedIn);
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument();
    const event = offerInstall();
    await user.click(await screen.findByRole('button', { name: 'Instalar' }));
    expect(event.prompt).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument();
  });

  it('fechar o aviso vale para as próximas visitas', async () => {
    const user = userEvent.setup();
    renderAt('/jogar', signedIn);
    offerInstall();
    await user.click(await screen.findByRole('button', { name: 'Fechar aviso de instalar' }));
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument();
    cleanup();
    renderAt('/jogar', signedIn);
    offerInstall();
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument();
  });

  it('iPhone: leva para o passo a passo no Perfil', async () => {
    asIphone();
    renderAt('/jogar', signedIn);
    expect(await screen.findByRole('link', { name: 'Como instalar' })).toHaveAttribute('href', '/perfil#instalar');
  });

  it('só aparece na Trilha (não atrapalha as outras telas)', async () => {
    renderAt('/perfil', signedIn);
    offerInstall();
    expect(screen.queryByRole('button', { name: 'Fechar aviso de instalar' })).not.toBeInTheDocument();
  });
});

describe('sem internet e versão nova', () => {
  it('avisa quando a internet cai e some quando volta', async () => {
    render(<PwaNotices />);
    expect(screen.queryByText(/Sem internet/)).not.toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByRole('status')).toHaveTextContent('Sem internet');
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(screen.queryByText(/Sem internet/)).not.toBeInTheDocument();
  });

  it('sem suporte a service worker, o registro não faz nada e não quebra', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined });
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('versão nova esperando: "Atualizar" troca de versão e recarrega uma vez', async () => {
    const user = userEvent.setup();
    const waiting = { state: 'installed', postMessage: vi.fn(), addEventListener: vi.fn() };
    const swListeners: Record<string, () => void> = {};
    const reg = { waiting, installing: null, addEventListener: vi.fn(), update: vi.fn(async () => {}) };
    const serviceWorker = {
      controller: {}, // já existe uma versão rodando
      register: vi.fn(async () => reg),
      addEventListener: (type: string, fn: () => void) => { swListeners[type] = fn; },
    };
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { serviceWorker }));
    const reload = vi.fn();

    render(<PwaNotices />);
    await act(async () => { await registerServiceWorker(reload); });
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    await user.click(await screen.findByRole('button', { name: 'Atualizar' }));
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    swListeners.controllerchange?.();
    swListeners.controllerchange?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('primeira visita (sem versão rodando): não mostra "Atualizar" nem recarrega', async () => {
    const swListeners: Record<string, () => void> = {};
    const reg = { waiting: null, installing: null, addEventListener: vi.fn(), update: vi.fn(async () => {}) };
    const serviceWorker = {
      controller: null,
      register: vi.fn(async () => reg),
      addEventListener: (type: string, fn: () => void) => { swListeners[type] = fn; },
    };
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { serviceWorker }));
    const reload = vi.fn();
    render(<PwaNotices />);
    await act(async () => { await registerServiceWorker(reload); });
    swListeners.controllerchange?.(); // o service worker novo assume a página
    expect(reload).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument();
    applyUpdate(); // sem versão esperando: não faz nada
  });
});
