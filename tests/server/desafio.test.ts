// /api/desafio — o Desafio do Tico: 4 questões por dia, iguais para todo mundo,
// sem login. O servidor sorteia pelo dia de Brasília, nunca manda o gabarito
// antes da resposta e só corrige questões do desafio de hoje (ou de ontem, para
// quem começou antes da meia-noite).
import { describe, expect, it } from 'vitest';
import { createDesafioHandler } from '../../api/desafio.js';
import { DESAFIO_INICIO, desafioDoDia, diaDoDesafio, numeroDoDesafio } from '../../server/desafio.js';
import { LIMITES, memoryLimiter } from '../../server/limite.js';
import { questao } from '../../content/trilha.js';
import { makeReq, makeRes } from './helpers.js';

const QUANDO = Date.parse('2026-10-25T15:00:00Z'); // 25/10, meio-dia em Brasília

function setup(agora = QUANDO) {
  let now = agora;
  const handler = createDesafioHandler({ now: () => now, limiter: memoryLimiter() });
  const chamar = async (method: string, body?: unknown, ip = '1.1.1.1') => {
    const res = makeRes();
    await handler(makeReq({ method, body, headers: { 'x-forwarded-for': ip } }), res);
    return res;
  };
  return { chamar, avancar: (ms: number) => (now += ms) };
}

const proximoDia = (dia: string, n = 1) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe('Desafio do Tico — sorteio do dia', () => {
  it('o dia vira à meia-noite de Brasília, não à de Londres', () => {
    expect(diaDoDesafio(new Date('2026-10-26T02:30:00Z'))).toBe('2026-10-25'); // 23h30 em Brasília
    expect(diaDoDesafio(new Date('2026-10-26T03:00:00Z'))).toBe('2026-10-26');
  });

  it('numera a partir do primeiro dia', () => {
    expect(numeroDoDesafio(DESAFIO_INICIO)).toBe(1);
    expect(numeroDoDesafio(proximoDia(DESAFIO_INICIO, 9))).toBe(10);
  });

  it('4 questões, de 4 matérias diferentes, sempre as mesmas no mesmo dia', () => {
    const d = desafioDoDia('2026-10-25');
    expect(d.questoes).toHaveLength(4);
    expect(new Set(d.questoes.map((q) => q.disciplina)).size).toBe(4);
    expect(desafioDoDia('2026-10-25')).toEqual(d);
    expect(d.questoes.map((q) => q.disciplina).slice(0, 3)).toEqual(['portugues', 'rlm', 'informatica']);
    expect(['constitucional', 'administrativo']).toContain(d.questoes[3]!.disciplina);
  });

  it('nunca manda o gabarito nem a explicação junto com a questão', () => {
    for (let i = 0; i < 30; i++) {
      for (const q of desafioDoDia(proximoDia(DESAFIO_INICIO, i)).questoes) {
        expect(Object.keys(q).sort()).toEqual(['alternativas', 'assunto', 'disciplina', 'disciplinaNome', 'enunciado', 'id']);
      }
    }
  });

  it('não repete questão enquanto a matéria tiver questão nova', () => {
    const vistas = new Map<string, Set<string>>();
    for (let i = 0; i < 12; i++) {
      for (const q of desafioDoDia(proximoDia(DESAFIO_INICIO, i)).questoes) {
        const set = vistas.get(q.disciplina) ?? new Set<string>();
        expect(set.has(q.id)).toBe(false);
        set.add(q.id);
        vistas.set(q.disciplina, set);
      }
    }
  });
});

describe('GET /api/desafio', () => {
  it('devolve o desafio de hoje com número e dia', async () => {
    const { chamar } = setup();
    const res = await chamar('GET');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(desafioDoDia('2026-10-25'));
    expect((res.body as { numero: number }).numero).toBe(numeroDoDesafio('2026-10-25'));
  });

  it('é igual para todo mundo: fica um pouco na CDN, não no navegador', async () => {
    const { chamar } = setup();
    const res = await chamar('GET');
    expect(res.headers['Cache-Control']).toBe('public, max-age=0, s-maxage=300, stale-while-revalidate=60');
  });

  it('PUT/DELETE → 405', async () => {
    const { chamar } = setup();
    expect((await chamar('PUT')).statusCode).toBe(405);
    expect((await chamar('DELETE')).statusCode).toBe(405);
  });
});

describe('POST /api/desafio — conferir a resposta', () => {
  const hoje = desafioDoDia('2026-10-25');
  const q = hoje.questoes[0]!;
  const gabarito = questao(q.id)!;

  it('resposta certa: acertou, índice da certa e a explicação', async () => {
    const { chamar } = setup();
    const res = await chamar('POST', { id: q.id, resposta: gabarito.correta });
    expect([res.statusCode, res.body]).toEqual([200, { acertou: true, correta: gabarito.correta, explicacao: gabarito.explicacao }]);
  });

  it('resposta errada: mostra qual era a certa', async () => {
    const { chamar } = setup();
    const errada = (gabarito.correta + 1) % gabarito.alternativas.length;
    const res = await chamar('POST', { id: q.id, resposta: errada });
    expect(res.body).toEqual({ acertou: false, correta: gabarito.correta, explicacao: gabarito.explicacao });
  });

  it('quem abriu antes da meia-noite ainda pode terminar o desafio de ontem', async () => {
    const { chamar } = setup(Date.parse('2026-10-26T03:10:00Z')); // 00h10 do dia 26
    expect((await chamar('POST', { id: q.id, resposta: 0 })).statusCode).toBe(200);
  });

  it('questão fora do desafio de hoje e de ontem → 404 (o desafio não vira consulta de gabarito)', async () => {
    const { chamar } = setup();
    const outroDia = desafioDoDia('2026-10-28').questoes[0]!;
    const res = await chamar('POST', { id: outroDia.id, resposta: 0 });
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ code: 'fora_do_desafio' });
    expect(JSON.stringify(res.body)).not.toContain(questao(outroDia.id)!.explicacao);
  });

  it('corpo inválido ou com campo a mais → 400', async () => {
    const { chamar } = setup();
    for (const body of [{}, { id: q.id }, { id: q.id, resposta: -1 }, { id: q.id, resposta: 1.5 }, { id: q.id, resposta: '1' },
      { id: 'x'.repeat(200), resposta: 0 }, { id: q.id, resposta: 0, userId: 'u1' }, [q.id], 'texto']) {
      const res = await chamar('POST', body);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('alternativa que não existe → 400', async () => {
    const { chamar } = setup();
    expect((await chamar('POST', { id: q.id, resposta: gabarito.alternativas.length })).statusCode).toBe(400);
  });

  it('limite por IP: passou de LIMITES.desafioPorMinuto → 429; outro IP segue', async () => {
    const { chamar } = setup();
    for (let i = 0; i < LIMITES.desafioPorMinuto; i++) expect((await chamar('POST', { id: q.id, resposta: 0 })).statusCode).toBe(200);
    expect((await chamar('POST', { id: q.id, resposta: 0 })).statusCode).toBe(429);
    expect((await chamar('GET')).statusCode).toBe(429);
    expect((await chamar('GET', undefined, '2.2.2.2')).statusCode).toBe(200);
  });
});
