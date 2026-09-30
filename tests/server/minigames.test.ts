// Jogos (server/minigames.ts): o servidor sorteia o conteúdo, guarda o
// gabarito, confere as jogadas e decide XP e recorde. XP só nas 3 primeiras
// rodadas completas de cada jogo por dia.
import { describe, expect, it } from 'vitest';
import { AFIRMACOES, GLOSSARIO, letras } from '../../content/jogos.js';
import { getProgress } from '../../server/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { sementeAleatoria } from '../../server/grades.js';
import { getJogos, jogar, startJogo, terminarJogo } from '../../server/minigames.js';
import { JOGO_RODADAS_COM_XP, JOGO_XP, RADAR_TAMANHO, type JogoRodada } from '../../shared/game.js';

const T0 = new Date('2026-09-30T15:00:00Z');
const at = (s: number) => new Date(T0.getTime() + s * 1000);
const NEXT_DAY = 24 * 3600;

type Radar = Extract<JogoRodada, { tipo: 'radar' }>;
type Memoria = Extract<JogoRodada, { tipo: 'memoria' }>;
type Caca = Extract<JogoRodada, { tipo: 'caca' }>;
type Cruz = Extract<JogoRodada, { tipo: 'cruzadinha' }>;

const gabaritoRadar = (texto: string) => AFIRMACOES.find((a) => a.texto === texto)!.certo;
const termoDaDica = (dica: string) => letras(GLOSSARIO.find((t) => t.dica === dica)!.termo);

async function radarCompleto(store: ReturnType<typeof memoryGameStore>, user: string, t = 0, acertar = RADAR_TAMANHO) {
  const r = await startJogo(store, user, { tipo: 'radar', disciplina: null }, sementeAleatoria(t + 1), at(t)) as Radar;
  for (let i = 0; i < r.itens.length; i++) {
    const certo = gabaritoRadar(r.itens[i]!.texto);
    await jogar(store, user, r.id, { indice: i, resposta: i < acertar ? certo : !certo }, at(t + 1));
  }
  return { r, fim: await terminarJogo(store, user, r.id, {}, at(t + 30)) };
}

describe('Radar do Tico (certo ou errado)', () => {
  it('rodada vem sem gabarito; cada resposta volta com a explicação; responder de novo não muda nada', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'radar', disciplina: 'constitucional' }, sementeAleatoria(1), T0) as Radar;
    expect(r.itens).toHaveLength(RADAR_TAMANHO);
    for (const item of r.itens) {
      expect(Object.keys(item).sort()).toEqual(['disciplina', 'texto']);
      expect(item.disciplina).toBe('constitucional');
    }
    const certo = gabaritoRadar(r.itens[0]!.texto);
    const a = await jogar(store, 'u1', r.id, { indice: 0, resposta: certo }, T0);
    expect(a).toMatchObject({ tipo: 'radar', acertou: true, certo });
    expect(a.tipo === 'radar' && a.explicacao.length).toBeGreaterThan(20);
    const b = await jogar(store, 'u1', r.id, { indice: 0, resposta: !certo }, T0);
    expect(b).toMatchObject({ acertou: true }); // vale a primeira resposta
  });

  it('terminou tudo: pontos = acertos, XP = acertos, recorde; progresso e sequência de dias atualizados', async () => {
    const store = memoryGameStore();
    const { fim } = await radarCompleto(store, 'u1', 0, 7);
    expect(fim).toMatchObject({ completo: true, pontos: 7, xpGanho: 7, recorde: true });
    expect(fim.progress).toMatchObject({ xp: 7, streak: 1, studiedToday: true });
    const { fim: pior } = await radarCompleto(store, 'u1', 100, 5);
    expect(pior).toMatchObject({ pontos: 5, recorde: false });
  });

  it('desistir no meio: rodada encerrada sem XP e sem pontos', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'radar', disciplina: null }, sementeAleatoria(2), T0) as Radar;
    await jogar(store, 'u1', r.id, { indice: 0, resposta: true }, T0);
    const fim = await terminarJogo(store, 'u1', r.id, {}, at(10));
    expect(fim).toMatchObject({ completo: false, pontos: null, xpGanho: 0, recorde: false });
    await expect(jogar(store, 'u1', r.id, { indice: 1, resposta: true }, at(11))).rejects.toMatchObject({ code: 'JOGO_ENCERRADO', status: 409 });
    await expect(terminarJogo(store, 'u1', r.id, {}, at(12))).rejects.toMatchObject({ code: 'JOGO_ENCERRADO' });
  });

  it('jogada inválida (índice fora, resposta que não é certo/errado) → 400', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'radar', disciplina: null }, sementeAleatoria(3), T0);
    await expect(jogar(store, 'u1', r.id, { indice: 99, resposta: true }, T0)).rejects.toMatchObject({ code: 'ACAO_INVALIDA', status: 400 });
    await expect(jogar(store, 'u1', r.id, { indice: 0, resposta: 'sim' }, T0)).rejects.toMatchObject({ code: 'ACAO_INVALIDA' });
  });
});

