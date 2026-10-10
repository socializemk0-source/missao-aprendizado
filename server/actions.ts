// Ações de /api/game em LISTA FECHADA. Cada ação diz o método, se exige
// login, o schema (zod) dos parâmetros, o balde do limite de chamadas e se
// exige Idempotency-Key. Ação fora desta lista → 400 "unknown_action".
//
// Os schemas descartam campo desconhecido (z.object tira o que não está
// declarado): xp, score, acertos, streak, horário etc. vindos da tela nunca
// chegam às regras do jogo. Só o objeto validado segue adiante.

import { z } from 'zod';
import { DISCIPLINAS, FASES } from '../content/trilha.js';
import type { DisciplinaId } from '../content/types.js';
import { BANCAS_ALVO, MINUTOS_DIA, NIVEIS_ALUNO, type NivelAluno } from '../shared/estudo.js';
import { JOGOS, NIVEIS, RADAR_TAMANHO, SIMULADO_TAMANHOS } from '../shared/game.js';
import { MISSION_IDS } from './game.js';
import { LIMITES } from './limite.js';

// ---------------------------------------------------------------- Peças
const ALTERNATIVAS_MAX = 5; // nenhuma questão tem mais (tests/server/actions.test.ts confere)
const SIMULADO_MAX = Math.max(...SIMULADO_TAMANHOS);

const tupla = <T extends string>(list: readonly T[]) => list as unknown as [T, ...T[]];
const vazioParaNulo = (v: unknown) => (v === '' ? null : v);

const disciplina = z.enum(tupla<DisciplinaId>(DISCIPLINAS.map((d) => d.id)));
// Questões da trilha e do banco: "pt-acent-1", "port-crase-001"...
const questionId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const alternativa = z.number().int().min(0).max(ALTERNATIVAS_MAX - 1);
const vazio = z.object({});

// ---------------------------------------------------------------- Ações
export type Bucket = 'leitura' | 'resposta' | 'escrita';

// Chamadas por minuto, por aluno (ou por IP numa ação sem login).
export const BUCKETS: Record<Bucket, number> = {
  leitura: LIMITES.jogoLeituraPorMinuto,
  resposta: LIMITES.jogoRespostaPorMinuto,
  escrita: LIMITES.jogoEscritaPorMinuto,
};

export interface ActionSpec {
  method: 'GET' | 'POST';
  authRequired: boolean;
  schema: z.ZodType;
  rateLimitBucket: Bucket;
  idempotent: boolean; // exige Idempotency-Key (uuid)
  // true: as mensagens do schema são para o aluno ler (em português).
  mensagemDoCampo?: boolean;
}

const leitura = <S extends z.ZodType>(schema: S) =>
  ({ method: 'GET', authRequired: true, schema, rateLimitBucket: 'leitura', idempotent: false }) as const;
const escrita = <S extends z.ZodType>(schema: S, rateLimitBucket: Bucket) =>
  ({ method: 'POST', authRequired: true, schema, rateLimitBucket, idempotent: true }) as const;

