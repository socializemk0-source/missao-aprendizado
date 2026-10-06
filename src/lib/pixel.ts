// Pixel da Meta. Só carrega depois do "Aceitar" nos cookies de anúncio;
// recusar depois revoga na hora (fbq 'consent', 'revoke'). Sem META_PIXEL_ID
// configurado, nada carrega.
//
// O código não depende de nada automático da Meta (desligado também no
// painel): sem eventos automáticos (autoConfig), sem PageView automático na
// troca de tela (disablePushState; quem dispara é medicao.ts, com event_id) e
// sem dados do aluno (nenhuma correspondência avançada: nem e-mail, nem
// telefone, nem com hash).

import type { EventoParaPixel } from '../../shared/medicao';
import { PRO_OPTIONS } from '../app/plans';
import { aceitouCookies, onCookies } from './consentimento';
import { definirDisparo, ehPadraoMeta, novoEventId } from './medicao';
import { getMetaPixelId } from './supabase';

export const PIXEL_SCRIPT = 'https://connect.facebook.net/en_US/fbevents.js';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};
type JanelaComPixel = Window & { fbq?: Fbq; _fbq?: Fbq };

let pixelId: string | null = null;
let carregado = false;
let pararDeOuvir: (() => void) | null = null;

const fbq = (...args: unknown[]) => (window as JanelaComPixel).fbq?.(...args);

// Endereços com segredo (volta do login, link de troca de senha): o pixel
// mandaria o endereço inteiro para a Meta, então nada dispara neles.
export function enderecoSensivel(href = window.location.href): boolean {
  return /access_token|refresh_token|token_hash|[?&#]code=|type=recovery/i.test(href);
}

// Parâmetros de cada evento no formato da Meta.
export function paramsMeta(evento: EventoParaPixel): Record<string, unknown> {
  const d = evento.dados;
  if (evento.nome === 'InitiateCheckout') {
    const opcao = PRO_OPTIONS.find((o) => o.id === d.plano) ?? PRO_OPTIONS[0]!;
    const value = Number(opcao.price.replace(',', '.'));
    return { value, currency: 'BRL', content_name: opcao.id, content_ids: [opcao.id], content_type: 'product', num_items: 1 };
  }
  if (evento.nome === 'PageView') return {}; // a Meta já recebe a página
  return { ...d };
}

function carregar(): void {
  if (carregado || !pixelId) return;
  carregado = true;
  const w = window as JanelaComPixel;
  if (!w.fbq) {
    // Mesma fila do código oficial: guarda as chamadas até o script chegar.
    const stub = function (...args: unknown[]) {
      if (stub.callMethod) stub.callMethod(...args);
      else stub.queue.push(args);
    } as Fbq;
    stub.push = stub;
    stub.loaded = true;
    stub.version = '2.0';
    stub.queue = [];
    w.fbq = stub;
    w._fbq ??= stub;
  }
  w.fbq!.disablePushState = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = PIXEL_SCRIPT;
  document.head.appendChild(script);
  fbq('consent', 'grant');
  fbq('set', 'autoConfig', false, pixelId);
  fbq('init', pixelId); // sem dados do aluno
}

function disparar(evento: EventoParaPixel): void {
  if (!carregado || !aceitouCookies() || enderecoSensivel()) return;
  fbq(ehPadraoMeta(evento.nome) ? 'track' : 'trackCustom', evento.nome, paramsMeta(evento), { eventID: evento.eventId });
}

// Liga o pixel (main.tsx). Eventos que chegam antes de saber o id do pixel
// esperam numa fila curta, para não perder o PageView da 1ª página.
export async function ligarPixel(): Promise<void> {
  const espera: EventoParaPixel[] = [];
  definirDisparo((e) => {
    if (espera.length < 20) espera.push(e);
  });
  try {
    pixelId = await getMetaPixelId();
  } catch {
    pixelId = null;
  }
  if (!pixelId) {
    definirDisparo(null);
    return;
  }
  definirDisparo(disparar);
  if (aceitouCookies()) {
    carregar();
    for (const e of espera) disparar(e);
  }
  pararDeOuvir?.();
  pararDeOuvir = onCookies(() => {
    if (!aceitouCookies()) {
      if (carregado) fbq('consent', 'revoke'); // recusou: para de enviar na hora
      return;
    }
    if (carregado) {
      fbq('consent', 'grant');
      return;
    }
    // Aceitou agora: carrega e conta a página em que a pessoa está.
    carregar();
    disparar({ nome: 'PageView', eventId: novoEventId(), dados: {} });
  });
}

// Só para os testes.
export function reiniciarPixelParaTestes(): void {
  pararDeOuvir?.();
  pararDeOuvir = null;
  pixelId = null;
  carregado = false;
  definirDisparo(null);
  const w = window as JanelaComPixel;
  delete w.fbq;
  delete w._fbq;
  document.querySelectorAll(`script[src="${PIXEL_SCRIPT}"]`).forEach((s) => s.remove());
}
