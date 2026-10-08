// Jogos: Radar do Tico (certo ou errado), Memória do Tico, Caça-palavras e
// Cruzadinha. O servidor sorteia o conteúdo, guarda o gabarito na rodada,
// confere as jogadas e decide XP e recorde (CLAUDE.md, regra 2). A tela só
// recebe o que precisa para jogar: no Radar e na Cruzadinha, a resposta só
// aparece depois da jogada.
//
// XP: só nas JOGO_RODADAS_COM_XP primeiras rodadas completas de cada jogo
// por dia. Jogo não gasta vida; rodada completa conta como dia de estudo.

import { AFIRMACOES, GLOSSARIO, letras, type Termo } from '../content/jogos.js';
import { DISCIPLINAS } from '../content/trilha.js';
import type { DisciplinaId } from '../content/types.js';
import {
  CACA_TAMANHO, JOGOS, JOGO_RECORDE_MAIOR, JOGO_RODADAS_COM_XP, JOGO_XP, MEMORIA_PARES, RADAR_TAMANHO,
  type JogadaResultado, type JogoFim, type JogoResumo, type JogoRodada, type JogoTipo,
} from '../shared/game.js';
import { GameError, loadStats, studyDay, toProgress, touchStreak, type GameStore, type RoundRow, type UserTx } from './game.js';
import { embaralhar, gerarCaca, gerarCruzadinha, type Sorteio } from './grades.js';

// Menos que isso para achar 6 pares não é jogo, é atalho.
export const MEMORIA_TEMPO_MIN_SEG = 5;
const CACA_PALAVRAS = 7;
const CRUZ_MAX = 11; // lado máximo da grade (cabe no celular)
const CRUZ_ALVO = 7;

type Estado =
  | { tipo: 'radar'; ids: string[]; acertos: (boolean | null)[] }
  // pares: carta → par (só o servidor sabe); jogadas e achados contados aqui.
  | { tipo: 'memoria'; pares?: Record<string, string>; achados?: string[]; jogadas?: number }
  | { tipo: 'caca'; palavras: string[]; encontradas: string[] }
  | { tipo: 'cruzadinha'; respostas: Record<string, string>; corretas: string[] };

const invalida = (msg = 'Jogada inválida.') => new GameError('ACAO_INVALIDA', 400, msg);

function lerTipo(tipo: unknown): JogoTipo {
  if (!JOGOS.includes(tipo as JogoTipo)) throw invalida('Jogo inválido.');
  return tipo as JogoTipo;
}

function lerDisciplina(d: unknown): DisciplinaId | null {
  if (d === null || d === undefined || d === '') return null;
  if (!DISCIPLINAS.some((x) => x.id === d)) throw invalida('Matéria inválida.');
  return d as DisciplinaId;
}

// Termos da matéria (ou de todas), sem repetir a mesma palavra.
function termos(disciplina: DisciplinaId | null, maxLetras: number): Termo[] {
  const vistos = new Set<string>();
  return GLOSSARIO.filter((t) => {
    const l = letras(t.termo);
    if ((disciplina && t.disciplina !== disciplina) || l.length > maxLetras || vistos.has(l)) return false;
    vistos.add(l);
    return true;
  });
}

function segundos(row: RoundRow, now: Date): number {
  return Math.max(1, Math.round((now.getTime() - row.startedAt.getTime()) / 1000));
}

// ---------------------------------------------------------------- Começar
export async function startJogo(
  store: GameStore, userId: string, input: { tipo: JogoTipo; disciplina: DisciplinaId | null },
  random: Sorteio = Math.random, now = new Date(),
): Promise<JogoRodada> {
  const tipo = lerTipo(input.tipo);
  const disciplina = lerDisciplina(input.disciplina);
  const { publico, estado } = montar(tipo, disciplina, random);
  const id = await store.withUser(userId, (tx) => tx.createRound({ tipo, disciplina, day: studyDay(now), startedAt: now, estado }));
  return { ...publico, id } as JogoRodada;
}

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never;