describe('XP por dia', () => {
  it(`só as ${JOGO_RODADAS_COM_XP} primeiras rodadas completas de cada jogo no dia dão XP; no dia seguinte, volta`, async () => {
    const store = memoryGameStore();
    const xps: number[] = [];
    for (let i = 0; i < JOGO_RODADAS_COM_XP + 1; i++) xps.push((await radarCompleto(store, 'u1', i * 60)).fim.xpGanho);
    expect(xps).toEqual([...Array(JOGO_RODADAS_COM_XP).fill(RADAR_TAMANHO), 0]);
    expect((await radarCompleto(store, 'u1', NEXT_DAY)).fim.xpGanho).toBe(RADAR_TAMANHO);
    const hub = await getJogos(store, 'u1', at(NEXT_DAY + 60));
    expect(hub.jogos.find((j) => j.tipo === 'radar')).toMatchObject({ rodadasHoje: 1, rodadasComXp: JOGO_RODADAS_COM_XP, recorde: RADAR_TAMANHO });
    expect(hub.jogos.find((j) => j.tipo === 'memoria')).toMatchObject({ rodadasHoje: 0, recorde: null });
  });
});

describe('Memória do Tico', () => {
  it('6 pares: cada par tem o termo e a sua dica do glossário', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'memoria', disciplina: 'rlm' }, sementeAleatoria(4), T0) as Memoria;
    expect(r.cartas).toHaveLength(12);
    const pares = new Map<string, Memoria['cartas']>();
    for (const c of r.cartas) pares.set(c.par, [...(pares.get(c.par) ?? []), c]);
    expect(pares.size).toBe(6);
    for (const [, [a, b]] of pares) {
      const termo = [a!, b!].find((c) => c.lado === 'termo')!;
      const dica = [a!, b!].find((c) => c.lado === 'dica')!;
      expect(GLOSSARIO.find((t) => t.termo === termo.texto && t.disciplina === 'rlm')?.dica).toBe(dica.texto);
    }
  });

  it('terminar: pontos = jogadas (menos é melhor), XP fixo; rápido demais ou jogadas impossíveis são recusados', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'memoria', disciplina: null }, sementeAleatoria(5), T0);
    await expect(terminarJogo(store, 'u1', r.id, { jogadas: 9 }, at(2))).rejects.toMatchObject({ code: 'JOGO_RAPIDO' });
    await expect(terminarJogo(store, 'u1', r.id, { jogadas: 3 }, at(30))).rejects.toMatchObject({ code: 'ACAO_INVALIDA' });
    const fim = await terminarJogo(store, 'u1', r.id, { jogadas: 9 }, at(30));
    expect(fim).toMatchObject({ completo: true, pontos: 9, xpGanho: JOGO_XP.memoria, recorde: true });
    const r2 = await startJogo(store, 'u1', { tipo: 'memoria', disciplina: null }, sementeAleatoria(6), at(60));
    expect(await terminarJogo(store, 'u1', r2.id, { jogadas: 7 }, at(90))).toMatchObject({ pontos: 7, recorde: true });
  });

  it('sair no meio (sem jogadas): rodada encerrada sem XP', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'memoria', disciplina: null }, sementeAleatoria(12), T0);
    expect(await terminarJogo(store, 'u1', r.id, {}, at(3))).toMatchObject({ completo: false, pontos: null, xpGanho: 0 });
  });
});

