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
      // Supabase exige SSL; SQL_SSL=false só para um Postgres local de teste.
      ssl: process.env.SQL_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 15_000,
    });
    pool.on('error', (err) => console.error('[db] erro em conexão ociosa:', err.message));
    instance = drizzle(pool);
  }
  return instance;
}
