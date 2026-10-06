// Eventos de comportamento (at_*): até onde a pessoa rolou, quanto tempo ficou,
// em que clicou. Só funcionam com aceite de cookies (quem liga é src/lib/marketing.ts).
// Nunca enviam texto digitado, e-mail ou parâmetros de URL.

type Enviar = (nome: string, parametros: Record<string, unknown>) => void;

const MARCOS = [25, 50, 75, 90];
const MAX_CLIQUES_POR_VISITA = 20;

let enviar: Enviar | null = null;
let pagina = '/';
let inicio = 0;
let maxScroll = 0;
let marcosEnviados = new Set<number>();
let cliques = 0;
let saiu = false;

function porcentagemRolada(): number {
  const total = document.documentElement.scrollHeight;
  if (!total) return 0;
  const pct = ((window.scrollY + window.innerHeight) / total) * 100;
  return Math.max(0, Math.min(100, pct));
}

function aoRolar() {
  if (!enviar) return;
  const pct = porcentagemRolada();
  if (pct > maxScroll) maxScroll = pct;
  for (const marco of MARCOS) {
    if (pct >= marco && !marcosEnviados.has(marco)) {
      marcosEnviados.add(marco);
      enviar('at_scroll_depth', { depth: marco, page: pagina });
    }
  }
}

function enviarSaida() {
  if (!enviar || saiu) return;
  saiu = true;
  enviar('at_page_exit', {
    page: pagina,
    seconds_on_page: Math.max(0, Math.round((Date.now() - inicio) / 1000)),
    max_scroll: Math.round(maxScroll),
  });
}

function aoSair() {
  enviarSaida();
}
function aoMudarVisibilidade() {
  if (document.visibilityState === 'hidden') enviarSaida();
}

function limparTexto(texto: string | null): string {
  const t = (texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return t.includes('@') ? '' : t; // nunca deixa um e-mail passar
}
function slug(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function aoClicar(e: MouseEvent) {
  if (!enviar) return;
  const alvo = (e.target as Element | null)?.closest?.('a, button');
  if (!alvo || alvo.closest('[data-no-track]')) return;
  const texto = limparTexto(alvo.textContent);
  const ehCta = alvo.classList.contains('btn-primary') || alvo.hasAttribute('data-cta');
  if (!ehCta && alvo.tagName !== 'A') return;
  if (cliques >= MAX_CLIQUES_POR_VISITA) return;
  if (ehCta) {
    cliques++;
    enviar('at_cta_click', { cta_id: alvo.getAttribute('data-cta') ?? slug(texto), cta_text: texto, page: pagina });
    return;
  }
  const href = alvo.getAttribute('href');
  if (!href) return;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return; // mailto:, tel: levam dados pessoais
  const externo = url.origin !== window.location.origin;
  cliques++;
  enviar('at_link_click', { link_url: externo ? `${url.origin}${url.pathname}` : url.pathname, link_text: texto, is_external: externo, page: pagina });
}

function zerarPagina(caminho: string) {
  pagina = caminho;
  inicio = Date.now();
  maxScroll = 0;
  marcosEnviados = new Set();
  cliques = 0;
  saiu = false;
}

/** O aluno trocou de tela no app: fecha a anterior e começa a contar a nova. */
export function reiniciarPaginaComportamento(caminho: string): void {
  if (!enviar) return;
  enviarSaida();
  zerarPagina(caminho);
}

export function iniciarComportamento(envio: Enviar): void {
  if (enviar) return;
  enviar = envio;
  zerarPagina(window.location.pathname);
  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('pagehide', aoSair);
  document.addEventListener('visibilitychange', aoMudarVisibilidade);
  document.addEventListener('click', aoClicar, true);
}

export function pararComportamento(): void {
  enviar = null;
  window.removeEventListener('scroll', aoRolar);
  window.removeEventListener('pagehide', aoSair);
  document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  document.removeEventListener('click', aoClicar, true);
}
