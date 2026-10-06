// Primeira origem da visita: etiquetas do link (UTM) e códigos de clique
// (fbclid, gclid, ttclid). Fica no aparelho por ORIGEM_VALIDADE_DIAS; uma
// visita nova com etiqueta dentro desse prazo NÃO troca a origem. No
// cadastro, o servidor grava esta origem no aluno (POST /api/eventos).
// É dado nosso: nunca vai para plataforma de anúncio sem o aceite.

import { CHAVES_ORIGEM, ORIGEM_VALIDADE_DIAS, type Origem } from '../../shared/medicao';

const KEY = 'aprovatico.origem';
const VALIDADE_MS = ORIGEM_VALIDADE_DIAS * 86_400_000;

export function lerOrigem(now = new Date()): Origem | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Origem | null;
    if (!raw || typeof raw.em !== 'string') return null;
    if (now.getTime() - Date.parse(raw.em) > VALIDADE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

// Guarda a origem do endereço atual, se ele tiver etiqueta e ainda não houver
// uma origem dentro do prazo.
export function capturarOrigem(href = window.location.href, now = new Date()): void {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return;
  }
  const origem: Origem = {};
  for (const chave of CHAVES_ORIGEM) {
    const valor = url.searchParams.get(chave)?.trim();
    if (valor) origem[chave] = valor.slice(0, chave.endsWith('clid') ? 500 : 200);
  }
  if (!CHAVES_ORIGEM.some((c) => origem[c])) return;
  if (lerOrigem(now)) return;
  origem.pagina = url.pathname.slice(0, 200);
  origem.em = now.toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(origem));
  } catch {
    // sem armazenamento: a origem vale só nesta página
  }
}

// Só para os testes.
export function limparOrigemParaTestes(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada
  }
}
