// Jogos no Postgres de verdade (PG_TEST=1): rodada gravada com o gabarito,
// jogadas, XP por dia, recorde e rodada de outro aluno invisível.
import { describe, expect, it } from 'vitest';
import { AFIRMACOES } from '../../content/jogos.js';
import { JOGO_RODADAS_COM_XP, RADAR_TAMANHO, type JogoRodada } from '../../shared/game.js';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('jogos no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');
  const { getJogos, jogar, startJogo, terminarJogo } = await import('../../server/minigames.js');
  const { sementeAleatoria } = await import('../../server/grades.js');
  const id = (s: string) => `pg-jogo-${Date.now()}-${s}`;
  const T0 = new Date('2026-09-30T15:00:00Z');
  const at = (s: number) => new Date(T0.getTime() + s * 1000);

  it('radar completo: XP nas 3 primeiras do dia, recorde, e outro aluno não acha a rodada', async () => {
    const u = id('a');
    const xps: number[] = [];
    let ultima = '';
    for (let k = 0; k <= JOGO_RODADAS_COM_XP; k++) {
      const r = await startJogo(postgresGame, u, { tipo: 'radar', disciplina: null }, sementeAleatoria(k + 1), at(k * 60)) as Extract<JogoRodada, { tipo: 'radar' }>;
      for (let i = 0; i < r.itens.length; i++) {
        const certo = AFIRMACOES.find((a) => a.texto === r.itens[i]!.texto)!.certo;
        await jogar(postgresGame, u, r.id, { indice: i, resposta: certo }, at(k * 60 + 1));
      }
      xps.push((await terminarJogo(postgresGame, u, r.id, {}, at(k * 60 + 30))).xpGanho);
      ultima = r.id;
    }
    expect(xps).toEqual([...Array(JOGO_RODADAS_COM_XP).fill(RADAR_TAMANHO), 0]);
    const hub = await getJogos(postgresGame, u, at(600));
    expect(hub.jogos.find((j) => j.tipo === 'radar')).toMatchObject({ recorde: RADAR_TAMANHO, rodadasHoje: JOGO_RODADAS_COM_XP + 1 });
    await expect(terminarJogo(postgresGame, id('b'), ultima, {}, at(700))).rejects.toMatchObject({ code: 'JOGO_INEXISTENTE' });
    await expect(jogar(postgresGame, u, 'nao-e-uuid', { indice: 0, resposta: true })).rejects.toMatchObject({ code: 'JOGO_INEXISTENTE' });
  });

  it('caça-palavras: palavras achadas ficam guardadas entre as jogadas', async () => {
    const u = id('c');
    const r = await startJogo(postgresGame, u, { tipo: 'caca', disciplina: 'rlm' }, sementeAleatoria(9), T0) as Extract<JogoRodada, { tipo: 'caca' }>;
    for (const p of r.palavras) await jogar(postgresGame, u, r.id, { palavra: p.palavra }, at(5));
    const fim = await terminarJogo(postgresGame, u, r.id, {}, at(80));
    expect(fim).toMatchObject({ completo: true, pontos: 80, recorde: true });
  });
});
