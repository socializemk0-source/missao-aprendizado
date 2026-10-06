// Medição de marketing (fase A): consentimento de cookies de anúncio, primeira
// origem (UTM) do aluno e registro próprio de eventos (v2.eventos_marketing).
// A interface existe para os testes trocarem o banco pela versão em memória
// (a do Postgres fica em marketing-pg.ts).
//
// Regra: nada aqui pode derrubar cadastro, estudo ou pagamento. As funções
// "seguras" (registrarSeguro, eventoDoAluno) nunca lançam erro.

import crypto from 'node:crypto';
import { CHAVES_ORIGEM, type EventoParaPixel, type EventoServidor, type NomeEvento, type Origem } from '../shared/medicao.js';
import { errorText } from './log.js';

// Situação do envio a cada plataforma, por evento (coluna "envio").
//   navegador             o pixel disparou no navegador (com aceite)
//   pendente              evento do servidor esperando o navegador disparar o pixel
//   entregue_ao_navegador o navegador recebeu o pendente para disparar
//   sem_consentimento     não vai para a plataforma
export type SituacaoEnvio = 'navegador' | 'pendente' | 'entregue_ao_navegador' | 'sem_consentimento';

export interface RegistroEvento {
  eventId: string;
  nome: NomeEvento;
  userId: string | null;
  valor?: number | null;
  moeda?: string | null;
  dados?: Record<string, string | number> | null;
  origem: Origem | null;
  consentimento: boolean;
  envio: { meta_pixel: SituacaoEnvio };
  teste: boolean; // modo de teste (META_TEST_EVENT_CODE): fora dos números reais
  now: Date;
}

export interface MarketingStore {
  // null = o aluno ainda não escolheu.
  consentimento(userId: string): Promise<boolean | null>;
  // Grava a escolha e a data. Repetir a mesma escolha não muda a data.
  salvarConsentimento(userId: string, aceito: boolean, now: Date): Promise<void>;
  origem(userId: string): Promise<Origem | null>;
  // Grava a primeira origem; se o aluno já tem uma, não troca.
  salvarOrigem(userId: string, origem: Origem, now: Date): Promise<void>;
  // Cadastro novo: o perfil ainda não existe ou foi criado há menos de 2 dias.
  cadastroRecente(userId: string, now: Date): Promise<boolean>;
  // false = já existia (mesmo event_id, ou evento que só acontece uma vez por aluno).
  registrar(evento: RegistroEvento): Promise<boolean>;
  // Eventos do servidor que o pixel ainda não disparou (últimos 7 dias).
  // Marca como entregues: cada um sai uma vez só.
  pendentesDoPixel(userId: string, now: Date): Promise<EventoParaPixel[]>;
}

// Eventos que só acontecem uma vez por aluno.
export const UMA_VEZ: ReadonlySet<NomeEvento> = new Set<NomeEvento>(['CompleteRegistration', 'OnboardingCompleted', 'FirstPhaseCompleted']);
export const CADASTRO_RECENTE_MS = 2 * 86_400_000;
export const PENDENTE_VALIDADE_MS = 7 * 86_400_000;

// Modo de teste: com META_TEST_EVENT_CODE configurado, os eventos são
// marcados como teste (e, na fase B, vão para "Testar eventos" da Meta).
export const modoTeste = (env: NodeJS.ProcessEnv = process.env) => Boolean(env.META_TEST_EVENT_CODE?.trim());

// ---------------------------------------------------------------- Validação
// Nada que vem da tela é confiado: só os campos conhecidos, com tamanho e
// caracteres limitados.
const VALOR_ORIGEM = /^[\w.~%+\-|:]{1,200}$/;
const CLIQUE = /^[\w.~%+\-|:]{1,500}$/;

