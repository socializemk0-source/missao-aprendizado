// /api/desafio — o Desafio do Tico (server/desafio.ts). Público, sem login:
//   GET  → as 4 questões de hoje, sem gabarito (igual para todo mundo: 5 min na CDN);
//   POST { id, resposta } → confere uma questão do desafio de hoje (ou de ontem,
//        para quem começou antes da meia-noite) e devolve a certa e a explicação.
// Não dá XP nem grava nada: é a porta de entrada antes do cadastro.

import { z } from 'zod';
import { diaAnterior, diaDoDesafio, desafioDoDia, questaoDoDesafio } from '../server/desafio.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { LIMITES, clientIp, limitar, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { comSeguranca } from '../server/seguranca.js';
import type { Correcao } from '../shared/desafio.js';

const respostaSchema = z.object({
  id: z.string().min(1).max(64),
  resposta: z.number().int().min(0).max(9),
}).strict();

export function createDesafioHandler(deps: { now?: () => number; limiter?: RateLimiter | null } = {}) {
  const { now = Date.now, limiter = null } = deps;
  return async function desafioHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
    const agora = new Date(now());
    if (!(await limitar(limiter, res, `desafio:${clientIp(req)}`, LIMITES.desafioPorMinuto, 60, agora, 'rate_limited'))) return;
    const hoje = diaDoDesafio(agora);

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60');
      res.status(200).json(desafioDoDia(hoje));
      return;
    }

    const parsed = respostaSchema.safeParse(jsonBody(req));
    if (!parsed.success) {
      res.status(400).json({ error: 'Resposta inválida.', code: 'invalid_params' });
      return;
    }
    const { id, resposta } = parsed.data;
    const q = questaoDoDesafio(hoje, id) ?? questaoDoDesafio(diaAnterior(hoje), id);
    if (!q) {
      res.status(404).json({ error: 'Essa questão não é do desafio de hoje. Recarregue a página.', code: 'fora_do_desafio' });
      return;
    }
    if (resposta >= q.alternativas.length) {
      res.status(400).json({ error: 'Resposta inválida.', code: 'invalid_params' });
      return;
    }
    const correcao: Correcao = { acertou: resposta === q.correta, correta: q.correta, explicacao: q.explicacao };
    res.status(200).json(correcao);
  };
}

export default comSeguranca(createDesafioHandler({ limiter: postgresLimiter }), { metodos: ['GET', 'POST'], headers: ['Content-Type'] });
