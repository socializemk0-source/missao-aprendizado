// Plano de estudos (Marco 1). Com o que o aluno contou no começo (prova,
// banca, data, tempo por dia, nível e matérias) e o desempenho dele, o
// servidor responde: o que estudar hoje, como está, onde erra e quanto
// falta. Tudo é recalculado a cada pedido — o plano acompanha o desempenho.

import { DISCIPLINAS, FASES, QUESTOES, faseDaQuestao, nomeDisciplina } from '../content/trilha.js';
import type { DisciplinaId, Questao } from '../content/types.js';
import {
  BANCAS_ALVO, MINUTOS_DIA, NIVEIS_ALUNO,
  type BancaAlvo, type DiaPlano, type DominioAssunto, type NivelAluno, type PerfilEstudo, type PlanoResposta, type Situacao, type Tarefa,
} from '../shared/estudo.js';
import {
  agendaRevisao, isOpen, loadStats, phaseStatusMap, reviewAllowed, studyDay, toProgress,
  type GameStore, type QuestionState, type UserTx,
} from './game.js';
import { addDays, diasEntre } from './revisao.js';

// ---------------------------------------------------------------- Onboarding
const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Confere o que veio da tela. Devolve o perfil ou o texto do erro.
export function parsePerfilEstudo(body: Record<string, unknown> | null, today: string): PerfilEstudo | string {
  if (!body) return 'Envio inválido.';
  const prova = typeof body.prova === 'string' ? body.prova.trim().replace(/\s+/g, ' ') : '';
  if (prova.length < 2 || prova.length > 80) return 'Conte qual concurso você vai prestar (até 80 letras).';
  const banca = body.banca === null || body.banca === undefined || body.banca === '' ? null : body.banca;
  if (banca !== null && !BANCAS_ALVO.includes(banca as BancaAlvo)) return 'Banca inválida.';
  let dataProva: string | null = null;
  if (body.dataProva !== null && body.dataProva !== undefined && body.dataProva !== '') {
    const d = body.dataProva;
    if (typeof d !== 'string' || !DATA.test(d) || Number.isNaN(Date.parse(`${d}T12:00:00Z`)) || new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) !== d) {
      return 'Data da prova inválida.';
    }
    if (d < today) return 'A data da prova já passou. Deixe em branco se ainda não tem data.';
    if (diasEntre(today, d) > 3 * 366) return 'A data da prova está longe demais. Deixe em branco se ainda não tem data.';
    dataProva = d;
  }
  const minutosDia = body.minutosDia;
  if (typeof minutosDia !== 'number' || !(MINUTOS_DIA as readonly number[]).includes(minutosDia)) return 'Escolha quanto tempo por dia você tem.';
  const nivel = body.nivel;
  if (typeof nivel !== 'string' || !NIVEIS_ALUNO.some((n) => n.id === nivel)) return 'Escolha seu nível.';
  const lista = Array.isArray(body.disciplinas) ? body.disciplinas : [];
  const disciplinas = DISCIPLINAS.map((d) => d.id).filter((id) => lista.includes(id));
  if (disciplinas.length === 0 || lista.length !== disciplinas.length) return 'Escolha pelo menos uma matéria da sua prova.';
  return { prova, banca: banca as BancaAlvo | null, dataProva, minutosDia, nivel: nivel as NivelAluno, disciplinas };
}

export async function saveStudyProfile(store: GameStore, userId: string, perfil: PerfilEstudo): Promise<void> {
  await store.withUser(userId, (tx) => tx.saveStudyProfile(perfil));
}

// ---------------------------------------------------------------- Domínio por assunto
// O assunto de uma questão da trilha é o título da fase dela; o de uma
// questão do banco, o assunto cadastrado.
export const assuntoDe = (q: Pick<Questao, 'id' | 'assunto'>) => faseDaQuestao(q.id)?.titulo ?? q.assunto;

const PESO_RECENCIA = (dias: number) => (dias <= 14 ? 1 : dias <= 30 ? 0.9 : dias <= 60 ? 0.8 : 0.7);

// Nota de 0 a 1 de uma questão respondida: metade é o acerto em todas as
// tentativas (repetição), metade é a última resposta; perde valor se faz
// tempo que o aluno não a vê (recência).
export function notaQuestao(s: QuestionState, today: string): number {
  const tentativas = s.timesRight + s.timesWrong;
  const acerto = tentativas > 0 ? s.timesRight / tentativas : s.lastCorrect ? 1 : 0;
  const ultima = s.lastCorrect ? 1 : 0;
  const dias = s.lastAnsweredAt ? Math.max(0, diasEntre(studyDay(s.lastAnsweredAt), today)) : 0;
  return (0.5 * acerto + 0.5 * ultima) * PESO_RECENCIA(dias);
}

