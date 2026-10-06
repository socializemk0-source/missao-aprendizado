// Pixel da Meta (Facebook/Instagram): mede as visitas para os anúncios.
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

let iniciado = false;
let ultimaTela: string | null = null;

export function iniciarMetaPixel(): void {
  if (iniciado) return;
  iniciado = true;
  try {
    const w = window as ComPixel;
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
      const s = document.createElement('script');
      s.async = true;
      s.src = SCRIPT_URL;
      document.head.appendChild(s);
    }
    w.fbq!('init', META_PIXEL_ID);
    w.fbq!('track', 'PageView');
    ultimaTela = window.location.pathname;
  } catch {
    // Medição nunca pode quebrar o app.
  }
}

/** Conta a visita a uma tela nova (chamado a cada troca de rota). */
export function registrarVisita(caminho: string): void {
  const w = window as ComPixel;
  if (!iniciado || !w.fbq || caminho === ultimaTela) return;
  ultimaTela = caminho;
  try {
    w.fbq('track', 'PageView');
  } catch {
    // idem
  }
}

export function resetMetaPixelForTests(): void {
  iniciado = false;
  ultimaTela = null;
  delete (window as ComPixel).fbq;
  delete (window as ComPixel)._fbq;
}
