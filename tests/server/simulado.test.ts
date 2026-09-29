import { describe, expect, it } from 'vitest';
import { QUESTOES, faseDaQuestao, questao } from '../../content/trilha.js';
import type { Questao } from '../../content/types.js';
import { answer, getMissions, getProgress, getReviewSession } from '../../server/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { acertoPct, contentSource, nivelAtual } from '../../server/questions.js';
import { deliverSimulado, getSimulado, getSimuladoOptions, parseSimuladoInput, pickQuestions, startSimulado, type SimuladoInput } from '../../server/simulado.js';
import type { Plan } from '../../shared/game.js';

const T0 = new Date('2026-09-26T15:00:00Z');
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const at = (ms: number) => new Date(T0.getTime() + ms);
const seq = () => { let i = 0; return () => ((i++ * 0.61803) % 1); };

const bankQ = (n: number): Questao => ({
  id: `banco-fgv-2025-${n}`, disciplina: 'portugues', assunto: 'Crase', dificuldade: 3,
  enunciado: `Questão ${n} do banco (importada de prova) usada nos testes.`, alternativas: ['Certo', 'Errado'], correta: 0,
  explicacao: 'Certo. Explicação de teste com tamanho suficiente.', fonte: { tipo: 'oficial', banca: 'FGV', orgao: 'TJ', cargo: 'Analista', ano: 2025 },
});
const BANK = [1, 2, 3, 4, 5].map(bankQ);
const BANK_Q = BANK[0]!;

function setup(plans: Record<string, Plan> = {}, extra: Questao[] = []) {
  return memoryGameStore({ plan: (id) => plans[id] ?? 'free', questions: contentSource(extra) });
}

const input = (over: Partial<SimuladoInput> = {}): SimuladoInput => ({
  nivel: 'misto', disciplinas: ['portugues', 'rlm', 'informatica', 'constitucional', 'administrativo'], banca: null, quantidade: 10, cronometro: false, ...over,
});

const allRight = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, questao(id)?.correta ?? 0]));

describe('dificuldade', () => {
  it('vale a estimada até 30 respostas; depois o % de acerto real (70% / 40%)', () => {
    expect(nivelAtual(1, { respostas: 29, acertos: 0 })).toBe(1);
    expect(acertoPct({ respostas: 29, acertos: 29 })).toBeNull();
    expect(nivelAtual(3, { respostas: 30, acertos: 21 })).toBe(1); // 70%
    expect(nivelAtual(1, { respostas: 30, acertos: 20 })).toBe(2); // 67%
    expect(nivelAtual(1, { respostas: 30, acertos: 12 })).toBe(2); // 40%
    expect(nivelAtual(1, { respostas: 30, acertos: 11 })).toBe(3); // 37%
    expect(nivelAtual(2, undefined)).toBe(2);
  });

  it('só a 1ª resposta de cada aluno conta; a resposta mostra "% que acertam" a partir de 30', async () => {
    const store = setup();
    const q = 'pt-acent-1';
    for (let u = 0; u < 29; u++) await answer(store, `u${u}`, { questionId: q, choice: u < 10 ? questao(q)!.correta : 0, mode: 'trilha' }, T0);
    await answer(store, 'u0', { questionId: q, choice: questao(q)!.correta, mode: 'trilha' }, T0); // repetida: não conta
    expect(store.qstats.get(q)).toEqual({ respostas: 29, acertos: 10 });
    const r = await answer(store, 'u99', { questionId: q, choice: questao(q)!.correta, mode: 'trilha' }, T0);
    expect(r.acerto).toBe(Math.round((11 / 30) * 100));
  });
});