export function situacaoDe(score: number | null, respondidas: number, total: number): Situacao {
  if (score === null) return 'nao-visto';
  if (score < 50) return 'fraco';
  return score >= 80 && respondidas * 2 >= total ? 'dominado' : 'progresso';
}

// Score do assunto: média das notas das questões respondidas, com peso
// pela dificuldade (questão difícil vale mais).
async function dominio(store: GameStore, tx: UserTx, today: string): Promise<DominioAssunto[]> {
  const states = await tx.questionStates();
  const foraDaTrilha = [...states.keys()].filter((id) => !faseDaQuestao(id));
  const banco = foraDaTrilha.length ? [...(await store.questions.get(foraDaTrilha)).values()] : [];
  const grupos = new Map<string, { disciplina: DisciplinaId; assunto: string; questoes: Questao[] }>();
  for (const q of [...QUESTOES.filter((x) => faseDaQuestao(x.id)), ...banco]) {
    const assunto = assuntoDe(q);
    const key = `${q.disciplina}|${assunto}`;
    if (!grupos.has(key)) grupos.set(key, { disciplina: q.disciplina, assunto, questoes: [] });
    grupos.get(key)!.questoes.push(q);
  }
  const ordem = new Map(DISCIPLINAS.map((d, i) => [d.id, i]));
  return [...grupos.values()]
    .sort((a, b) => ordem.get(a.disciplina)! - ordem.get(b.disciplina)!) // estável: mantém a ordem da trilha
    .map(({ disciplina, assunto, questoes }) => {
      let soma = 0;
      let pesos = 0;
      let respondidas = 0;
      for (const q of questoes) {
        const s = states.get(q.id);
        if (!s) continue;
        respondidas++;
        soma += q.dificuldade * notaQuestao(s, today);
        pesos += q.dificuldade;
      }
      const score = respondidas ? Math.round((100 * soma) / pesos) : null;
      return {
        disciplina, disciplinaNome: nomeDisciplina(disciplina), assunto, score,
        situacao: situacaoDe(score, respondidas, questoes.length), respondidas, total: questoes.length,
      };
    });
}

export async function getDominio(store: GameStore, userId: string, now = new Date()): Promise<DominioAssunto[]> {
  return store.withUser(userId, (tx) => dominio(store, tx, studyDay(now)));
}

// ---------------------------------------------------------------- Plano
// Minutos por questão (ler, responder e ler a explicação), pelo nível.
const MIN_POR_QUESTAO: Record<NivelAluno, number> = { iniciante: 3, intermediario: 2.5, avancado: 2 };

export function metaDiaria(perfil: Pick<PerfilEstudo, 'minutosDia' | 'nivel'>): number {
  return Math.min(90, Math.max(5, Math.round(perfil.minutosDia / MIN_POR_QUESTAO[perfil.nivel])));
}

const DIA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Média do domínio de uma matéria (só os assuntos já vistos).
function mediaDisciplina(dom: DominioAssunto[], d: DisciplinaId): number | null {
  const vistos = dom.filter((a) => a.disciplina === d && a.score !== null);
  return vistos.length ? vistos.reduce((s, a) => s + a.score!, 0) / vistos.length : null;
}