export function limparOrigem(raw: unknown): Origem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const origem: Origem = {};
  for (const chave of CHAVES_ORIGEM) {
    const v = r[chave];
    if (typeof v !== 'string') continue;
    const valor = v.trim();
    if ((chave.endsWith('clid') ? CLIQUE : VALOR_ORIGEM).test(valor)) origem[chave] = valor;
  }
  if (!CHAVES_ORIGEM.some((c) => origem[c])) return null;
  if (typeof r.pagina === 'string' && /^\/[\w\-./]{0,199}$/.test(r.pagina)) origem.pagina = r.pagina;
  if (typeof r.em === 'string' && !Number.isNaN(Date.parse(r.em))) origem.em = new Date(r.em).toISOString();
  return origem;
}

export function limparEventId(raw: unknown): string | null {
  return typeof raw === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(raw) ? raw : null;
}

export const novoEventId = () => crypto.randomUUID();

// ---------------------------------------------------------------- Registro seguro
// Grava no registro próprio; erro vira log, nunca exceção.
export async function registrarSeguro(store: MarketingStore, evento: Omit<RegistroEvento, 'teste'>): Promise<boolean> {
  try {
    return await store.registrar({ ...evento, teste: modoTeste() });
  } catch (err) {
    console.error('[medicao] erro ao registrar evento:', evento.nome, errorText(err));
    return false;
  }
}

// Evento que o servidor decide (cadastro, onboarding, 1ª fase): leva o
// consentimento e a origem do aluno. Com aceite, fica "pendente" até o
// navegador disparar o pixel com o mesmo event_id.
export async function eventoDoAluno(store: MarketingStore, userId: string, nome: EventoServidor, now = new Date()): Promise<boolean> {
  try {
    const [consentimento, origem] = await Promise.all([store.consentimento(userId), store.origem(userId)]);
    return await registrarSeguro(store, {
      eventId: novoEventId(), nome, userId, origem, consentimento: consentimento === true,
      envio: { meta_pixel: consentimento === true ? 'pendente' : 'sem_consentimento' }, now,
    });
  } catch (err) {
    console.error('[medicao] erro ao registrar evento do aluno:', nome, errorText(err));
    return false;
  }
}

// ---------------------------------------------------------------- Memória
export interface MarketingUsuario {
  consentimento?: boolean | null;
  consentimentoEm?: Date | null;
  origem?: Origem | null;
  origemEm?: Date | null;
}

export function memoryMarketing(opts: { perfisAntigos?: Iterable<string> } = {}): MarketingStore & {
  usuarios: Map<string, MarketingUsuario>;
  eventos: RegistroEvento[];
} {
  const usuarios = new Map<string, MarketingUsuario>();
  const eventos: RegistroEvento[] = [];
  const antigos = new Set(opts.perfisAntigos ?? []);
  return {
    usuarios,
    eventos,
    async consentimento(userId) {
      return usuarios.get(userId)?.consentimento ?? null;
    },
    async salvarConsentimento(userId, aceito, now) {
      const atual = usuarios.get(userId);
      if (atual?.consentimento === aceito) return;
      usuarios.set(userId, { ...atual, consentimento: aceito, consentimentoEm: now });
    },
    async origem(userId) {
      return usuarios.get(userId)?.origem ?? null;
    },
    async salvarOrigem(userId, origem, now) {
      const atual = usuarios.get(userId);
      if (atual?.origem) return;
      usuarios.set(userId, { ...atual, origem, origemEm: origem.em ? new Date(origem.em) : now });
    },
    async cadastroRecente(userId) {
      return !antigos.has(userId);
    },
    async registrar(evento) {
      const repetido = eventos.some((e) => e.eventId === evento.eventId
        || (UMA_VEZ.has(evento.nome) && evento.userId !== null && e.userId === evento.userId && e.nome === evento.nome));
      if (repetido) return false;
      eventos.push({ ...evento, envio: { ...evento.envio } });
      return true;
    },
    async pendentesDoPixel(userId, now) {
      const out: EventoParaPixel[] = [];
      for (const e of eventos) {
        if (e.userId !== userId || e.envio.meta_pixel !== 'pendente' || now.getTime() - e.now.getTime() > PENDENTE_VALIDADE_MS) continue;
        e.envio.meta_pixel = 'entregue_ao_navegador';
        out.push({ nome: e.nome, eventId: e.eventId, dados: e.dados ?? {} });
      }
      return out;
    },
  };
}
