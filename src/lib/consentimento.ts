// Consentimento de cookies de marketing (Meta e, no futuro, TikTok e Google).
// Sem aceite, nada de marketing carrega nem envia dados. A escolha fica no
// aparelho (a gravação por conta, no servidor, vem na etapa seguinte).

const CHAVE = 'aprova-tico:consent-marketing';
const EVENTO = 'aprova-tico:consent-change';

export type Consentimento = 'aceito' | 'recusado' | 'pendente';

export function consentimentoAtual(): Consentimento {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return 'pendente';
    const salvo = JSON.parse(bruto) as { aceito?: unknown };
    if (salvo.aceito === true) return 'aceito';
    if (salvo.aceito === false) return 'recusado';
    return 'pendente';
  } catch {
    return 'pendente';
  }
}

export function definirConsentimento(aceito: boolean): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ v: 1, aceito, em: new Date().toISOString() }));
  } catch {
    // Sem armazenamento, a escolha só vale até fechar a página.
  }
  memoria = aceito ? 'aceito' : 'recusado';
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: memoria }));
}

// Quando o navegador bloqueia o armazenamento, lembramos a escolha só na memória.
let memoria: Consentimento | null = null;
/** Chave temporária: só exige aceite quando VITE_EXIGIR_CONSENTIMENTO='true'. Sem ela, mede todo mundo. */
export function exigeConsentimento(): boolean {
  return import.meta.env.VITE_EXIGIR_CONSENTIMENTO === 'true';
}

export function consentimentoEfetivo(): Consentimento {
  if (!exigeConsentimento()) return 'aceito';
  const salvo = consentimentoAtual();
  return salvo !== 'pendente' ? salvo : (memoria ?? 'pendente');
}

/** Acompanha mudanças da escolha (inclusive em outra aba). Devolve a função que cancela. */
export function aoMudarConsentimento(ouvinte: (c: Consentimento) => void): () => void {
  const local = (e: Event) => ouvinte((e as CustomEvent<Consentimento>).detail);
  const outraAba = (e: StorageEvent) => { if (e.key === CHAVE) ouvinte(consentimentoAtual()); };
  window.addEventListener(EVENTO, local);
  window.addEventListener('storage', outraAba);
  return () => {
    window.removeEventListener(EVENTO, local);
    window.removeEventListener('storage', outraAba);
  };
}

export function limparConsentimentoParaTestes(): void {
  memoria = null;
  try { localStorage.removeItem(CHAVE); } catch { /* ok */ }
}
