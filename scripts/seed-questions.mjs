// Carrega content/questoes/*.json em v2.questions (insere ou atualiza pelo id).
// Uso: node scripts/seed-questions.mjs   (lê SQL_* do ambiente, como a API)
// Valida tudo antes: se uma questão estiver errada, nada é gravado.
import pg from 'pg';
import { loadBank, upsertStatement, validateBank } from '../server/questions.ts';

const bank = loadBank();
const errors = validateBank(bank);
if (errors.length) {
  console.error(`Corrija antes de carregar:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const client = new pg.Client({
  host: process.env.SQL_HOST,
  port: Number(process.env.SQL_PORT ?? 6543),
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME ?? 'postgres',
  ssl: process.env.SQL_SSL === 'false' ? false : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query('BEGIN');
  for (const q of bank) await client.query(upsertStatement(q));
  await client.query('COMMIT');
  console.log(`${bank.length} questões carregadas em v2.questions.`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Falhou, nada foi gravado:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
