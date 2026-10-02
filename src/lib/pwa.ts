// App instalável (PWA): pedido de instalação, internet caiu/voltou e versão
// nova do app. O service worker (public/sw.js) só é registrado no site
// publicado; sem suporte no navegador, o site funciona normalmente.

import { useSyncExternalStore } from 'react';

// Evento do Chrome/Edge/Android que permite mostrar o pedido de instalação.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installEvent: InstallPromptEvent | null = null;
let installed = false;
let online = true;
let waiting: ServiceWorker | null = null;
let updateRequested = false;
let reloading = false;
let started = false;
let version = 0;
const listeners = new Set<() => void>();

function changed() {
  version++;
  for (const l of listeners) l();
}

// Liga os avisos do navegador. Chamar uma vez, antes de desenhar o app
// (o pedido de instalação pode chegar logo no início).
export function initPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  online = globalThis.navigator?.onLine ?? true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // o botão é nosso (Perfil e aviso na Trilha)
    installEvent = e as InstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    installed = true;
    changed();
  });
  window.addEventListener('online', () => { online = true; changed(); });
  window.addEventListener('offline', () => { online = false; changed(); });
}

// Aberto como app instalado (sem a barra do navegador)?
export function isStandalone(): boolean {
  const mm = typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia('(display-mode: standalone)') : null;
  const nav = globalThis.navigator as (Navigator & { standalone?: boolean }) | undefined;
  return Boolean(mm?.matches) || nav?.standalone === true;
}

// iPhone/iPad: não tem pedido de instalação; é pelo "Compartilhar" do Safari.
export function isIos(): boolean {
  const nav = globalThis.navigator;
  if (!nav) return false;
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = installEvent;
  if (!event) return 'unavailable';
  installEvent = null; // cada pedido só pode ser usado uma vez
  changed();
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') {
      installed = true;
      changed();
    }
    return outcome;
  } catch {
    return 'dismissed';
  }
}

// Registra o service worker e fica de olho em versões novas.
export async function registerServiceWorker(reload: () => void = () => globalThis.location.reload()): Promise<void> {
  const sw = globalThis.navigator?.serviceWorker;
  if (!sw) return;
  try {
    const reg = await sw.register('/sw.js');
    const ready = (w: ServiceWorker) => {
      // Só é "versão nova" se já havia uma rodando; na primeira visita não.
      if (w.state === 'installed' && sw.controller) {
        waiting = w;
        changed();
      }
    };
    const watch = (w: ServiceWorker | null) => {
      if (!w) return;
      ready(w);
      w.addEventListener('statechange', () => ready(w));
    };
    if (reg.waiting) ready(reg.waiting);
    watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));
    sw.addEventListener('controllerchange', () => {
      // Recarrega só quando o aluno pediu "Atualizar", e uma vez.
      if (!updateRequested || reloading) return;
      reloading = true;
      reload();
    });
    // Quem deixa o app aberto por dias também recebe a versão nova.
    let lastCheck = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 30 * 60 * 1000) return;
      lastCheck = Date.now();
      reg.update().catch(() => {});
    });
  } catch {
    // navegador recusou (aba anônima, etc.): segue sem app instalável
  }
}

export function applyUpdate(): void {
  if (!waiting) return;
  updateRequested = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

// Aviso de instalar na Trilha: fechado, volta só depois de 30 dias.
const DISMISS_KEY = 'aprova-tico:install-dismissed';
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

export function installBannerDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissInstallBanner(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // sem armazenamento: vale só até fechar a página
  }
  changed();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface PwaState {
  canInstall: boolean; // o navegador deixa mostrar o pedido de instalação
  installed: boolean; // já instalado (aberto como app ou acabou de instalar)
  ios: boolean;
  online: boolean;
  updateReady: boolean;
}

export function usePwa(): PwaState {
  useSyncExternalStore(subscribe, () => version, () => version);
  return {
    canInstall: installEvent !== null,
    installed: installed || isStandalone(),
    ios: isIos(),
    online,
    updateReady: waiting !== null,
  };
}

// Só o que aparece na tela, sem ler o navegador (usado fora das telas do app).
export function usePwaNotices(): { online: boolean; updateReady: boolean } {
  useSyncExternalStore(subscribe, () => version, () => version);
  return { online, updateReady: waiting !== null };
}

export function resetPwaForTests(): void {
  installEvent = null;
  installed = false;
  online = true;
  waiting = null;
  updateRequested = false;
  reloading = false;
  changed();
}