describe('sorteio', () => {
  const items = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `f${i}`, nivel: 1 as const })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, nivel: 2 as const })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, nivel: 3 as const })),
  ];
  it('fácil/médio/difícil só pegam o nível; faltando, devolve null', () => {
    expect(pickQuestions(items, 'dificil', 10, seq())!.every((id) => id.startsWith('d'))).toBe(true);
    expect(pickQuestions(items, 'facil', 11, seq())).toBeNull();
  });
  it('misto: 30% fáceis, 50% médias, 20% difíceis, completando com o que houver', () => {
    const ids = pickQuestions(items, 'misto', 10, seq())!;
    expect(ids.filter((i) => i.startsWith('f'))).toHaveLength(3);
    expect(ids.filter((i) => i.startsWith('m'))).toHaveLength(5);
    expect(ids.filter((i) => i.startsWith('d'))).toHaveLength(2);
    const few = pickQuestions(items.filter((i) => !i.id.startsWith('d')), 'misto', 10, seq())!;
    expect(new Set(few).size).toBe(10);
  });
});

describe('simulado', () => {
  it('começa sem gabarito, só com questões do plano do aluno, e respeita os filtros', async () => {
    const store = setup();
    const s = await startSimulado(store, 'u1', input({ nivel: 'facil', disciplinas: ['informatica'], quantidade: 5 }), T0, seq());
    expect(s.questoes).toHaveLength(5);
    for (const q of s.questoes) {
      expect(q).not.toHaveProperty('correta');
      expect(q).not.toHaveProperty('explicacao');
      expect(q.disciplina).toBe('informatica');
      expect(questao(q.id)!.dificuldade).toBe(1);
      expect(faseDaQuestao(q.id)!.capituloIndex).toBeLessThan(5); // grátis não recebe capítulo PRO
    }
    expect(s.prazo).toBeNull();
  });

  it('cronômetro: 3 min por questão', async () => {
    const s = await startSimulado(setup(), 'u1', input({ cronometro: true }), T0, seq());
    expect(new Date(s.prazo!).getTime() - T0.getTime()).toBe(10 * 3 * MIN);
  });

  it('grátis: 1 por dia; outro dia libera. PRO: sem limite, mas um aberto por vez', async () => {
    const free = setup();
    const s = await startSimulado(free, 'u1', input(), T0, seq());
    await deliverSimulado(free, 'u1', s.id, {}, at(MIN));
    await expect(startSimulado(free, 'u1', input(), at(2 * MIN), seq())).rejects.toMatchObject({ code: 'LIMITE_SIMULADO' });
    await expect(startSimulado(free, 'u1', input(), at(DAY), seq())).resolves.toBeTruthy();

    const pro = setup({ u1: 'pro' });
    const a = await startSimulado(pro, 'u1', input(), T0, seq());
    await expect(startSimulado(pro, 'u1', input(), at(MIN), seq())).rejects.toMatchObject({ code: 'SIMULADO_ABERTO', extra: { id: a.id } });
    await deliverSimulado(pro, 'u1', a.id, {}, at(2 * MIN));
    await expect(startSimulado(pro, 'u1', input(), at(3 * MIN), seq())).resolves.toBeTruthy();
  });

  it('poucas questões com os filtros → erro claro (e não conta no limite)', async () => {
    const store = setup();
    await expect(startSimulado(store, 'u1', input({ nivel: 'dificil', disciplinas: ['informatica'], quantidade: 10 }), T0, seq()))
      .rejects.toMatchObject({ code: 'POUCAS_QUESTOES' });
    await expect(startSimulado(store, 'u1', input(), T0, seq())).resolves.toBeTruthy();
  });

  it('entrega: corrige, dá XP só no 1º acerto, não gasta vidas, conta nas missões e manda erros para a revisão', async () => {
    const store = setup();
    const s = await startSimulado(store, 'u1', input({ nivel: 'facil', disciplinas: ['informatica'], quantidade: 5 }), T0, seq());
    const ids = s.questoes.map((q) => q.id);
    const known = ids[4]!;
    // Já dominada antes (e já contada na estatística): sem XP nem contagem de novo.
    await store.withUser('u1', (tx) => tx.saveQuestionState({ questionId: known, everCorrect: true, lastCorrect: true, timesWrong: 0 }));
    const respostas: Record<string, unknown> = allRight(ids);
    const erradas = ids.slice(0, 2);
    for (const id of erradas) respostas[id] = (questao(id)!.correta + 1) % questao(id)!.alternativas.length;
    respostas[ids[2]!] = 99; // inválida = em branco
    const before = (await getProgress(store, 'u1', T0)).xp;

    const { resultado, progress } = await deliverSimulado(store, 'u1', s.id, respostas, at(4 * MIN));
    expect(resultado).toMatchObject({ total: 5, respondidas: 4, acertos: 2, pct: 40, tempoSeg: 240 });
    const firstTime = 1; // ids[3]; ids[4] já era dominada
    expect(resultado.xpGanho).toBe(firstTime * 10);
    expect(store.qstats.get(ids[3]!)).toEqual({ respostas: 1, acertos: 1 });
    expect(store.qstats.get(ids[0]!)).toEqual({ respostas: 1, acertos: 0 });
    expect(store.qstats.get(known)).toBeUndefined();
    expect(store.qstats.get(ids[2]!)).toBeUndefined(); // em branco não conta
    expect(progress.xp).toBe(before + firstTime * 10);
    expect(progress.hearts).toBe(5);
    expect(resultado.questoes.find((q) => q.id === ids[2])!.escolha).toBeNull();
    expect(resultado.questoes[0]).toMatchObject({ correta: questao(ids[0]!)!.correta, explicacao: expect.any(String) });
    expect(resultado.porDisciplina).toEqual([{ disciplina: 'informatica', nome: 'Informática', acertos: 2, total: 5 }]);

    const missions = await getMissions(store, 'u1', at(5 * MIN));
    expect(missions.find((m) => m.id === 'responder-10')!.atual).toBe(4);
    // Os erros vão para a revisão, mesmo de fases que ainda não abriu na trilha.
    const review = await getReviewSession(store, 'u1');
    expect(review.questoes.map((q) => q.id).sort()).toEqual([...erradas].sort());
    const fixed = await answer(store, 'u1', { questionId: erradas[0]!, choice: questao(erradas[0]!)!.correta, mode: 'revisar' }, at(6 * MIN));
    expect(fixed.correct).toBe(true);
    await expect(answer(store, 'u1', { questionId: erradas[1]!, choice: 0, mode: 'trilha' }, at(6 * MIN))).rejects.toMatchObject({ code: 'FASE_BLOQUEADA' });
  });

  it('entregar de novo devolve o mesmo resultado, sem XP em dobro; outro aluno não vê', async () => {
    const store = setup();
    const s = await startSimulado(store, 'u1', input(), T0, seq());
    const ids = s.questoes.map((q) => q.id);
    const a = await deliverSimulado(store, 'u1', s.id, allRight(ids), at(MIN));
    const b = await deliverSimulado(store, 'u1', s.id, {}, at(2 * MIN));
    expect(b.resultado.acertos).toBe(a.resultado.acertos);
    expect(b.progress.xp).toBe(a.progress.xp);
    await expect(deliverSimulado(store, 'u2', s.id, {}, at(MIN))).rejects.toMatchObject({ code: 'SIMULADO_INEXISTENTE' });
    await expect(getSimulado(store, 'u2', s.id, at(MIN))).rejects.toMatchObject({ code: 'SIMULADO_INEXISTENTE' });
    expect((await getSimulado(store, 'u1', s.id, at(3 * MIN))).estado).toBe('entregue');
  });

  it('aberto: volta a sessão (sem gabarito); expira depois de 6 h', async () => {
    const store = setup();
    const s = await startSimulado(store, 'u1', input(), T0, seq());
    const open = await getSimulado(store, 'u1', s.id, at(MIN));
    expect(open).toMatchObject({ estado: 'aberto', sessao: { id: s.id } });
    expect((await getSimuladoOptions(store, 'u1', at(MIN))).aberto).toBe(s.id);
    await expect(getSimulado(store, 'u1', s.id, at(7 * 60 * MIN))).rejects.toMatchObject({ code: 'SIMULADO_INEXISTENTE' });
  });

  it('tempo conta até o limite do cronômetro', async () => {
    const store = setup();
    const s = await startSimulado(store, 'u1', input({ quantidade: 5, cronometro: true }), T0, seq());
    const { resultado } = await deliverSimulado(store, 'u1', s.id, {}, at(60 * MIN));
    expect(resultado.tempoSeg).toBe(5 * 180);
  });

  it('percentil: só com 10+ simulados de outros alunos no mesmo nível', async () => {
    const store = setup();
    const run = async (u: string, right: boolean) => {
      const s = await startSimulado(store, u, input({ quantidade: 5 }), T0, seq());
      return deliverSimulado(store, u, s.id, right ? allRight(s.questoes.map((q) => q.id)) : {}, at(MIN));
    };
    for (let i = 0; i < 9; i++) await run(`o${i}`, false);
    expect((await run('me', true)).resultado.percentil).toBeNull();
    await run('o9', false);
    const view = await getSimulado(store, 'me', (await getSimuladoOptions(store, 'me', at(MIN))).historico[0]!.id, at(MIN));
    expect(view.estado === 'entregue' && view.resultado.percentil).toBe(100);
  });

  it('dificuldade real muda o sorteio: "fácil" estimada que quase ninguém acerta vira difícil', async () => {
    const store = setup();
    const q = QUESTOES.find((x) => x.disciplina === 'informatica' && x.dificuldade === 1)!;
    store.qstats.set(q.id, { respostas: 40, acertos: 5 });
    for (let i = 0; i < 20; i++) {
      const s = await startSimulado(store, `x${i}`, input({ nivel: 'facil', disciplinas: ['informatica'], quantidade: 5 }), T0, Math.random);
      expect(s.questoes.map((x) => x.id)).not.toContain(q.id);
    }
    const opts = await getSimuladoOptions(store, 'u1', T0);
    const hard = opts.contagem.filter((c) => c.disciplina === 'informatica' && c.dificuldade === 3).reduce((a, c) => a + c.n, 0);
    const freeHard = QUESTOES.filter((x) => x.disciplina === 'informatica' && x.dificuldade === 3 && faseDaQuestao(x.id)!.capituloIndex < 5).length;
    expect(hard).toBe(freeHard + 1);
  });

  it('questão do banco (fora da trilha): cai no simulado, volta na revisão e só pode ser respondida lá', async () => {
    const store = setup({}, BANK);
    const s = await startSimulado(store, 'u1', input({ nivel: 'dificil', disciplinas: ['portugues'], banca: 'FGV', quantidade: 5 }), T0, seq());
    expect(s.questoes.map((q) => q.id).sort()).toEqual(BANK.map((q) => q.id).sort());
    await expect(answer(store, 'u2', { questionId: BANK_Q.id, choice: 0, mode: 'revisar' }, T0)).rejects.toMatchObject({ code: 'QUESTAO_INEXISTENTE' });
    await deliverSimulado(store, 'u1', s.id, { [BANK_Q.id]: 1 }, at(MIN));
    expect((await getReviewSession(store, 'u1')).questoes.map((q) => q.id)).toContain(BANK_Q.id);
    await expect(answer(store, 'u1', { questionId: BANK_Q.id, choice: 0, mode: 'trilha' }, at(2 * MIN))).rejects.toMatchObject({ code: 'QUESTAO_INEXISTENTE' });
    const r = await answer(store, 'u1', { questionId: BANK_Q.id, choice: 0, mode: 'revisar' }, at(2 * MIN));
    expect(r.correct).toBe(true);
    const opts = await getSimuladoOptions(store, 'u1', T0);
    expect(opts.bancas).toEqual(expect.arrayContaining(['Cebraspe', 'FGV']));
  });

  it('entrada do simulado é validada', () => {
    const ok = { nivel: 'medio', disciplinas: ['rlm'], quantidade: 10, cronometro: true, banca: null };
    expect(parseSimuladoInput(ok)).toMatchObject({ nivel: 'medio', cronometro: true });
    expect(parseSimuladoInput({ ...ok, nivel: 'extremo' })).toBeNull();
    expect(parseSimuladoInput({ ...ok, disciplinas: [] })).toBeNull();
    expect(parseSimuladoInput({ ...ok, disciplinas: ['quimica'] })).toBeNull();
    expect(parseSimuladoInput({ ...ok, quantidade: 7 })).toBeNull();
  });
});
