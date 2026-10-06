// Medição de marketing no navegador. Cada evento ganha um event_id único:
//   - vai sempre para o nosso registro (POST /api/eventos), com ou sem aceite;
//   - só com "Aceitar" nos cookies vai também para o pixel, com o MESMO
//     event_id (a Meta conta uma vez só quando a API de Conversões mandar o
//     mesmo evento, na fase B).
// Eventos que o servidor decide (cadastro, onboarding, 1ª fase) voltam na
// resposta como "pendentes" e o pixel os dispara com o event_id do servidor.
// Nada aqui pode atrapalhar o app: todo erro é engolido.

import { PADRAO_META, type EventoNavegador, type EventoParaPixel } from '../../shared/medicao';
import { aceitouCookies, escolhaCookies } from './consentimento';
import { capturarOrigem, lerOrigem } from './origem';
import { getSupabase } from './supabase';

type Disparo = (evento: EventoParaPixel) => void;

let ligada = false; // só o app de verdade (main.tsx) liga; nos testes de tela fica desligada
let disparo: Disparo | null = null;

// O pixel (fase A, parte 4) se registra aqui.
export function definirDisparo(fn: Disparo | null): void {
  disparo = fn;
}

export const ehPadraoMeta = (nome: string) => PADRAO_META.has(nome);

export function novoEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function disparar(evento: EventoParaPixel): void {
  if (!disparo || !aceitouCookies()) return;
  try {
    disparo(evento);
  } catch {
    // pixel com problema não atrapalha nada
  }
}

async function tokenAtual(): Promise<string | null> {
  try {
    const { data } = await (await getSupabase()).auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function enviar(eventos: EventoParaPixel[]): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await tokenAtual();
    if (token) headers.Authorization = `Bearer ${token}`;
    const escolha = escolhaCookies();
    const res = await fetch('/api/eventos', {
      method: 'POST',
      headers,
      keepalive: true, // chega mesmo se a pessoa sair da página (ex.: ir para o pagamento)
      body: JSON.stringify({ consentimento: escolha ? escolha.escolha === 'aceito' : null, origem: lerOrigem(), eventos }),
    });
    if (!res.ok) return;
    const { pendentes } = (await res.json()) as { pendentes?: EventoParaPixel[] };
    for (const p of pendentes ?? []) disparar(p);
  } catch {
    // sem internet ou servidor fora: o evento se perde, o app segue
  }
}

export function registrar(nome: EventoNavegador, dados: Record<string, string | number> = {}): void {
  if (!ligada) return;
  const evento = { nome, eventId: novoEventId(), dados };
  disparar(evento);
  void enviar([evento]);
}

// Lead: quem grava é /api/leads (no envio do formulário); aqui só o
// event_id, a origem e o aceite que vão junto, e o pixel depois do sucesso.
export function prepararLead(): { eventId: string; origem: ReturnType<typeof lerOrigem>; consentimentoCookies: boolean } {
  return { eventId: novoEventId(), origem: lerOrigem(), consentimentoCookies: aceitouCookies() };
}

export function leadConfirmado(eventId: string): void {
  if (ligada) disparar({ nome: 'Lead', eventId, dados: {} });
}

interface RouterLike {
  state: { location: { pathname: string } };
  subscribe(fn: (state: { location: { pathname: string } }) => void): () => void;
}

// Liga a medição: guarda a origem da visita e registra um PageView a cada
// página aberta (o app troca de tela sem recarregar).
export function iniciarMedicao(router: RouterLike): void {
  ligada = true;
  capturarOrigem();
  let atual = router.state.location.pathname;
  registrar('PageView', { pagina: atual });
  router.subscribe((state) => {
    const pagina = state.location.pathname;
    if (pagina === atual) return;
    atual = pagina;
    registrar('PageView', { pagina });
  });
}

// Só para os testes.
export function ligarMedicaoParaTestes(on: boolean): void {
  ligada = on;
}
