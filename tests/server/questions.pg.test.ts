// Integração com Postgres de verdade (roda só com PG_TEST=1 e a migração
// 0003 aplicada): o banco recusa sozinho o que o validador recusa.
import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { loadBank, upsertStatement, type Question } from '../../server/questions.js';

describe.runIf(process.env.PG_TEST === '1')('v2.questions (Postgres real)', () => {
  const pool = new pg.Pool({
    host: process.env.SQL_HOST,
    port: Number(process.env.SQL_PORT ?? 6543),
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME ?? 'postgres',
    ssl: process.env.SQL_SSL === 'false' ? false : { rejectUnauthorized: false },
  });
  afterAll(() => pool.end());

  const bank = loadBank();
  const base = bank[0] as Question;

  it('carrega o banco inteiro e carregar de novo só atualiza', async () => {
    for (const q of bank) await pool.query(upsertStatement(q));
    for (const q of bank) await pool.query(upsertStatement(q));
    const ids = bank.map((q) => q.id);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM v2.questions WHERE id = ANY($1)', [ids]);
    expect(rows[0].n).toBe(bank.length);
  });

  it('recusa questão oficial sem autorização da banca', async () => {
    const q: Question = {
      ...base, id: 'pg-oficial-sem-autorizacao', style: undefined, origin: 'oficial',
      banca: 'X', examYear: 2020, orgao: 'Y', cargo: 'Z', sourceUrl: 'https://x.org/p.pdf',
    };
    await expect(pool.query(upsertStatement(q))).rejects.toThrow(/questions_origin_fields/);
  });

  it('recusa questão própria com dados de prova oficial', async () => {
    const q: Question = { ...base, id: 'pg-propria-com-banca', banca: 'FGV', examYear: 2022 };
    await expect(pool.query(upsertStatement(q))).rejects.toThrow(/questions_origin_fields/);
  });

  it('recusa gabarito fora das alternativas', async () => {
    const q: Question = { ...base, id: 'pg-gabarito-fora', correctIndex: base.options.length };
    await expect(pool.query(upsertStatement(q))).rejects.toThrow(/questions_correct_in_range/);
  });
});
