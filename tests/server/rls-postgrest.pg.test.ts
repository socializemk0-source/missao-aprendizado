// Acesso DIRETO ao banco pela Data API (PostgREST), sem passar pelas nossas
// Functions: a chave pública (anon) e o JWT do aluno A tentam ler, criar,
// alterar e apagar dados do aluno B em todas as tabelas do v2.
//
// Local (PG_TEST=1 e POSTGREST_BIN=<caminho do binário>): monta os papéis do
// Supabase (anon, authenticated, authenticator, auth.uid()) no Postgres de
// teste, sobe o PostgREST expondo o v2 e testa em dois cenários:
//   1. pior caso — alguém deu GRANT de tudo para anon/authenticated no v2:
//      só a RLS segura (nada aparece, nada é gravado);
//   2. padrão — depois da migração 0016: os papéis nem enxergam o schema.
//
// Produção (RLS_REST_URL, RLS_ANON_KEY, RLS_JWT_A e RLS_USER_B): só leituras
// (GET), em todas as tabelas do v2 — ver docs/seguranca.md.
import { spawn, type ChildProcess } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { createMeHandler } from '../../api/me.js';
import { questao } from '../../content/trilha.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const local = process.env.PG_TEST === '1' && Boolean(process.env.POSTGREST_BIN) && ['localhost', '127.0.0.1'].includes(process.env.SQL_HOST ?? '');
const remoto = Boolean(process.env.RLS_REST_URL && process.env.RLS_ANON_KEY && process.env.RLS_JWT_A && process.env.RLS_USER_B);

