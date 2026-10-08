// App aberto de um deploy anterior. Depois de um deploy, os arquivos antigos
// (/assets/<nome>-<hash>.js) deixam de existir: abrir uma tela que ainda não
// tinha sido baixada falha ("Failed to fetch dynamically imported module").
//
// Regras:
// - No boot, a versão do bundle (VITE_APP_VERSION, embutida no build) é
//   comparada com a do servidor (/api/config/supabase → version).
// - Versões diferentes e mais de N falhas de import dinâmico: recarrega a
//   página uma vez, para buscar a versão nova.
// - Qualquer falha de import dinâmico (mesmo com versão igual ou ainda
//   desconhecida): recarrega uma vez.
// - Trava no sessionStorage: cada motivo recarrega no máximo uma vez por
//   aba. Sem sessionStorage (aba anônima bloqueada), não recarrega — melhor
//   mostrar o erro do que entrar em loop. Divergência sem falha não
//   recarrega: o aluno pode estar no meio de uma questão.

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || 'dev';
export const FALHAS_TOLERADAS = 0; // N: com versões diferentes, recarrega quando as falhas passam de N
const TRAVA = 'aprova-tico:recarga';

let versaoServidor: string | null = null;
let falhas = 0;
let recarregar = () => window.location.reload();

export function registrarVersaoDoServidor(versao: unknown): void {
  if (typeof versao !== 'string' || !versao) return;
  versaoServidor = versao;
  if (versaoDivergente()) console.info('[versao] app aberto é de um deploy anterior', { app: APP_VERSION, servidor: versao });
}

export function versaoDivergente(): boolean {
  return versaoServidor !== null && versaoServidor !== 'dev' && APP_VERSION !== 'dev' && versaoServidor !== APP_VERSION;
}

// Mensagens de Chrome/Edge, Safari, Firefox e do Vite para import dinâmico que falhou.
const FALHA_DE_CHUNK = /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload css|loading (css )?chunk .* failed|chunkloaderror/i;

export function ehFalhaDeChunk(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : typeof err === 'string' ? err : '';
  return FALHA_DE_CHUNK.test(msg);
}

// Recarrega uma vez por motivo nesta aba. Devolve se recarregou.
export function recarregarUmaVez(motivo: string): boolean {
  try {
    if (sessionStorage.getItem(TRAVA) === motivo) return false;
    sessionStorage.setItem(TRAVA, motivo);
  } catch {
    return false;
  }
  recarregar();
  return true;
}

export function aoFalharChunk(): boolean {
  falhas++;
  if (versaoDivergente() && falhas > FALHAS_TOLERADAS) return recarregarUmaVez(`versao:${versaoServidor}`);
  return recarregarUmaVez(`chunk:${APP_VERSION}`);
}

// Liga a vigilância no boot (src/main.tsx).
export function iniciarVersao(): void {
  // O Vite avisa quando não consegue baixar o que uma tela precisa.
  window.addEventListener('vite:preloadError', (event) => {
    if (aoFalharChunk()) event.preventDefault();
  });
  // Import dinâmico fora das telas (ex.: bibliotecas carregadas sob demanda).
  window.addEventListener('unhandledrejection', (event) => {
    if (ehFalhaDeChunk(event.reason) && aoFalharChunk()) event.preventDefault();
  });
}

// Só para os testes.
export function zerarVersaoParaTestes(opcoes: { recarregar?: () => void } = {}): void {
  versaoServidor = null;
  falhas = 0;
  recarregar = opcoes.recarregar ?? (() => window.location.reload());
}
