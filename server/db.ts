// Conexão com o Postgres do Supabase. Em serverless cada instância abre o
// próprio pool, por isso ele é pequeno e reaproveitado entre invocações.
//
// SEGURANÇA: esta conexão é privilegiada. O usuário SQL_USER é o dono das
// tabelas do v2 e, como a service_role, NÃO passa pela RLS; também não
// carrega o JWT do aluno, então auth.uid() não existe aqui. Por isso toda
// consulta a dado de aluno filtra o dono EXPLICITAMENTE no código, sempre
// com o id que veio do token (server/auth.ts), nunca do corpo ou da URL:
// em server/game-pg.ts, por exemplo, userTx(tx, userId) põe
// `user_id = <id do token>` em cada WHERE e em cada INSERT. Só o servidor usa
// esta conexão; ela nunca vai para o navegador. A RLS (ligada em todas as
// tabelas v2, sem políticas) e a migração 0016 protegem o acesso direto pela
// chave pública (PostgREST).

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { log } from './log.js';

let instance: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (!instance) {
    const pool = new pg.Pool({
      host: process.env.SQL_HOST,
      port: Number(process.env.SQL_PORT ?? 6543),
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME ?? 'postgres',
      ssl: sslConfig(),
      max: 3,
      connectionTimeoutMillis: 15_000,
    });
    pool.on('error', (err) => log.erro('[db] erro em conexão ociosa:', err.message));
    instance = drizzle(pool);
  }
  return instance;
}

// Supabase exige SSL; SQL_SSL=false só para um Postgres local de teste.
// Com SQL_CA_CERT (o certificado do Supabase, em Project Settings →
// Database → SSL Configuration) o servidor confere quem está do outro
// lado; sem ele a conexão é criptografada, mas sem essa conferência.
export function sslConfig(env: NodeJS.ProcessEnv = process.env): false | { rejectUnauthorized: boolean; ca?: string } {
  if (env.SQL_SSL === 'false') return false;
  const ca = env.SQL_CA_CERT?.replace(/\\n/g, '\n').trim();
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false };
}
