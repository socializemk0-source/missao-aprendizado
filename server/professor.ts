// Revisão das questões por professor (CLAUDE.md, regra 6: questão só chega
// ao aluno depois da revisão de um professor da matéria).
//
// Quem revisa: v2.revisores, pelo e-mail do login (o dono cadastra; ver
// docs/revisao-professores.md), com as matérias de cada um (null = todas).
// O que revisa: as questões do banco em `revisao` e as da trilha (código)
// ainda sem aprovação na versão atual.
// Cada decisão fica em v2.question_reviews com a "versão" (resumo do texto)
// que o professor viu: se o texto mudar depois, a questão volta para a fila.

import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { QUESTOES } from '../content/trilha.js';
import type { DisciplinaId, Questao } from '../content/types.js';
import { db } from './db.js';

export type AcaoRevisao = 'aprovar' | 'corrigir' | 'descartar';
export const ACOES: AcaoRevisao[] = ['aprovar', 'corrigir', 'descartar'];
export type Origem = 'trilha' | 'banco';
export type StatusBanco = 'ativa' | 'revisao' | 'anulada';

export interface Revisor { email: string; nome: string | null; disciplinas: DisciplinaId[] | null }
export interface Candidata { questao: Questao; origem: Origem }
export interface Registro {
  questionId: string; versao: string; acao: AcaoRevisao; nota: string | null;
  userId: string; email: string; em: Date;
}

export interface ProfessorStore {
  revisor(email: string): Promise<Revisor | null>;
  candidatas(disciplinas: DisciplinaId[] | null): Promise<Candidata[]>;
  ultimas(ids: string[]): Promise<Map<string, Registro>>;
  // Grava a decisão. Com novoStatus, muda a questão do banco junto (só se
  // ainda estiver em revisão); devolve false se ela já tinha saído da revisão.
  registrar(reg: Registro, novoStatus: StatusBanco | null): Promise<boolean>;
}

export const versaoDe = (q: Pick<Questao, 'enunciado' | 'alternativas' | 'correta' | 'explicacao'>) =>
  createHash('sha256').update(JSON.stringify([q.enunciado, q.alternativas, q.correta, q.explicacao])).digest('hex').slice(0, 16);

export type Situacao = 'pendente' | 'correcao';
export interface ItemFila extends Questao {
  origem: Origem;
  versao: string;
  situacao: Situacao;
  // Último pedido de correção (desta versão ou de uma anterior, já corrigida).
  pedido: { nota: string; em: string } | null;
}

export async function filaDoRevisor(store: ProfessorStore, revisor: Revisor): Promise<ItemFila[]> {
  const candidatas = await store.candidatas(revisor.disciplinas);
  const ultimas = await store.ultimas(candidatas.map((c) => c.questao.id));
  const fila: ItemFila[] = [];
  for (const { questao, origem } of candidatas) {
    const versao = versaoDe(questao);
    const ultima = ultimas.get(questao.id);
    const mesma = ultima?.versao === versao;
    if (ultima && mesma && ultima.acao !== 'corrigir') continue; // já aprovada (ou descartada) nesta versão
    const pedido = ultima?.acao === 'corrigir' && ultima.nota ? { nota: ultima.nota, em: ultima.em.toISOString() } : null;
    fila.push({ ...questao, origem, versao, situacao: mesma ? 'correcao' : 'pendente', pedido });
  }
  const ordem = (i: ItemFila) => (i.situacao === 'pendente' ? 0 : 1);
  return fila.sort((a, b) => ordem(a) - ordem(b) || a.disciplina.localeCompare(b.disciplina) || a.id.localeCompare(b.id, 'pt-BR', { numeric: true }));
}

export class RevisaoError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}

export interface Decisao { questionId: string; versao: string; acao: AcaoRevisao; nota: string | null }

export const NOTA_MAX = 2000;

export function parseDecisao(body: Record<string, unknown> | null): Decisao | string {
  if (!body) return 'Pedido inválido.';
  const { questionId, versao, acao } = body;
  if (typeof questionId !== 'string' || !questionId || typeof versao !== 'string' || !versao) return 'Pedido inválido.';
  if (!ACOES.includes(acao as AcaoRevisao)) return 'Ação desconhecida.';
  const nota = typeof body.nota === 'string' ? body.nota.trim() : '';
  if (nota.length > NOTA_MAX) return `O comentário passa de ${NOTA_MAX} caracteres.`;
  if (acao === 'corrigir' && !nota) return 'Escreva o que precisa mudar na questão.';
  if (acao === 'descartar' && !nota) return 'Escreva por que a questão deve ser descartada.';
  return { questionId, versao, acao: acao as AcaoRevisao, nota: nota || null };
}

export async function decidir(store: ProfessorStore, revisor: Revisor, quem: { userId: string; email: string }, d: Decisao, now = new Date()) {
  const alvo = (await store.candidatas(revisor.disciplinas)).find((c) => c.questao.id === d.questionId);
  if (!alvo) throw new RevisaoError('Questão não encontrada na sua fila de revisão.', 404, 'NAO_ENCONTRADA');
  if (alvo.origem === 'trilha' && d.acao === 'descartar') {
    throw new RevisaoError('Questões da trilha não são descartadas por aqui. Use "Pedir correção" e diga que ela deve sair.', 400, 'NAO_DESCARTAVEL');
  }
  if (versaoDe(alvo.questao) !== d.versao) {
    throw new RevisaoError('Esta questão foi alterada depois que você abriu. Recarregue para ver o texto novo.', 409, 'VERSAO_MUDOU');
  }
  const novoStatus: StatusBanco | null = alvo.origem === 'trilha' ? null
    : d.acao === 'aprovar' ? 'ativa' : d.acao === 'descartar' ? 'anulada' : null;
  const ok = await store.registrar({ ...d, ...quem, em: now }, novoStatus);
  if (!ok) throw new RevisaoError('Esta questão já foi revisada. Recarregue a lista.', 409, 'JA_REVISADA');
}

