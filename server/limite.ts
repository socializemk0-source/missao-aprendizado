// Limite de chamadas por aluno e por IP. A contagem fica no Postgres
// (v2.rate_limits, migração 0012) para valer entre todas as instâncias da
// Vercel — um limite só em memória cada instância conta do zero.
//
// Janela fixa: a chave ganha um contador por janela de N segundos. Se o
// banco falhar, a chamada passa (fail-open): o limite é um freio contra
// abuso, nunca o motivo de o app cair.

import { sql } from 'drizzle-orm';
import { db } from './db.js';
import { header, type ApiRequest, type ApiResponse } from './http.js';
import { errorText } from './log.js';

export interface RateLimiter {
  // true = pode seguir; false = passou do limite nesta janela.
  hit(key: string, limit: number, windowSec: number, now?: Date): Promise<boolean>;
}

const janelaDe = (now: Date, windowSec: number) => Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000;

// clock: relógio fixo para testes (ignora a hora que vem na chamada).
export function memoryLimiter(clock?: () => Date): RateLimiter {
  const counts = new Map<string, number>();
  return {
    async hit(key, limit, windowSec, when = new Date()) {
      const now = clock?.() ?? when;
      const k = `${key}@${janelaDe(now, windowSec)}`;
      const n = (counts.get(k) ?? 0) + 1;
      counts.set(k, n);
      return n <= limit;
    },
  };
}

export const postgresLimiter: RateLimiter = {
  async hit(key, limit, windowSec, now = new Date()) {
    const janela = new Date(janelaDe(now, windowSec));
    const result = await db().execute(sql`
      insert into v2.rate_limits (chave, janela, n) values (${key}, ${janela}, 1)
      on conflict (chave, janela) do update set n = v2.rate_limits.n + 1
      returning n`);
    // Faxina de vez em quando: janelas de mais de 1 dia não servem mais.
    if (Math.random() < 0.01) {
      await db().execute(sql`delete from v2.rate_limits where janela < now() - interval '1 day'`).catch(() => {});
    }
    const n = Number((result as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 0);
    return n <= limit;
  },
};

// Conta a chamada e, se passou do limite, responde 429. Devolve se pode seguir.
export async function limitar(
  limiter: RateLimiter | null | undefined, res: ApiResponse, key: string, limit: number, windowSec: number, now = new Date(),
): Promise<boolean> {
  if (!limiter) return true;
  let ok = true;
  try {
    ok = await limiter.hit(key, limit, windowSec, now);
  } catch (err) {
    console.warn('[limite] contador indisponível, seguindo sem limite:', errorText(err));
    return true;
  }
  if (ok) return true;
  const espera = Math.max(1, Math.ceil((janelaDe(now, windowSec) + windowSec * 1000 - now.getTime()) / 1000));
  res.setHeader('Retry-After', String(espera));
  res.status(429).json({ error: 'Muitas ações seguidas. Espere um pouco e tente de novo.', code: 'MUITAS_TENTATIVAS' });
  return false;
}

// IP de quem chamou. Na Vercel, x-real-ip e o 1º item de x-forwarded-for
// são preenchidos pela própria Vercel (o cliente não consegue forjar).
export function clientIp(req: ApiRequest): string {
  return header(req, 'x-real-ip')?.trim() || header(req, 'x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
}

// Limites de cada rota (chamadas por minuto).
export const LIMITES = {
  ipPorMinuto: 600, // qualquer rota da API, antes do login (protege o Supabase Auth). Alto porque
  // escolas e operadoras de celular põem muita gente atrás do mesmo IP.
  jogoPorMinuto: 120, // /api/game por aluno
  perfilPorMinuto: 30, // /api/me por aluno
  pagamentosPorMinuto: 20, // /api/pagamentos por aluno (cada uma fala com o Mercado Pago)
  redacaoPorMinuto: 30, // /api/redacao por aluno (a correção em si tem limite próprio)
  professorPorMinuto: 60, // /api/professor por professor
  leadsPorMinuto: 5, // /api/leads por IP
  eventosPorMinuto: 60, // /api/eventos por aluno (ou por IP, sem login)
} as const;

// Antes do login: por IP (cada token falso custaria uma consulta ao Supabase Auth).
export const limitarIp = (limiter: RateLimiter | null | undefined, req: ApiRequest, res: ApiResponse, now?: Date) =>
  limitar(limiter, res, `ip:${clientIp(req)}`, LIMITES.ipPorMinuto, 60, now);

// Depois do login: por aluno, em cada rota.
export const limitarAluno = (limiter: RateLimiter | null | undefined, res: ApiResponse, rota: string, userId: string, porMinuto: number, now?: Date) =>
  limitar(limiter, res, `${rota}:${userId}`, porMinuto, 60, now);
