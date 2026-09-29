// /api/redacao
//   GET            temas, bancas, guias, rubrica, cota do aluno e histórico
//   GET ?id=       uma redação corrigida (texto + relatório)
//   POST           { topicId, bank, text } → corrige com a IA
// Plano Grátis: 1 correção a cada 7 dias. PRO: ilimitado.

import { BANCAS_REDACAO, CRITERIOS, GUIAS_BANCA, TEMAS, isBanca, tema } from '../content/redacao.js';
import { authenticate, type VerifyToken } from '../server/auth.js';
import { MAX_CHARS, MIN_WORDS, gradeEssay, totalScore, wordCount, type GradeResult } from '../server/essay.js';
import { postgresEssays, type EssayStore, type QuotaWindow } from '../server/essays.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { verifySupabaseToken } from '../server/supabase.js';
import type { EssayQuota } from '../shared/essay.js';
import type { BancaRedacao, Tema } from '../content/redacao.js';

export const FREE_LIMIT = 1;
export const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_MS = 5 * 60 * 1000; // reserva de uma função que morreu no meio
const PER_MINUTE = 5;

type Grade = (input: { bank: BancaRedacao; topic: Tema; text: string }) => Promise<GradeResult>;

export function createRedacaoHandler(deps: {
  verifyToken: VerifyToken;
  store: EssayStore;
  grade: Grade | null; // null = correção desligada (sem chave da OpenAI)
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  const recent = new Map<string, number[]>();

  const windowAt = (at: Date): Omit<QuotaWindow, 'limit'> => ({
    since: new Date(at.getTime() - WINDOW_MS),
    staleBefore: new Date(at.getTime() - STALE_MS),
  });

  async function quota(userId: string): Promise<EssayQuota> {
    const plano = await deps.store.plan(userId);
    if (plano === 'pro') return { plano, limite: null, usadas: 0, proximaEm: null };
    const at = now();
    const dates = await deps.store.counted(userId, windowAt(at));
    const oldest = dates.length ? Math.min(...dates.map((d) => d.getTime())) : null;
    return {
      plano, limite: FREE_LIMIT, usadas: dates.length,
      proximaEm: dates.length >= FREE_LIMIT && oldest !== null ? new Date(oldest + WINDOW_MS).toISOString() : null,
    };
  }

  return async function redacaoHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;
    res.setHeader('Cache-Control', 'no-store');

    try {
      if (req.method === 'GET') {
        const id = typeof req.query.id === 'string' ? req.query.id : '';
        if (id) {
          const essay = await deps.store.get(user.id, id);
          if (!essay) return res.status(404).json({ error: 'Redação não encontrada.' });
          return res.status(200).json({ redacao: essay });
        }
        return res.status(200).json({
          enabled: Boolean(deps.grade), minWords: MIN_WORDS, maxChars: MAX_CHARS,
          bancas: BANCAS_REDACAO, guias: GUIAS_BANCA, criterios: CRITERIOS, temas: TEMAS,
          cota: await quota(user.id), historico: await deps.store.list(user.id, 20),
        });
      }

      // ---- POST: corrigir
      if (!deps.grade) return res.status(503).json({ error: 'A correção por IA não está disponível agora. Seu texto continua salvo.', code: 'IA_DESLIGADA' });
      const body = jsonBody(req);
      const topic = typeof body?.topicId === 'string' ? tema(body.topicId) : undefined;
      const text = typeof body?.text === 'string' ? body.text : '';
      if (!body || !topic || !isBanca(body.bank) || text.length > MAX_CHARS || wordCount(text) < MIN_WORDS) {
        return res.status(400).json({ error: `Escolha um tema e escreva pelo menos ${MIN_WORDS} palavras (até ${MAX_CHARS.toLocaleString('pt-BR')} caracteres).`, code: 'ENVIO_INVALIDO' });
      }
      const bank = body.bank;

      const at = now();
      const times = (recent.get(user.id) ?? []).filter((t) => at.getTime() - t < 60_000);
      if (times.length >= PER_MINUTE) return res.status(429).json({ error: 'Muitas correções seguidas. Aguarde um minuto.', code: 'MUITAS_TENTATIVAS' });
      recent.set(user.id, [...times, at.getTime()]);

      const plan = await deps.store.plan(user.id);
      const window = plan === 'pro' ? null : { ...windowAt(at), limit: FREE_LIMIT };
      const id = await deps.store.reserve(user.id, { topicId: topic.id, topicTitle: topic.title, banca: bank, content: text }, window, at);
      if (!id) {
        return res.status(403).json({
          error: `O Plano Grátis tem ${FREE_LIMIT} correção por IA a cada 7 dias. Com o PRO as correções são ilimitadas. Seu texto continua salvo.`,
          code: 'LIMITE_PLANO_GRATIS', cota: await quota(user.id),
        });
      }

      let delivered = false;
      try {
        const result = await deps.grade({ bank, topic, text });
        if (!result.ok) {
          return res.status(502).json({ error: `${result.message} Nenhuma correção foi descontada e seu texto continua salvo.`, code: result.code });
        }
        const score = totalScore(result.report);
        // Gravado antes de responder: numa função serverless, trabalho
        // depois da resposta pode ser congelado. Se a gravação falhar, o
        // aluno recebe a correção mesmo assim (só não vai para o histórico).
        delivered = true;
        await deps.store.complete(id, result.report, score)
          .catch((err: unknown) => console.error('[redacao] falha ao gravar a correção:', err instanceof Error ? err.message : err));
        return res.status(200).json({ id, score, report: result.report, cota: await quota(user.id) });
      } finally {
        if (!delivered) await deps.store.release(id).catch((err: unknown) => console.error('[redacao] falha ao devolver a vaga:', err instanceof Error ? err.message : err));
      }
    } catch (err) {
      console.error('[redacao] erro:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Algo deu errado. Seu texto continua salvo; tente de novo.' });
    }
  };
}

const apiKey = process.env.OPENAI_API_KEY?.trim();

export default createRedacaoHandler({
  verifyToken: verifySupabaseToken,
  store: postgresEssays,
  grade: apiKey ? (input) => gradeEssay({ ...input, apiKey, model: process.env.OPENAI_MODEL }) : null,
});