// Semana: 1 matéria de foco por dia (2 com 2 horas ou mais). Matéria mais
// fraca (ou ainda não vista) aparece mais vezes; a que ainda não abriu na
// trilha (não dá para praticar) aparece menos; nunca a mesma em dois dias
// seguidos se houver outra.
export function montarSemana(perfil: PerfilEstudo, dom: DominioAssunto[], today: string, abertas: ReadonlySet<DisciplinaId> = new Set(perfil.disciplinas)): DiaPlano[] {
  const porDia = Math.min(perfil.minutosDia >= 120 ? 2 : 1, perfil.disciplinas.length);
  const vagas = 7 * porDia;
  const peso = new Map(perfil.disciplinas.map((d) => {
    const m = mediaDisciplina(dom, d);
    return [d, !abertas.has(d) ? 30 : m === null ? 60 : Math.max(15, 100 - m)] as const;
  }));
  const somaPesos = [...peso.values()].reduce((a, b) => a + b, 0);
  // Cada matéria ganha pelo menos 1 vaga; o resto vai pela maior fração.
  const resto = vagas - perfil.disciplinas.length;
  const quotas = perfil.disciplinas.map((d) => ({ d, q: Math.max(0, resto) * peso.get(d)! / somaPesos }));
  const vagasDe = new Map(quotas.map(({ d, q }) => [d, 1 + Math.floor(q)]));
  let sobra = vagas - [...vagasDe.values()].reduce((a, b) => a + b, 0);
  for (const { d } of [...quotas].sort((a, b) => (b.q % 1) - (a.q % 1) || peso.get(b.d)! - peso.get(a.d)!)) {
    if (sobra-- <= 0) break;
    vagasDe.set(d, vagasDe.get(d)! + 1);
  }
  // Uma matéria aparece no máximo uma vez por dia: o que passar de 7 vai
  // para as outras, da mais fraca para a mais forte.
  let excesso = 0;
  for (const d of perfil.disciplinas) {
    excesso += Math.max(0, vagasDe.get(d)! - 7);
    vagasDe.set(d, Math.min(7, vagasDe.get(d)!));
  }
  const porPeso = [...perfil.disciplinas].sort((a, b) => peso.get(b)! - peso.get(a)!);
  while (excesso > 0) {
    const d = porPeso.find((x) => vagasDe.get(x)! < 7);
    if (!d) break;
    vagasDe.set(d, vagasDe.get(d)! + 1);
    excesso--;
  }
  // Distribui: a cada vaga, a matéria com mais vagas restantes que não esteja
  // no mesmo dia nem no dia anterior (se der). Matéria com tantas vagas
  // quanto dias restantes entra hoje de qualquer jeito (senão sobraria vaga).
  const dias: DisciplinaId[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < 7; i++) {
    for (let k = 0; k < porDia; k++) {
      const candidatas = perfil.disciplinas.filter((d) => vagasDe.get(d)! > 0 && !dias[i]!.includes(d));
      const obrigatorias = candidatas.filter((d) => vagasDe.get(d)! >= 7 - i);
      const sem = candidatas.filter((d) => !(dias[i - 1] ?? []).includes(d));
      const lista = (obrigatorias.length ? obrigatorias : sem.length ? sem : candidatas)
        .sort((a, b) => vagasDe.get(b)! - vagasDe.get(a)! || peso.get(b)! - peso.get(a)!);
      const escolhida = lista[0];
      if (!escolhida) continue;
      dias[i]!.push(escolhida);
      vagasDe.set(escolhida, vagasDe.get(escolhida)! - 1);
    }
  }
  return dias.map((ds, i) => {
    const dia = addDays(today, i);
    return {
      dia,
      rotulo: i === 0 ? 'Hoje' : DIA_SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()]!,
      disciplinas: ds.map((id) => ({ id, nome: nomeDisciplina(id) })),
    };
  });
}