describe('Caça-palavras', () => {
  it('grade 10×10 com as palavras listadas; achar todas conclui; pontos = segundos', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'caca', disciplina: 'informatica' }, sementeAleatoria(7), T0) as Caca;
    expect(r.grade).toHaveLength(10);
    expect(r.palavras.length).toBeGreaterThanOrEqual(6);
    for (const p of r.palavras) expect(GLOSSARIO.some((t) => letras(t.termo) === p.palavra && t.dica === p.dica)).toBe(true);
    expect(await jogar(store, 'u1', r.id, { palavra: 'XYZABC' }, at(5))).toMatchObject({ tipo: 'caca', valida: false });
    for (const [i, p] of r.palavras.entries()) {
      const res = await jogar(store, 'u1', r.id, { palavra: p.palavra.toLowerCase() }, at(10 + i));
      expect(res).toMatchObject({ valida: true, encontradas: i + 1, total: r.palavras.length });
    }
    const fim = await terminarJogo(store, 'u1', r.id, {}, at(95));
    expect(fim).toMatchObject({ completo: true, pontos: 95, xpGanho: JOGO_XP.caca, recorde: true });
  });

  it('terminar sem achar todas: sem XP', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'caca', disciplina: null }, sementeAleatoria(8), T0) as Caca;
    await jogar(store, 'u1', r.id, { palavra: r.palavras[0]!.palavra }, at(5));
    expect(await terminarJogo(store, 'u1', r.id, {}, at(20))).toMatchObject({ completo: false, xpGanho: 0 });
  });
});

describe('Cruzadinha', () => {
  it('pistas sem resposta; conferir mostra quais estão certas; completa dá XP', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'cruzadinha', disciplina: 'administrativo' }, sementeAleatoria(9), T0) as Cruz;
    expect(r.pistas.length).toBeGreaterThanOrEqual(5);
    for (const p of r.pistas) expect(Object.keys(p).sort()).toEqual(['coluna', 'dica', 'direcao', 'linha', 'n', 'tamanho']);
    const chave = (p: Cruz['pistas'][number]) => `${p.n}${p.direcao}`;
    const certas = Object.fromEntries(r.pistas.map((p) => [chave(p), termoDaDica(p.dica)]));
    const [primeira, ...resto] = r.pistas;
    const parcial = await jogar(store, 'u1', r.id, { respostas: { [chave(primeira!)]: certas[chave(primeira!)]!.toLowerCase(), [chave(resto[0]!)]: 'ERRADO' } }, at(30));
    expect(parcial).toMatchObject({ tipo: 'cruzadinha', corretas: [chave(primeira!)], completa: false });
    const tudo = await jogar(store, 'u1', r.id, { respostas: certas }, at(60));
    expect(tudo).toMatchObject({ completa: true });
    expect(await terminarJogo(store, 'u1', r.id, {}, at(61))).toMatchObject({ completo: true, pontos: 61, xpGanho: JOGO_XP.cruzadinha });
  });
});

describe('segurança e validação', () => {
  it('rodada de outro aluno não existe para você', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'radar', disciplina: null }, sementeAleatoria(10), T0);
    await expect(jogar(store, 'u2', r.id, { indice: 0, resposta: true }, T0)).rejects.toMatchObject({ code: 'JOGO_INEXISTENTE', status: 404 });
    await expect(terminarJogo(store, 'u2', r.id, {}, T0)).rejects.toMatchObject({ code: 'JOGO_INEXISTENTE' });
  });

  it('tipo ou matéria inválidos → 400', async () => {
    const store = memoryGameStore();
    await expect(startJogo(store, 'u1', { tipo: 'xadrez' as never, disciplina: null })).rejects.toMatchObject({ code: 'ACAO_INVALIDA', status: 400 });
    await expect(startJogo(store, 'u1', { tipo: 'radar', disciplina: 'fisica' as never })).rejects.toMatchObject({ code: 'ACAO_INVALIDA' });
  });

  it('jogar não mexe em vidas', async () => {
    const store = memoryGameStore();
    const r = await startJogo(store, 'u1', { tipo: 'radar', disciplina: null }, sementeAleatoria(11), T0) as Radar;
    for (let i = 0; i < r.itens.length; i++) await jogar(store, 'u1', r.id, { indice: i, resposta: !gabaritoRadar(r.itens[i]!.texto) }, T0);
    await terminarJogo(store, 'u1', r.id, {}, at(30));
    expect((await getProgress(store, 'u1', at(31))).hearts).toBe(5);
  });
});
