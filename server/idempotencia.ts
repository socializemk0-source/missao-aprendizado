// Idempotência das ações que creditam ou gravam algo em /api/game: cada
// tentativa chega com um Idempotency-Key (uuid). A primeira chamada com a
// chave reserva a vaga e, ao terminar, guarda a resposta; repetir a chave
// (clique duplo, rede que caiu, replay) devolve a MESMA resposta sem rodar a
// ação de novo. A chave é do aluno (user_id + key) e vale por 24 horas.
//
// Se a ação quebrar (erro 5xx), a vaga é liberada para tentar de novo.

import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from './db.js';

export const IDEMPOTENCIA_HORAS = 24;

export type Reserva =
  | { estado: 'nova' }
  | { estado: 'repetida'; status: number; body: unknown }
  | { estado: 'em-andamento' } // mesma chave ainda processando
  | { estado: 'conflito' }; // mesma chave com outro pedido

export interface IdempotencyStore {
  reservar(userId: string, key: string, action: string, hash: string, now: Date): Promise<Reserva>;
  concluir(userId: string, key: string, status: number, body: unknown): Promise<void>;
  liberar(userId: string, key: string): Promise<void>;
}

// JSON com as chaves em ordem: o mesmo pedido dá sempre o mesmo hash.
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export function hashPedido(action: string, params: unknown): string {
  return createHash('sha256').update(`${action}\n${canonico(params)}`).digest('hex');
}

const venceu = (criada: Date, now: Date) => now.getTime() - criada.getTime() >= IDEMPOTENCIA_HORAS * 3600_000;

export function memoryIdempotency(): IdempotencyStore & { rows: Map<string, { action: string; hash: string; status: number | null; body: unknown; createdAt: Date }> } {
  const rows = new Map<string, { action: string; hash: string; status: number | null; body: unknown; createdAt: Date }>();
  const k = (userId: string, key: string) => `${userId}\n${key}`;
  return {
    rows,
    async reservar(userId, key, action, hash, now) {
      const atual = rows.get(k(userId, key));
      if (!atual || venceu(atual.createdAt, now)) {
        rows.set(k(userId, key), { action, hash, status: null, body: null, createdAt: now });
        return { estado: 'nova' };
      }
      if (atual.hash !== hash) return { estado: 'conflito' };
      if (atual.status === null) return { estado: 'em-andamento' };
      return { estado: 'repetida', status: atual.status, body: structuredClone(atual.body) };
    },
    async concluir(userId, key, status, body) {
      const atual = rows.get(k(userId, key));
      if (atual) Object.assign(atual, { status, body: structuredClone(body) });
    },
    async liberar(userId, key) {
      if (rows.get(k(userId, key))?.status === null) rows.delete(k(userId, key));
    },
  };
}

type Linha = { body_hash: string; status: number | null; response: unknown };

export const postgresIdempotency: IdempotencyStore = {
  // A hora vem do Postgres (now()); o parâmetro now só serve à versão em memória.
  async reservar(userId, key, action, hash) {
    await db().execute(sql`
      delete from v2.idempotency_keys
      where user_id = ${userId} and key = ${key}::uuid and created_at < now() - make_interval(hours => ${IDEMPOTENCIA_HORAS})`);
    const inserida = await db().execute(sql`
      insert into v2.idempotency_keys (user_id, key, action, body_hash) values (${userId}, ${key}::uuid, ${action}, ${hash})
      on conflict (user_id, key) do nothing
      returning key`);
    // Faxina de vez em quando: chaves vencidas não servem mais.
    if (Math.random() < 0.01) {
      await db().execute(sql`delete from v2.idempotency_keys where created_at < now() - make_interval(hours => ${IDEMPOTENCIA_HORAS})`).catch(() => {});
    }
    if ((inserida as unknown as { rows: unknown[] }).rows.length === 1) return { estado: 'nova' };
    const result = await db().execute(sql`
      select body_hash, status, response from v2.idempotency_keys where user_id = ${userId} and key = ${key}::uuid`);
    const row = (result as unknown as { rows: Linha[] }).rows[0];
    if (!row) return { estado: 'em-andamento' }; // liberada entre as duas consultas
    if (row.body_hash !== hash) return { estado: 'conflito' };
    if (row.status === null) return { estado: 'em-andamento' };
    return { estado: 'repetida', status: row.status, body: row.response };
  },
  async concluir(userId, key, status, body) {
    await db().execute(sql`
      update v2.idempotency_keys set status = ${status}, response = ${JSON.stringify(body ?? null)}::jsonb
      where user_id = ${userId} and key = ${key}::uuid`);
  },
  async liberar(userId, key) {
    await db().execute(sql`delete from v2.idempotency_keys where user_id = ${userId} and key = ${key}::uuid and status is null`);
  },
};