const planoSchema = z.object({
  prova: z.string({ error: 'Conte qual concurso você vai prestar (até 80 letras).' }).max(200, { error: 'Conte qual concurso você vai prestar (até 80 letras).' }),
  banca: z.preprocess(vazioParaNulo, z.enum(BANCAS_ALVO, { error: 'Banca inválida.' }).nullable()).optional(),
  dataProva: z.preprocess(vazioParaNulo, z.string({ error: 'Data da prova inválida.' }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data da prova inválida.' }).nullable()).optional(),
  minutosDia: z.union(MINUTOS_DIA.map((m) => z.literal(m)), { error: 'Escolha quanto tempo por dia você tem.' }),
  nivel: z.enum(tupla<NivelAluno>(NIVEIS_ALUNO.map((n) => n.id)), { error: 'Escolha seu nível.' }),
  disciplinas: z.array(disciplina, { error: 'Escolha pelo menos uma matéria da sua prova.' })
    .min(1, { error: 'Escolha pelo menos uma matéria da sua prova.' }).max(DISCIPLINAS.length, { error: 'Escolha pelo menos uma matéria da sua prova.' }),
}, { error: 'Envio inválido.' });

export const ACTIONS = {
  // GET
  progresso: leitura(vazio),
  trilha: leitura(vazio),
  fase: leitura(z.object({ id: z.enum(tupla(FASES.map((f) => f.id))) })),
  revisar: leitura(vazio),
  pratica: leitura(z.object({ disciplina })),
  desafio: leitura(vazio),
  missoes: leitura(vazio),
  conquistas: leitura(vazio),
  disciplinas: leitura(vazio),
  ranking: leitura(vazio),
  simulados: leitura(vazio),
  simulado: leitura(z.object({ id: z.uuid() })),
  jogos: leitura(vazio),
  plano: leitura(vazio),

  // POST
  responder: escrita(z.object({
    questionId,
    choice: alternativa,
    mode: z.enum(['trilha', 'revisar', 'pratica', 'desafio']),
  }), 'resposta'),
  resgatar: escrita(z.object({ missionId: z.enum(tupla(MISSION_IDS)) }), 'resposta'),
  'simulado-iniciar': escrita(z.object({
    nivel: z.enum(tupla(NIVEIS)),
    disciplinas: z.array(disciplina).min(1).max(DISCIPLINAS.length),
    banca: z.preprocess(vazioParaNulo, z.enum(BANCAS_ALVO).nullable()).optional(),
    quantidade: z.union(SIMULADO_TAMANHOS.map((n) => z.literal(n))),
    cronometro: z.boolean().optional(),
  }), 'escrita'),
  'simulado-entregar': escrita(z.object({
    id: z.uuid(),
    respostas: z.record(questionId, alternativa).refine((r) => Object.keys(r).length <= SIMULADO_MAX),
  }), 'resposta'),
  'jogo-iniciar': escrita(z.object({
    tipo: z.enum(tupla(JOGOS)),
    disciplina: z.preprocess(vazioParaNulo, disciplina.nullable()).optional(),
  }), 'escrita'),
  // Uma jogada de qualquer jogo; o servidor confere o que vale para o tipo da rodada.
  'jogo-jogada': escrita(z.object({
    id: z.uuid(),
    indice: z.number().int().min(0).max(RADAR_TAMANHO - 1).optional(), // Radar
    resposta: z.boolean().optional(), // Radar
    palavra: z.string().min(1).max(20).optional(), // Caça-palavras
    respostas: z.record(z.string().regex(/^\d{1,2}[HV]$/), z.string().max(20)) // Cruzadinha
      .refine((r) => Object.keys(r).length <= 40).optional(),
    cartas: z.tuple([z.string().regex(/^c\d{1,2}$/), z.string().regex(/^c\d{1,2}$/)]).optional(), // Memória
  }), 'resposta'),
  'jogo-terminar': escrita(z.object({ id: z.uuid() }), 'resposta'),
  'plano-salvar': { ...escrita(planoSchema, 'escrita'), mensagemDoCampo: true },
} as const satisfies Record<string, ActionSpec>;

export type ActionName = keyof typeof ACTIONS;
export type Params<A extends ActionName> = z.output<(typeof ACTIONS)[A]['schema']>;
export type ParsedAction = { [A in ActionName]: { action: A; params: Params<A> } }[ActionName];

// Object.hasOwn: "__proto__", "constructor" e afins não são ações.
export function isAction(action: string): action is ActionName {
  return Object.hasOwn(ACTIONS, action);
}

export function actionSpec(action: ActionName): ActionSpec {
  return ACTIONS[action];
}

export function parseParams(action: ActionName, input: unknown): { ok: true; parsed: ParsedAction } | { ok: false; error: string } {
  const spec: ActionSpec = ACTIONS[action];
  const result = spec.schema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: (spec.mensagemDoCampo && result.error.issues[0]?.message) || 'Envio inválido.' };
  }
  return { ok: true, parsed: { action, params: result.data } as ParsedAction };
}
