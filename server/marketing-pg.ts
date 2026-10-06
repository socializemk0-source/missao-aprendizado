// Medição de marketing no Postgres: v2.marketing_usuarios (migrações 0015 e
// 0016) e v2.eventos_marketing (0016).

import { sql } from 'drizzle-orm';
import type { EventoParaPixel, Origem } from '../shared/medicao.js';
import { db } from './db.js';
import { CADASTRO_RECENTE_MS, PENDENTE_VALIDADE_MS, type MarketingStore } from './marketing.js';

type Rows<T> = { rows: T[] };
const json = (v: unknown) => (v === null || v === undefined ? null : JSON.stringify(v));

export const postgresMarketing: MarketingStore = {
  async consentimento(userId) {
    const r = (await db().execute(sql`select consentimento from v2.marketing_usuarios where user_id = ${userId}`)) as unknown as Rows<{ consentimento: boolean | null }>;
    return r.rows[0]?.consentimento ?? null;
  },
  async salvarConsentimento(userId, aceito, now) {
    // Só muda a data quando a escolha muda.
    await db().execute(sql`
      insert into v2.marketing_usuarios (user_id, consentimento, consentimento_em) values (${userId}, ${aceito}, ${now})
      on conflict (user_id) do update set consentimento = excluded.consentimento, consentimento_em = excluded.consentimento_em, updated_at = now()
      where v2.marketing_usuarios.consentimento is distinct from excluded.consentimento`);
  },
  async origem(userId) {
    const r = (await db().execute(sql`select origem from v2.marketing_usuarios where user_id = ${userId}`)) as unknown as Rows<{ origem: Origem | null }>;
    return r.rows[0]?.origem ?? null;
  },
  async salvarOrigem(userId, origem, now) {
    // A primeira origem nunca é trocada.
    const em = origem.em ? new Date(origem.em) : now;
    await db().execute(sql`
      insert into v2.marketing_usuarios (user_id, origem, origem_em) values (${userId}, ${json(origem)}::jsonb, ${em})
      on conflict (user_id) do update set origem = excluded.origem, origem_em = excluded.origem_em, updated_at = now()
      where v2.marketing_usuarios.origem is null`);
  },
  async cadastroRecente(userId, now) {
    const r = (await db().execute(sql`select created_at from v2.profiles where user_id = ${userId}`)) as unknown as Rows<{ created_at: Date | string }>;
    const criado = r.rows[0]?.created_at;
    return !criado || now.getTime() - new Date(criado).getTime() < CADASTRO_RECENTE_MS;
  },
  async registrar(e) {
    // Sem alvo no "on conflict": vale para o event_id repetido e para o
    // evento de uma vez só por aluno.
    const r = (await db().execute(sql`
      insert into v2.eventos_marketing (user_id, evento, event_id, criado_em, valor, moeda, dados, origem, consentimento, envio, teste)
      values (${e.userId}, ${e.nome}, ${e.eventId}, ${e.now}, ${e.valor ?? null}, ${e.moeda ?? null}, ${json(e.dados)}::jsonb,
              ${json(e.origem)}::jsonb, ${e.consentimento}, ${json(e.envio)}::jsonb, ${e.teste})
      on conflict do nothing
      returning id`)) as unknown as Rows<{ id: string }>;
    return r.rows.length > 0;
  },
  async pendentesDoPixel(userId, now) {
    const desde = new Date(now.getTime() - PENDENTE_VALIDADE_MS);
    const r = (await db().execute(sql`
      update v2.eventos_marketing set envio = jsonb_set(envio, '{meta_pixel}', '"entregue_ao_navegador"')
      where user_id = ${userId} and envio->>'meta_pixel' = 'pendente' and criado_em > ${desde}
      returning evento, event_id, dados`)) as unknown as Rows<{ evento: string; event_id: string; dados: Record<string, string | number> | null }>;
    return r.rows.map((row): EventoParaPixel => ({ nome: row.evento, eventId: row.event_id, dados: row.dados ?? {} }));
  },
};
