// Tela "Hoje": responde o que estudar hoje, como estou, onde erro e quanto
// falta. Tudo vem calculado do servidor (game.plano); sem plano, leva ao
// onboarding.

import { Link, Navigate } from 'react-router';
import type { Plano, Tarefa, TarefaTipo } from '../../shared/estudo';
import { Icon, type IconName } from '../components/Icon';
import { Tico } from '../components/Tico';
import { LoadState, useLoad } from '../game/useLoad';
import { game } from '../lib/game';
import { Bar } from './Painel';

const ICONE: Record<TarefaTipo, IconName> = { revisar: 'rotate', trilha: 'compass', praticar: 'book', simulado: 'clipboard' };

export const dataCurta = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const dataLonga = (dia: string) => new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function Hoje() {
  const loaded = useLoad(game.plano, []);
  if (loaded.data && !loaded.data.configurado) return <Navigate to="/comecar" replace />;
  const plano = loaded.data?.configurado ? loaded.data : null;
  return (
    <LoadState loaded={loaded}>
      {plano && <Painel plano={plano} />}
    </LoadState>
  );
}

function Painel({ plano }: { plano: Plano }) {
  const { perfil, diasParaProva } = plano;
  const pendentes = plano.tarefas.filter((t) => !t.concluida).length;
  return (
    <>
      <header className="hoje-head">
        <div>
          <p className="eyebrow">{dataLonga(plano.hoje)}</p>
          <h1 className="page-title">O que estudar hoje</h1>
          <p className="muted">
            {perfil.prova}{perfil.banca ? ` · ${perfil.banca}` : ''} ·{' '}
            {diasParaProva === null ? 'sem data de prova' : diasParaProva === 0 ? 'a prova é hoje!' : `faltam ${plural(diasParaProva, 'dia', 'dias')} para a prova`}
          </p>
        </div>
        <Link to="/comecar" className="btn btn-secondary btn-sm">Ajustar plano</Link>
      </header>

      <section className="card hoje-meta" aria-label="Meta de hoje">
        <div className="hoje-meta-text">
          <strong>{plano.feitasHoje} de {plano.metaQuestoes} questões hoje</strong>
          <span className="muted">{pendentes === 0 ? 'Plano de hoje cumprido. Mandou bem!' : `${plural(pendentes, 'tarefa', 'tarefas')} para fechar o dia`}</span>
        </div>
        <Bar value={Math.min(plano.feitasHoje, plano.metaQuestoes)} max={plano.metaQuestoes} label={`Meta do dia: ${plano.feitasHoje} de ${plano.metaQuestoes} questões`} />
      </section>

      <ul className="list-cards hoje-tarefas" aria-label="Tarefas de hoje">
        {plano.tarefas.map((t) => <TarefaCard key={t.id} tarefa={t} />)}
      </ul>
      {(plano.revisao.amanha > 0 || plano.revisao.semana > 0) && (
        <p className="muted hoje-agenda">
          Próximas revisões: {plano.revisao.amanha > 0 && `amanhã ${plano.revisao.amanha}`}
          {plano.revisao.amanha > 0 && plano.revisao.semana > 0 && ' · '}
          {plano.revisao.semana > 0 && `nos próximos 7 dias ${plano.revisao.semana}`}
        </p>
      )}

      <div className="hoje-grid">
        <ComoEstou plano={plano} />
        <OndeErro plano={plano} />
        <QuantoFalta plano={plano} />
        <Semana plano={plano} />
      </div>
    </>
  );
}

function TarefaCard({ tarefa: t }: { tarefa: Tarefa }) {
  const comecou = t.atual > 0;
  return (
    <li className={`card tarefa ${t.concluida ? 'is-done' : ''}`}>
      <span className="tarefa-icone" aria-hidden="true"><Icon name={ICONE[t.tipo]} size={22} /></span>
      <div className="mission-main">
        <strong>{t.titulo}</strong>
        <span className="muted">{t.detalhe}</span>
        {t.meta > 1 && <Bar value={t.atual} max={t.meta} label={`${t.titulo}: ${t.atual} de ${t.meta}`} />}
      </div>
      {t.concluida
        ? <span className="pill pill-done">Feito ✓</span>
        : <Link to={t.link} className="btn btn-primary btn-sm" aria-label={`${comecou ? 'Continuar' : 'Começar'}: ${t.titulo}`}>{comecou ? 'Continuar' : 'Começar'}</Link>}
    </li>
  );
}

