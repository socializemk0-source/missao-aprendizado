// Medição de marketing no Postgres (v2.marketing_usuarios, migração 0015).

import { sql } from 'drizzle-orm';
import { db } from './db.js';
import type { MarketingStore } from './marketing.js';

type Rows<T> = { rows: T[] };

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
};
