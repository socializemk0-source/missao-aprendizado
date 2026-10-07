// Pixel da Meta (Facebook/Instagram): mede visitas e ações para os anúncios.
// SÓ roda depois do aceite de cookies (src/lib/consentimento.ts): quem chama
// iniciarMetaPixel() é o consentimento. Sem aceite, nada é carregado nem enviado.
// É o código oficial do pixel, mas em arquivo do próprio site (a CSP do
// vercel.json não aceita script colado no index.html). Como o app troca de tela
// sem recarregar a página, cada tela nova também conta como uma visita.

export const META_PIXEL_ID = '1134148712383913';
const SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};
type ComPixel = Window & { fbq?: Fbq; _fbq?: Fbq };

let ativo = false; // há aceite e o pixel está ligado
let iniciado = false; // o script já foi carregado nesta página
let ultimaTela: string | null = null;

export function novoEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  }
}

function apagarCookie(nome: string) {
  const dominios = [undefined, window.location.hostname, `.${window.location.hostname.replace(/^www\./, '')}`];
  for (const d of dominios) document.cookie = `${nome}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ''}`;
}

export function iniciarMetaPixel(): void {
  if (ativo) return;
  ativo = true;
  try {
    const w = window as ComPixel;
    if (iniciado && w.fbq) {
      // Voltou a aceitar na mesma página: o script já está aqui, só religa.
      w.fbq('consent', 'grant');
      ultimaTela = null;
      registrarVisita(window.location.pathname);
      return;
    }
    iniciado = true;
    if (!w.fbq) {
      // Mesmo comportamento do snippet da Meta: guarda as chamadas numa fila até o script chegar.
      const n = function (...args: unknown[]) {
        if (n.callMethod) n.callMethod(...args);
        else n.queue.push(args);
      } as Fbq;
      n.queue = [];
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      w.fbq = n;
      if (!w._fbq) w._fbq = n;
      // O script da Meta só entra depois que a página terminou de carregar:
      // não disputa a rede com a primeira tela. As chamadas esperam na fila.
      const carregar = () => {
        const s = document.createElement('script');
        s.async = true;
        s.src = SCRIPT_URL;
        document.head.appendChild(s);
      };
      if (document.readyState === 'complete') carregar();
      else window.addEventListener('load', carregar, { once: true });
    }
    w.fbq!('init', META_PIXEL_ID);
    w.fbq!('track', 'PageView', {}, { eventID: novoEventId() });
    ultimaTela = window.location.pathname;
  } catch {
    // Medição nunca pode quebrar o app.
  }
}

/** Conta a visita a uma tela nova (chamado a cada troca de rota). */
export function registrarVisita(caminho: string): void {
  const w = window as ComPixel;
  if (!ativo || !w.fbq || caminho === ultimaTela) return;
  ultimaTela = caminho;
  try {
    w.fbq('track', 'PageView', {}, { eventID: novoEventId() });
  } catch {
    // idem
  }
}

/** Evento da Meta: padrão (`track`) ou próprio (`trackCustom`), sempre com o event_id. */
export function enviarEventoMeta(nome: string, parametros: Record<string, unknown>, eventId: string, proprio = false): void {
  const w = window as ComPixel;
  if (!ativo || !w.fbq) return;
  try {
    w.fbq(proprio ? 'trackCustom' : 'track', nome, parametros, { eventID: eventId });
  } catch {
    // Medição nunca pode quebrar o app.
  }
}

export function pixelAtivo(): boolean {
  return ativo;
}

/** O aluno revogou: avisa a Meta, apaga os cookies de rastreio e para de enviar. */
export function revogarMetaPixel(): void {
  const w = window as ComPixel;
  try {
    if (w.fbq) w.fbq('consent', 'revoke');
  } catch {
    // ok
  }
  ativo = false;
  ultimaTela = null;
  apagarCookie('_fbp');
  apagarCookie('_fbc');
}

export function resetMetaPixelForTests(): void {
  ativo = false;
  iniciado = false;
  ultimaTela = null;
  delete (window as ComPixel).fbq;
  delete (window as ComPixel)._fbq;
  apagarCookie('_fbp');
  apagarCookie('_fbc');
}
