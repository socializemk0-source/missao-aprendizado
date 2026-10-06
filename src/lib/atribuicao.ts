// Primeira origem do visitante: de qual anúncio ele veio (UTM e ids de clique).
// Antes do aceite de cookies, fica só na aba aberta (sessionStorage). Depois do
// aceite, é guardada por 30 dias (cookie de primeira parte + localStorage) para
// ligar o cadastro e a compra ao anúncio de origem.

const CHAVE = 'aprova-tico:first-touch';
const COOKIE = 'at_first_touch';
const VALIDADE_DIAS = 30;
const MAX = 120;
const CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'] as const;

export type Origem = Partial<Record<(typeof CAMPOS)[number], string>> & { primeira_visita_em: string };

function valida(o: Origem | null): Origem | null {
  if (!o || typeof o.primeira_visita_em !== 'string') return null;
  const idade = Date.now() - Date.parse(o.primeira_visita_em);
  if (!(idade >= 0) || idade > VALIDADE_DIAS * 86400_000) return null;
  return o;
}

function ler(armazenamento: () => Storage): Origem | null {
  try {
    const bruto = armazenamento().getItem(CHAVE);
    return bruto ? valida(JSON.parse(bruto) as Origem) : null;
  } catch {
    return null;
  }
}

function lerCookie(): Origem | null {
  try {
    const par = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
    return par ? valida(JSON.parse(decodeURIComponent(par.slice(COOKIE.length + 1))) as Origem) : null;
  } catch {
    return null;
  }
}

/** A primeira origem conhecida (aba, aparelho ou cookie), se ainda vale. */
export function origemSalva(): Origem | null {
  return ler(() => sessionStorage) ?? ler(() => localStorage) ?? lerCookie();
}

/** Lê a URL de entrada; guarda só a primeira origem, nunca sobrescreve. */
export function capturarOrigem(busca: string = window.location.search): void {
  if (origemSalva()) return;
  const params = new URLSearchParams(busca);
  const origem: Origem = { primeira_visita_em: new Date().toISOString() };
  let achou = false;
  for (const campo of CAMPOS) {
    const valor = params.get(campo);
    if (valor) {
      origem[campo] = valor.slice(0, MAX);
      achou = true;
    }
  }
  if (!achou) return;
  try { sessionStorage.setItem(CHAVE, JSON.stringify(origem)); } catch { /* ok */ }
}

/** Depois do aceite: passa a origem para o cookie de primeira parte e para o aparelho. */
export function persistirOrigem(): void {
  const origem = origemSalva();
  if (!origem) return;
  const texto = JSON.stringify(origem);
  try { localStorage.setItem(CHAVE, texto); } catch { /* ok */ }
  try {
    const segundos = VALIDADE_DIAS * 86400;
    const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE}=${encodeURIComponent(texto)}; Max-Age=${segundos}; Path=/; SameSite=Lax${seguro}`;
  } catch { /* ok */ }
}

/** Revogação: apaga a origem guardada no aparelho e o cookie. */
export function apagarOrigem(): void {
  try { localStorage.removeItem(CHAVE); } catch { /* ok */ }
  try { sessionStorage.removeItem(CHAVE); } catch { /* ok */ }
  try { document.cookie = `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`; } catch { /* ok */ }
}

export function limparOrigemParaTestes(): void {
  apagarOrigem();
}