function montar(tipo: JogoTipo, disciplina: DisciplinaId | null, random: Sorteio): { publico: SemId<JogoRodada>; estado: Estado } {
  if (tipo === 'radar') {
    const pool = AFIRMACOES.filter((a) => !disciplina || a.disciplina === disciplina);
    const itens = embaralhar(pool, random).slice(0, RADAR_TAMANHO);
    return {
      publico: { tipo, disciplina, itens: itens.map((a) => ({ texto: a.texto, disciplina: a.disciplina })) },
      estado: { tipo, ids: itens.map((a) => a.id), acertos: itens.map(() => null) },
    };
  }
  if (tipo === 'memoria') {
    // Até 10 letras: cabe numa carta no celular sem quebrar a palavra.
    const escolhidos = embaralhar(termos(disciplina, 10), random).slice(0, MEMORIA_PARES);
    const cartas = embaralhar(escolhidos.flatMap((t, i) => [
      { texto: t.termo, par: `p${i}`, lado: 'termo' as const },
      { texto: t.dica, par: `p${i}`, lado: 'dica' as const },
    ]), random).map((c, i) => ({ ...c, id: `c${i}` }));
    return {
      publico: { tipo, disciplina, cartas: cartas.map(({ id, texto, lado }) => ({ id, texto, lado })) },
      estado: { tipo, pares: Object.fromEntries(cartas.map((c) => [c.id, c.par])), achados: [], jogadas: 0 },
    };
  }
  if (tipo === 'caca') {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      const escolhidos = embaralhar(termos(disciplina, CACA_TAMANHO), random).slice(0, CACA_PALAVRAS);
      const grade = gerarCaca(escolhidos.map((t) => letras(t.termo)), CACA_TAMANHO, random);
      if (!grade) continue;
      return {
        publico: { tipo, disciplina, grade: grade.grade, palavras: escolhidos.map((t) => ({ palavra: letras(t.termo), dica: t.dica })) },
        estado: { tipo, palavras: escolhidos.map((t) => letras(t.termo)), encontradas: [] },
      };
    }
    throw new GameError('SEM_CONTEUDO', 500, 'Não deu para montar o caça-palavras. Tente de novo.');
  }
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const candidatos = embaralhar(termos(disciplina, CRUZ_MAX - 1), random).slice(0, 14);
    const r = gerarCruzadinha(candidatos.map((t) => ({ resposta: letras(t.termo), dica: t.dica })), random, { max: CRUZ_MAX, alvo: CRUZ_ALVO });
    if (!r) continue;
    return {
      publico: {
        tipo, disciplina, largura: r.largura, altura: r.altura,
        pistas: r.entradas.map((e) => ({ n: e.n, direcao: e.direcao, linha: e.linha, coluna: e.coluna, tamanho: e.resposta.length, dica: e.dica })),
      },
      estado: { tipo, respostas: Object.fromEntries(r.entradas.map((e) => [`${e.n}${e.direcao}`, e.resposta])), corretas: [] },
    };
  }
  throw new GameError('SEM_CONTEUDO', 500, 'Não deu para montar a cruzadinha. Tente de novo.');
}

async function rodadaAberta(tx: UserTx, id: string): Promise<RoundRow & { estado: Estado }> {
  const row = typeof id === 'string' && id ? await tx.round(id) : null;
  if (!row) throw new GameError('JOGO_INEXISTENTE', 404, 'Rodada não encontrada.');
  if (row.finishedAt) throw new GameError('JOGO_ENCERRADO', 409, 'Esta rodada já terminou.');
  return row as RoundRow & { estado: Estado };
}

// ---------------------------------------------------------------- Jogar
export async function jogar(store: GameStore, userId: string, id: string, jogada: Record<string, unknown>, _now = new Date()): Promise<JogadaResultado> {
  return store.withUser(userId, async (tx) => {
    const row = await rodadaAberta(tx, id);
    const estado = row.estado;
    if (estado.tipo === 'radar') {
      const { indice, resposta } = jogada;
      if (typeof indice !== 'number' || !Number.isInteger(indice) || indice < 0 || indice >= estado.ids.length || typeof resposta !== 'boolean') throw invalida();
      const a = AFIRMACOES.find((x) => x.id === estado.ids[indice])!;
      if (estado.acertos[indice] === null) {
        estado.acertos[indice] = resposta === a.certo; // vale a primeira resposta
        await tx.saveRound(row.id, { estado });
      }
      return { tipo: 'radar', indice, acertou: estado.acertos[indice]!, certo: a.certo, explicacao: a.explicacao };
    }
    if (estado.tipo === 'caca') {
      if (typeof jogada.palavra !== 'string') throw invalida();
      const palavra = letras(jogada.palavra);
      const valida = estado.palavras.includes(palavra);
      if (valida && !estado.encontradas.includes(palavra)) {
        estado.encontradas.push(palavra);
        await tx.saveRound(row.id, { estado });
      }
      return { tipo: 'caca', palavra, valida, encontradas: estado.encontradas.length, total: estado.palavras.length };
    }
    if (estado.tipo === 'cruzadinha') {
      const respostas = jogada.respostas;
      if (!respostas || typeof respostas !== 'object' || Array.isArray(respostas)) throw invalida();
      const enviadas = respostas as Record<string, unknown>;
      const certas = new Set(estado.corretas);
      for (const [chave, resposta] of Object.entries(estado.respostas)) {
        const v = enviadas[chave];
        if (typeof v === 'string' && letras(v) === resposta) certas.add(chave);
      }
      estado.corretas = Object.keys(estado.respostas).filter((k) => certas.has(k));
      await tx.saveRound(row.id, { estado });
      return { tipo: 'cruzadinha', corretas: estado.corretas, completa: estado.corretas.length === Object.keys(estado.respostas).length };
    }
    // Memória: cada par de cartas viradas é uma jogada, contada aqui.
    const { pares, achados = [], jogadas = 0 } = estado;
    if (!pares) throw invalida('Esta rodada é de uma versão antiga do jogo. Comece outra.');
    const cartas = jogada.cartas;
    if (!Array.isArray(cartas) || cartas.length !== 2) throw invalida();
    const [a, b] = cartas as unknown[];
    if (typeof a !== 'string' || typeof b !== 'string' || a === b || !Object.hasOwn(pares, a) || !Object.hasOwn(pares, b)) throw invalida();
    if (achados.includes(pares[a]!) || achados.includes(pares[b]!)) throw invalida('Este par já foi achado.');
    const par = pares[a] === pares[b];
    const novo = { tipo: 'memoria' as const, pares, achados: par ? [...achados, pares[a]!] : achados, jogadas: jogadas + 1 };
    await tx.saveRound(row.id, { estado: novo });
    return { tipo: 'memoria', cartas: [a, b], par, achados: novo.achados.length, total: MEMORIA_PARES, jogadas: novo.jogadas };
  });
}