function ComoEstou({ plano }: { plano: Plano }) {
  const c = plano.comoEstou;
  return (
    <section className="card hoje-bloco" aria-labelledby="como-estou">
      <h2 id="como-estou">Como estou</h2>
      <dl className="hoje-numeros">
        <div><dt>Sequência</dt><dd>{plural(c.sequencia, 'dia', 'dias')}</dd></div>
        <div><dt>Acerto na semana</dt><dd>{c.acerto7d === null ? '—' : `${c.acerto7d}%`}</dd></div>
        <div><dt>Questões na semana</dt><dd>{c.respondidas7d}</dd></div>
        <div><dt>Domínio médio</dt><dd>{c.dominioMedio === null ? '—' : `${c.dominioMedio}%`}</dd></div>
      </dl>
    </section>
  );
}

function OndeErro({ plano }: { plano: Plano }) {
  return (
    <section className="card hoje-bloco" aria-labelledby="onde-erro">
      <h2 id="onde-erro">Onde erro</h2>
      {plano.ondeErro.length === 0 ? (
        <p className="muted">
          {plano.comoEstou.respondidas7d === 0 && plano.comoEstou.dominioMedio === null
            ? 'Responda algumas questões e o Tico mostra aqui seus pontos fracos.'
            : 'Nenhum assunto fraco por enquanto. Continue assim!'}
        </p>
      ) : (
        <ul className="assuntos">
          {plano.ondeErro.map((a) => (
            <li key={`${a.disciplina}|${a.assunto}`} className={`is-${a.situacao}`}>
              <div className="assunto-info">
                <strong>{a.assunto}</strong>
                <span className="muted">{a.disciplinaNome} · domínio {a.score}%</span>
                <Bar value={a.score ?? 0} max={100} label={`${a.assunto}: domínio de ${a.score}%`} />
              </div>
              <Link to={`/praticar/${a.disciplina}`} className="btn btn-secondary btn-sm" aria-label={`Praticar ${a.disciplinaNome}`}>Praticar</Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/disciplinas" className="hoje-link">Ver domínio de todos os assuntos</Link>
    </section>
  );
}

function QuantoFalta({ plano }: { plano: Plano }) {
  const q = plano.quantoFalta;
  const prova = plano.perfil.dataProva;
  const antes = (dia: string | null) => (dia && prova ? (dia <= prova ? ' — antes da prova ✓' : ' — depois da prova') : '');
  return (
    <section className="card hoje-bloco" aria-labelledby="quanto-falta">
      <h2 id="quanto-falta">Quanto falta</h2>
      <p><strong>{q.fasesFeitas} de {q.fasesTotal} fases</strong> da trilha nas suas matérias</p>
      <Bar value={q.fasesFeitas} max={q.fasesTotal} label={`Trilha: ${q.fasesFeitas} de ${q.fasesTotal} fases`} />
      {q.questoesFaltam === 0 ? (
        <p>Você já dominou todas as questões da trilha nas suas matérias. Agora é revisar e fazer simulados!</p>
      ) : (
        <ul className="hoje-previsao">
          <li>Faltam {plural(q.questoesFaltam, 'questão', 'questões')} para dominar.</li>
          <li>
            {q.previsao
              ? `No seu ritmo (${q.ritmo.toLocaleString('pt-BR')} por dia), você termina em ${dataCurta(q.previsao)}${antes(q.previsao)}.`
              : 'Estude hoje para o Tico calcular quando você termina.'}
          </li>
          {q.previsaoPlano && <li>Cumprindo a meta de {plano.metaQuestoes} por dia: {dataCurta(q.previsaoPlano)}{antes(q.previsaoPlano)}.</li>}
        </ul>
      )}
    </section>
  );
}

function Semana({ plano }: { plano: Plano }) {
  return (
    <section className="card hoje-bloco hoje-semana-bloco" aria-labelledby="sua-semana">
      <h2 id="sua-semana">Sua semana</h2>
      <p className="muted">Foco de cada dia. Muda sozinho conforme você acerta e erra: matéria mais fraca aparece mais.</p>
      <ol className="semana">
        {plano.semana.map((d) => (
          <li key={d.dia} className={d.rotulo === 'Hoje' ? 'is-hoje' : ''}>
            <span className="semana-dia">{d.rotulo}</span>
            {d.disciplinas.map((x) => <span key={x.id} className="semana-materia">{x.nome}</span>)}
          </li>
        ))}
      </ol>
      <Tico pose="joinha" className="hoje-tico" />
    </section>
  );
}
