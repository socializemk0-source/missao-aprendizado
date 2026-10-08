// Cloudflare Turnstile no navegador: o script (carregado uma vez) e o token
// das ações do jogo. Toda escrita em /api/game leva um token NOVO (cada token
// vale uma vez no servidor). Para o aluno não esperar a cada resposta, um
// widget invisível deixa sempre um token pronto: ao usar um, já pede o
// próximo. Se a Cloudflare precisar de uma confirmação, o widget aparece num
// canto da tela. Sem chave configurada (TURNSTILE_SITE_KEY), não há token.

import { getCaptchaSiteKey } from './supabase';

export interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id?: string): void;
  remove(id: string): void;
}

declare global {
  interface Window { turnstile?: Turnstile }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let carregando: Promise<void> | null = null;

export function carregarTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  carregando ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      carregando = null;
      reject(new Error('captcha indisponível'));
    };
    document.head.appendChild(s);
  });
  return carregando;
}

// ---------------------------------------------------------------- Token do jogo
const ESPERA_MAX_MS = 60_000;
const FALHOU = 'Não deu para confirmar que você não é um robô. Tente de novo.';

interface Espera { resolve: (t: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }

let widget: string | null = null;
let caixa: HTMLDivElement | null = null;
let pronto: string | null = null;
let pedindo = false;
let geracao = 0; // callbacks de um widget já removido são ignorados
const fila: Espera[] = [];

function pedirProximo() {
  if (!widget || !window.turnstile || pedindo || pronto) return;
  pedindo = true;
  window.turnstile.reset(widget); // token anterior já foi usado: o widget recomeça
  window.turnstile.execute(widget);
}

function chegou(token: string) {
  pedindo = false;
  const espera = fila.shift();
  if (espera) {
    clearTimeout(espera.timer);
    espera.resolve(token);
    pedirProximo(); // deixa o próximo pronto
  } else {
    pronto = token;
  }
}

async function montarWidget(siteKey: string): Promise<void> {
  if (widget) return;
  await carregarTurnstile();
  if (widget || !window.turnstile) return;
  caixa = document.createElement('div');
  caixa.className = 'captcha-jogo'; // vazio: o widget só aparece se a Cloudflare pedir um clique
  document.body.appendChild(caixa);
  const minha = ++geracao;
  const vivo = () => minha === geracao;
  widget = window.turnstile.render(caixa, {
    sitekey: siteKey,
    action: 'game',
    language: 'pt-br',
    execution: 'execute',
    appearance: 'interaction-only',
    callback: (t: string) => { if (vivo()) chegou(t); },
    'expired-callback': () => { if (!vivo()) return; pronto = null; pedindo = false; pedirProximo(); },
    // Erro do widget: quem está esperando recebe o erro na hora (sem ficar preso).
    'error-callback': () => {
      if (!vivo()) return;
      pedindo = false;
      for (const e of fila.splice(0)) { clearTimeout(e.timer); e.reject(new Error(FALHOU)); }
    },
  });
}

// Um token novo para uma escrita do jogo (null = CAPTCHA desligado).
export async function tokenDoJogo(): Promise<string | null> {
  const siteKey = await getCaptchaSiteKey().catch(() => null);
  if (!siteKey) return null;
  await montarWidget(siteKey);
  if (pronto) {
    const t = pronto;
    pronto = null;
    pedirProximo();
    return t;
  }
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = fila.findIndex((e) => e.timer === timer);
      if (i >= 0) fila.splice(i, 1);
      pedindo = false;
      reject(new Error(FALHOU));
    }, ESPERA_MAX_MS);
    fila.push({ resolve, reject, timer });
    pedirProximo();
  });
}

// Só para os testes: volta ao estado inicial.
export function zerarTokenDoJogo(): void {
  if (widget && window.turnstile) window.turnstile.remove(widget);
  caixa?.remove();
  geracao++;
  widget = null;
  caixa = null;
  pronto = null;
  pedindo = false;
  for (const e of fila.splice(0)) clearTimeout(e.timer);
}