const SEGREDO = 'segredo-do-postgrest-so-para-teste-local-0123456789';
const b64 = (v: string | Buffer) => Buffer.from(v).toString('base64url');
function jwt(payload: Record<string, unknown>, segredo = SEGREDO): string {
  const corpo = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify(payload))}`;
  return `${corpo}.${b64(createHmac('sha256', segredo).update(corpo).digest())}`;
}

// Tabelas do v2 segundo as migrações (vale para o modo produção, sem acesso ao catálogo).
function tabelasDasMigracoes(): string[] {
  const nomes = new Set<string>();
  for (const f of readdirSync('supabase/migrations')) {
    for (const m of readFileSync(`supabase/migrations/${f}`, 'utf8').matchAll(/CREATE TABLE IF NOT EXISTS v2\.(\w+)/gi)) nomes.add(m[1]!);
  }
  return [...nomes].sort();
}

interface Resposta { status: number; body: unknown }
const ok = (r: Resposta) => r.status >= 200 && r.status < 300;
// Passou: o PostgREST recusou, ou respondeu sem nenhuma linha.
const semDados = (r: Resposta) => !ok(r) || (Array.isArray(r.body) && r.body.length === 0) || r.body === null || r.body === '';

async function rest(base: string, apikey: string, token: string | null, method: string, path: string, body?: unknown): Promise<Resposta> {
  const headers: Record<string, string> = {
    apikey, 'Accept-Profile': 'v2', 'Content-Profile': 'v2', Prefer: 'return=representation', 'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : ''; } catch { /* texto */ }
  return { status: res.status, body: parsed };
}

describe.runIf(local)('RLS pela Data API (PostgREST local, papéis do Supabase)', async () => {
  const { sql } = await import('drizzle-orm');
  const { db } = await import('../../server/db.js');
  const { postgresGame } = await import('../../server/game-pg.js');
  const { postgresProfiles } = await import('../../server/profiles.js');
  const { postgresIdempotency } = await import('../../server/idempotencia.js');
  const linhas = <T,>(r: unknown) => (r as { rows: T[] }).rows;

  const A = crypto.randomUUID();
  const B = crypto.randomUUID();
  const porta = 39000 + Math.floor(Math.random() * 1000);
  const base = `http://127.0.0.1:${porta}`;
  const anonKey = jwt({ role: 'anon', iss: 'supabase', exp: Math.floor(Date.now() / 1000) + 3600 });
  const jwtA = jwt({ sub: A, role: 'authenticated', aud: 'authenticated', email: 'a@teste.dev', exp: Math.floor(Date.now() / 1000) + 3600 });
  let proc: ChildProcess | null = null;
  let tabelas: { nome: string; colunas: string[] }[] = [];
  const ids: Record<string, string> = {};

  async function subir() {
    proc = spawn(process.env.POSTGREST_BIN!, [], {
      env: {
        ...process.env,
        PGRST_DB_URI: `postgres://authenticator:authenticator@${process.env.SQL_HOST}:${process.env.SQL_PORT ?? 5432}/${process.env.SQL_DB_NAME ?? 'postgres'}`,
        PGRST_DB_SCHEMAS: 'v2', PGRST_DB_ANON_ROLE: 'anon', PGRST_JWT_SECRET: SEGREDO, PGRST_JWT_AUD: 'authenticated',
        PGRST_SERVER_PORT: String(porta), PGRST_SERVER_HOST: '127.0.0.1', PGRST_DB_CHANNEL_ENABLED: 'false', PGRST_LOG_LEVEL: 'crit',
      },
      stdio: 'ignore',
    });
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${base}/`, { headers: { 'Accept-Profile': 'v2' } })).status < 500) return; } catch { /* subindo */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('PostgREST não subiu');
  }
  async function descer() {
    if (!proc) return;
    const p = proc;
    proc = null;
    await new Promise<void>((r) => { p.once('exit', () => r()); p.kill('SIGTERM'); });
  }

  // Retrato das linhas do A e do B (os outros testes, em paralelo, mexem no
  // resto do banco). Uma escrita indevida pela Data API também aparece como
  // resposta 2xx com linhas, conferida em semDados.
  async function contagens(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const t of tabelas.filter((x) => x.colunas.includes('user_id'))) {
      const r = await db().execute(sql.raw(`select coalesce(md5(string_agg(x::text, '|' order by x::text)), '-') as h, count(*)::int as n
        from v2.${t.nome} x where user_id in ('${A}', '${B}')`));
      const { h, n } = linhas<{ h: string; n: number }>(r)[0]!;
      out[t.nome] = `${n}:${h}`;
    }
    return out;
  }

  beforeAll(async () => {
    // Papéis e auth.uid() como no Supabase (só no Postgres de teste).
    await db().execute(sql.raw(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'authenticator'; END IF;
      END $$;
      GRANT anon, authenticated TO authenticator;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $f$ SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $f$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated;`));

    // O aluno B estuda de verdade (pelas nossas rotas): perfil, respostas,
    // simulado, rodada de jogo, plano e chave de idempotência.
    const me = createMeHandler({ verifyToken: fakeVerify, profiles: postgresProfiles });
    const game = createGameHandler({ verifyToken: fakeVerify, store: postgresGame, limiter: null, idempotency: postgresIdempotency });
    const chamar = async (h: typeof me, method: string, query: Record<string, string>, body?: unknown) => {
      const res = makeRes();
      await h(makeReq({ method, query, body, token: `ok:${B}`, headers: method === 'POST' ? { 'idempotency-key': crypto.randomUUID() } : {} }), res);
      expect(res.statusCode).toBe(200);
      return res.body;
    };
    await chamar(me, 'PATCH', {}, { displayName: 'Beatriz' });
    await chamar(game, 'POST', { action: 'responder' }, { questionId: 'pt-acent-1', choice: questao('pt-acent-1')!.correta, mode: 'trilha' });
    ids.simulado = (await chamar(game, 'POST', { action: 'simulado-iniciar' }, { nivel: 'misto', disciplinas: ['portugues'], quantidade: 5 })).id;
    ids.rodada = (await chamar(game, 'POST', { action: 'jogo-iniciar' }, { tipo: 'radar' })).id;
    await chamar(game, 'POST', { action: 'plano-salvar' }, { prova: 'TRT', minutosDia: 30, nivel: 'iniciante', disciplinas: ['portugues'] });

    tabelas = linhas<{ nome: string; colunas: string[] }>(await db().execute(sql`
      select c.table_name as nome, array_agg(c.column_name::text order by c.ordinal_position) as colunas
      from information_schema.columns c join information_schema.tables t using (table_schema, table_name)
      where c.table_schema = 'v2' and t.table_type = 'BASE TABLE' group by c.table_name order by 1`));
  }, 60_000);

  afterAll(async () => {
    await descer();
    // Volta ao padrão (0016) para não deixar GRANT no banco de teste.
    await db().execute(sql.raw(readFileSync('supabase/migrations/0016_v2_sem_acesso_publico.sql', 'utf8')));
  });

  it('todas as tabelas do v2 têm RLS ligada, sem nenhuma política, e não há funções expostas', async () => {
    expect(tabelas.length).toBeGreaterThanOrEqual(tabelasDasMigracoes().length);
    const semRls = linhas<{ relname: string }>(await db().execute(sql`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'v2' and c.relkind = 'r' and not c.relrowsecurity`));
    expect(semRls).toEqual([]);
    expect(linhas(await db().execute(sql`select policyname from pg_policies where schemaname = 'v2'`))).toEqual([]);
    expect(linhas(await db().execute(sql`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'v2'`))).toEqual([]);
  });

  async function ataque(cenario: string) {
    const antes = await contagens();
    const falhas: string[] = [];
    const conferir = (r: Resposta, o_que: string) => { if (!semDados(r)) falhas.push(`${cenario}: ${o_que} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`); };
    for (const quem of [{ nome: 'anon', token: null }, { nome: 'A', token: jwtA }]) {
      const q = (method: string, path: string, body?: unknown) => rest(base, anonKey, quem.token, method, path, body);
      for (const { nome: t, colunas } of tabelas) {
        const dono = colunas.includes('user_id') ? 'user_id' : null;
        const col = dono ?? colunas[0]!;
        const doB = dono ? `user_id=eq.${B}` : `${col}=not.is.null`;
        conferir(await q('GET', `/${t}?select=*`), `${quem.nome} GET ${t}`);
        conferir(await q('GET', `/${t}?${doB}`), `${quem.nome} GET ${t}?${doB}`);
        for (const id of [ids.simulado, ids.rodada]) if (colunas.includes('id')) conferir(await q('GET', `/${t}?id=eq.${id}`), `${quem.nome} GET ${t} id do B`);
        if (dono) {
          // O do B e um id que não existe respondem igual: nada confirma que o B existe.
          expect(await q('GET', `/${t}?user_id=eq.${B}`)).toEqual(await q('GET', `/${t}?user_id=eq.${crypto.randomUUID()}`));
        }
        conferir(await q('POST', `/${t}`, dono ? { user_id: B } : {}), `${quem.nome} POST ${t}`);
        conferir(await q('POST', `/${t}`, dono ? { user_id: A } : {}), `${quem.nome} POST ${t} (como A)`);
        conferir(await q('PATCH', `/${t}?${doB}`, { [col]: dono ? A : null }), `${quem.nome} PATCH ${t}`);
        conferir(await q('DELETE', `/${t}?${doB}`), `${quem.nome} DELETE ${t}`);
      }
    }
    expect(falhas).toEqual([]);
    expect(await contagens()).toEqual(antes);
  }

  it('pior caso — GRANT de tudo para anon/authenticated: a RLS sozinha não deixa ler nem gravar nada', async () => {
    await db().execute(sql.raw(`
      GRANT USAGE ON SCHEMA v2 TO anon, authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA v2 TO anon, authenticated;`));
    await subir();
    try {
      // Prova de que o GRANT valeu: a tabela é visível, só vem vazia.
      const r = await rest(base, anonKey, jwtA, 'GET', `/user_stats?user_id=eq.${B}`);
      expect(r).toEqual({ status: 200, body: [] });
      await ataque('pior caso');
    } finally {
      await descer();
    }
  }, 120_000);

  it('padrão (migração 0016): anon e authenticated nem enxergam o schema v2', async () => {
    await db().execute(sql.raw(readFileSync('supabase/migrations/0016_v2_sem_acesso_publico.sql', 'utf8')));
    await subir();
    try {
      const r = await rest(base, anonKey, jwtA, 'GET', `/user_stats?user_id=eq.${B}`);
      expect([401, 403]).toContain(r.status);
      await ataque('padrão');
    } finally {
      await descer();
    }
  }, 120_000);
});

describe.runIf(remoto)('RLS pela Data API (produção, só leitura)', () => {
  it('com a chave pública e o JWT do aluno A, nenhuma tabela do v2 devolve dados do B', async () => {
    const base = `${process.env.RLS_REST_URL!.replace(/\/$/, '')}/rest/v1`;
    const B = process.env.RLS_USER_B!;
    const falhas: string[] = [];
    for (const token of [null, process.env.RLS_JWT_A!]) {
      for (const t of tabelasDasMigracoes()) {
        for (const path of [`/${t}?select=*&limit=1`, `/${t}?user_id=eq.${B}&limit=1`]) {
          const r = await rest(base, process.env.RLS_ANON_KEY!, token, 'GET', path);
          if (!semDados(r)) falhas.push(`${token ? 'A' : 'anon'} GET ${path} → ${r.status}`);
        }
      }
    }
    expect(falhas).toEqual([]);
  }, 120_000);
});