export async function getPlano(store: GameStore, userId: string, now = new Date()): Promise<PlanoResposta> {
  const today = studyDay(now);
  return store.withUser(userId, async (tx) => {
    const perfil = await tx.studyProfile();
    if (!perfil) return { configurado: false };
    const plan = await tx.plan();
    const stats = await loadStats(tx, now);
    const progress = toProgress(stats, plan, now);
    const done = await tx.completedPhases();
    const statuses = phaseStatusMap(done, plan);
    const states = await tx.questionStates();
    const dom = await dominio(store, tx, today);
    const semanaAtras = addDays(today, -6);
    const respostas = await tx.answersSince(semanaAtras);
    const deHoje = respostas.filter((r) => r.day === today);
    const meta = metaDiaria(perfil);
    const doAluno = new Set(perfil.disciplinas);
    // Matérias com questões já abertas na trilha (dá para praticar).
    const abertas = new Set(FASES.filter((f) => isOpen(statuses.get(f.id))).map((f) => f.capitulo.disciplina));
    const semana = montarSemana(perfil, dom, today, abertas);

    // ---- Tarefas de hoje
    const tarefas: Tarefa[] = [];
    const agenda = agendaRevisao([...states.values()].filter((s) => reviewAllowed(s.questionId, plan)), today);
    const revisadasHoje = deHoje.filter((r) => r.mode === 'revisar').length;
    const metaRevisao = Math.min(agenda.hoje + revisadasHoje, Math.ceil(meta * 0.4));
    if (metaRevisao > 0) {
      tarefas.push({
        id: 'revisar', tipo: 'revisar', titulo: 'Revise seus erros',
        detalhe: agenda.hoje === 1 ? '1 questão marcada para hoje' : agenda.hoje > 1 ? `${agenda.hoje} questões marcadas para hoje` : 'Revisões de hoje em dia',
        link: '/revisar', meta: metaRevisao, atual: Math.min(revisadasHoje, metaRevisao),
        concluida: revisadasHoje >= metaRevisao || agenda.hoje === 0,
      });
    }

    const proxima = FASES.find((f) => !done.has(f.id));
    const fasesHoje = [...done.values()].filter((d) => d === today).length;
    if (proxima) {
      const status = statuses.get(proxima.id);
      const pro = status === 'pro';
      tarefas.push({
        id: 'trilha', tipo: 'trilha', titulo: 'Avance 1 fase na trilha',
        detalhe: pro
          ? `Próxima: ${proxima.titulo} (${nomeDisciplina(proxima.capitulo.disciplina)}) — capítulo do plano PRO`
          : `Próxima: ${proxima.titulo} (${nomeDisciplina(proxima.capitulo.disciplina)})`,
        link: pro ? '/planos' : `/fase/${proxima.id}`, meta: 1, atual: Math.min(1, fasesHoje), concluida: fasesHoje >= 1,
      });
    }

    // Praticar: a matéria de foco de hoje (ou outra do aluno) que já tem
    // questões abertas na trilha.
    const foco = [...semana[0]!.disciplinas.map((d) => d.id), ...perfil.disciplinas].find((d) => abertas.has(d));
    if (foco) {
      const fraco = dom.filter((a) => a.disciplina === foco && a.score !== null && a.score < 80).sort((a, b) => a.score! - b.score!)[0];
      const metaPratica = Math.max(5, meta - metaRevisao - (proxima ? 4 : 0));
      const praticadas = deHoje.filter((r) => r.mode === 'pratica').length;
      tarefas.push({
        id: 'praticar', tipo: 'praticar', titulo: `Pratique ${nomeDisciplina(foco)}`,
        detalhe: fraco ? `Seu ponto mais fraco: ${fraco.assunto}`
          : semana[0]!.disciplinas.some((d) => d.id === foco) ? 'Matéria de foco do seu plano hoje' : 'Questões das fases que você já abriu',
        link: `/praticar/${foco}`, meta: metaPratica, atual: Math.min(praticadas, metaPratica), concluida: praticadas >= metaPratica,
      });
    }

    const diasParaProva = perfil.dataProva ? diasEntre(today, perfil.dataProva) : null;
    const simulados = await tx.simulados(10);
    const simuladoHoje = simulados.some((s) => s.day === today);
    const simuladoNaSemana = simulados.some((s) => s.day >= semanaAtras && s.day < today);
    if ((perfil.nivel === 'avancado' || (diasParaProva !== null && diasParaProva <= 60)) && !simuladoNaSemana) {
      tarefas.push({
        id: 'simulado', tipo: 'simulado', titulo: 'Faça um simulado',
        detalhe: perfil.banca ? `Treine o ritmo de prova no estilo ${perfil.banca}` : 'Treine o ritmo de prova',
        link: '/simulados', meta: 1, atual: simuladoHoje ? 1 : 0, concluida: simuladoHoje,
      });
    }

    // ---- Como estou, onde erro, quanto falta
    const acertos7d = respostas.filter((r) => r.correct).length;
    const meus = dom.filter((a) => doAluno.has(a.disciplina));
    const vistos = meus.filter((a) => a.score !== null);
    const fasesMinhas = FASES.filter((f) => doAluno.has(f.capitulo.disciplina));
    const questoesFaltam = fasesMinhas.filter((f) => !done.has(f.id)).flatMap((f) => f.questoes).filter((q) => !states.get(q)?.everCorrect).length;
    const ritmo = Math.round((respostas.length / 7) * 10) / 10;
    // Dias = questões que faltam ÷ questões por dia (por/em, sem arredondar antes).
    const previsaoEm = (por: number, em: number) => (questoesFaltam === 0 ? today : por > 0 ? addDays(today, Math.ceil((questoesFaltam * em) / por)) : null);

    return {
      configurado: true,
      perfil,
      hoje: today,
      diasParaProva,
      metaQuestoes: meta,
      feitasHoje: deHoje.length,
      tarefas,
      semana,
      revisao: agenda,
      comoEstou: {
        sequencia: progress.streak,
        xp: progress.xp,
        acerto7d: respostas.length ? Math.round((acertos7d / respostas.length) * 100) : null,
        respondidas7d: respostas.length,
        dominioMedio: vistos.length ? Math.round(vistos.reduce((s, a) => s + a.score!, 0) / vistos.length) : null,
      },
      ondeErro: vistos.filter((a) => a.score! < 80).sort((a, b) => a.score! - b.score! || b.respondidas - a.respondidas).slice(0, 3),
      quantoFalta: {
        fasesFeitas: fasesMinhas.filter((f) => done.has(f.id)).length,
        fasesTotal: fasesMinhas.length,
        questoesFaltam,
        ritmo,
        previsao: previsaoEm(respostas.length, 7),
        previsaoPlano: previsaoEm(meta, 1),
      },
    };
  });
}