const naMateria = (disciplinas: DisciplinaId[] | null) => (q: Questao) => !disciplinas || disciplinas.includes(q.disciplina);

// ---- Em memória (testes) ----
export function memoryProfessor(seed: {
  revisores: Revisor[];
  trilha?: Questao[];
  banco: (Questao & { status: StatusBanco })[];
}) {
  const trilha = new Map((seed.trilha ?? QUESTOES).map((q) => [q.id, { ...q }]));
  const banco = new Map(seed.banco.map((q) => [q.id, { ...q }]));
  const registros: Registro[] = [];
  return {
    registros,
    status: (id: string) => banco.get(id)?.status,
    editarTrilha: (id: string, mud: Partial<Questao>) => { trilha.set(id, { ...trilha.get(id)!, ...mud }); },
    editarBanco: (id: string, mud: Partial<Questao>) => { banco.set(id, { ...banco.get(id)!, ...mud }); },
    async revisor(email: string) {
      return seed.revisores.find((r) => r.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
    },
    async candidatas(disciplinas: DisciplinaId[] | null) {
      const dentro = naMateria(disciplinas);
      return [
        ...[...trilha.values()].filter(dentro).map((questao) => ({ questao, origem: 'trilha' as const })),
        ...[...banco.values()].filter((q) => q.status === 'revisao' && dentro(q)).map(({ status: _s, ...questao }) => ({ questao, origem: 'banco' as const })),
      ];
    },
    async ultimas(ids: string[]) {
      const out = new Map<string, Registro>();
      for (const r of registros) if (ids.includes(r.questionId)) out.set(r.questionId, r);
      return out;
    },
    async registrar(reg: Registro, novoStatus: StatusBanco | null) {
      if (novoStatus) {
        const q = banco.get(reg.questionId);
        if (!q || q.status !== 'revisao') return false;
        q.status = novoStatus;
      }
      registros.push(reg);
      return true;
    },
  } satisfies ProfessorStore & Record<string, unknown>;
}

// ---- Postgres (migração 0014) ----
type Linha = Record<string, unknown>;
const linhas = (r: unknown) => (r as { rows: Linha[] }).rows;

export const postgresProfessor: ProfessorStore = {
  async revisor(email) {
    const r = linhas(await db().execute(sql`select email, nome, disciplinas from v2.revisores where lower(email) = lower(${email.trim()}) limit 1`))[0];
    if (!r) return null;
    const disc = r.disciplinas as DisciplinaId[] | null;
    return { email: String(r.email), nome: (r.nome as string | null) ?? null, disciplinas: disc && disc.length ? disc : null };
  },
  async candidatas(disciplinas) {
    const rows = linhas(await db().execute(sql`
      select id, disciplina, assunto, enunciado, alternativas, correta, explicacao, fonte, dificuldade
      from v2.questions where status = 'revisao'`));
    const banco = rows.map((r) => ({
      id: String(r.id), disciplina: r.disciplina as DisciplinaId, assunto: String(r.assunto), enunciado: String(r.enunciado),
      alternativas: r.alternativas as string[], correta: Number(r.correta), explicacao: String(r.explicacao),
      fonte: r.fonte as Questao['fonte'], dificuldade: Number(r.dificuldade) as Questao['dificuldade'],
    }));
    const dentro = naMateria(disciplinas);
    return [
      ...QUESTOES.filter(dentro).map((questao) => ({ questao, origem: 'trilha' as const })),
      ...banco.filter(dentro).map((questao) => ({ questao, origem: 'banco' as const })),
    ];
  },
  async ultimas(ids) {
    const out = new Map<string, Registro>();
    if (!ids.length) return out;
    const rows = linhas(await db().execute(sql`
      select distinct on (question_id) question_id, versao, acao, nota, user_id, revisor_email, created_at
      from v2.question_reviews where question_id in (select jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
      order by question_id, created_at desc, id desc`));
    for (const r of rows) {
      out.set(String(r.question_id), {
        questionId: String(r.question_id), versao: String(r.versao), acao: r.acao as AcaoRevisao, nota: (r.nota as string | null) ?? null,
        userId: String(r.user_id), email: String(r.revisor_email), em: new Date(r.created_at as string),
      });
    }
    return out;
  },
  async registrar(reg, novoStatus) {
    return db().transaction(async (tx) => {
      if (novoStatus) {
        const r = linhas(await tx.execute(sql`
          update v2.questions set status = ${novoStatus}, updated_at = now()
          where id = ${reg.questionId} and status = 'revisao' returning id`));
        if (!r.length) return false;
      }
      await tx.execute(sql`
        insert into v2.question_reviews (question_id, versao, acao, nota, user_id, revisor_email, created_at)
        values (${reg.questionId}, ${reg.versao}, ${reg.acao}, ${reg.nota}, ${reg.userId}, ${reg.email}, ${reg.em})`);
      return true;
    });
  },
};
