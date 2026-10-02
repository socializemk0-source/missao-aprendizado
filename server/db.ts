// Conexão com o Postgres do Supabase. Em serverless cada instância abre o
// próprio pool, por isso ele é pequeno e reaproveitado entre invocações.

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

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
    pool.on('error', (err) => console.error('[db] erro em conexão ociosa:', err.message));
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