// ---------------------------------------------------------------- Terminar
export async function terminarJogo(store: GameStore, userId: string, id: string, now = new Date()): Promise<JogoFim> {
  return store.withUser(userId, async (tx) => {
    const row = await rodadaAberta(tx, id);
    const estado = row.estado;
    let completo: boolean;
    let pontos: number;
    if (estado.tipo === 'radar') {
      completo = estado.acertos.every((a) => a !== null);
      pontos = estado.acertos.filter(Boolean).length;
    } else if (estado.tipo === 'memoria') {
      // Pontos = jogadas contadas pelo servidor; a tela não manda placar.
      completo = (estado.achados?.length ?? 0) === MEMORIA_PARES;
      pontos = estado.jogadas ?? 0;
      if (completo && segundos(row, now) < MEMORIA_TEMPO_MIN_SEG) throw new GameError('JOGO_RAPIDO', 409, 'Rodada rápida demais. Jogue de novo com calma.');
    } else if (estado.tipo === 'caca') {
      completo = estado.encontradas.length === estado.palavras.length;
      pontos = segundos(row, now);
    } else {
      completo = estado.corretas.length === Object.keys(estado.respostas).length;
      pontos = segundos(row, now);
    }

    const plan = await tx.plan();
    let stats = await loadStats(tx, now);
    if (!completo) {
      await tx.saveRound(row.id, { finishedAt: now, pontos: null, xp: 0 });
      return { completo, pontos: null, xpGanho: 0, recorde: false, progress: toProgress(stats, plan, now) };
    }

    const feitasHoje = (await tx.roundsCompletedOnDay(row.day)).find((r) => r.tipo === row.tipo)?.n ?? 0;
    const xpGanho = feitasHoje < JOGO_RODADAS_COM_XP ? (row.tipo === 'radar' ? Math.min(pontos, JOGO_XP.radar) : JOGO_XP[row.tipo]) : 0;
    const antes = (await tx.roundRecords()).find((r) => r.tipo === row.tipo);
    const maior = JOGO_RECORDE_MAIOR[row.tipo];
    const anterior = antes ? (maior ? antes.max : antes.min) : null;
    const recorde = anterior === null || (maior ? pontos > anterior : pontos < anterior);

    await tx.saveRound(row.id, { finishedAt: now, pontos, xp: xpGanho });
    stats = touchStreak(stats, studyDay(now));
    stats = { ...stats, xp: stats.xp + xpGanho };
    await tx.saveStats(stats);
    return { completo, pontos, xpGanho, recorde, progress: toProgress(stats, plan, now) };
  });
}

// ---------------------------------------------------------------- Resumo (tela dos jogos)
export async function getJogos(store: GameStore, userId: string, now = new Date()): Promise<{ jogos: JogoResumo[] }> {
  return store.withUser(userId, async (tx) => {
    const hoje = await tx.roundsCompletedOnDay(studyDay(now));
    const recordes = await tx.roundRecords();
    return {
      jogos: JOGOS.map((tipo) => {
        const r = recordes.find((x) => x.tipo === tipo);
        return {
          tipo,
          recorde: r ? (JOGO_RECORDE_MAIOR[tipo] ? r.max : r.min) : null,
          rodadasHoje: hoje.find((x) => x.tipo === tipo)?.n ?? 0,
          rodadasComXp: JOGO_RODADAS_COM_XP,
        };
      }),
    };
  });
}
