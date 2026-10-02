// Telas que abrem uma sessão de questões: fase da trilha, revisão e
// prática por disciplina (o desafio relâmpago usa SessionScreen em Jogos).

import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import type { AgendaRevisao } from '../../shared/estudo';
import type { Session } from '../../shared/game';
import { Tico } from '../components/Tico';
import { QuizSession } from '../game/QuizSession';
import { LoadState, useLoad } from '../game/useLoad';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';

function Blocked({ error }: { error: Error }) {
  const code = error instanceof ApiError ? error.code : undefined;
  return (
    <div className="quiz-end card" role="alert">
      <Tico pose="apontando" className="quiz-end-tico" />
      <h2>{code === 'PLANO_PRO' ? 'Capítulo do plano PRO' : code === 'FASE_BLOQUEADA' ? 'Fase ainda bloqueada' : 'Não deu para abrir'}</h2>
      <p className="muted">{error.message}</p>
      <div className="quiz-end-actions">
        {code === 'PLANO_PRO' && <Link to="/planos" className="btn btn-primary">Conhecer o PRO</Link>}
        <Link to="/jogar" className="btn btn-secondary">Voltar à trilha</Link>
      </div>
    </div>
  );
}

export function SessionScreen({ load, deps, exitTo, timeLimitSec, empty, header, nextLabel, onNext }: {
  load: () => Promise<Session>; deps: unknown[]; exitTo: string; timeLimitSec?: number;
  empty?: ReactNode | ((session: Session) => ReactNode); header?: (session: Session) => ReactNode;
  nextLabel?: string; onNext?: () => void;
}) {
  const loaded = useLoad(load, deps);
  if (loaded.error && loaded.error instanceof ApiError && [403, 404].includes(loaded.error.status)) return <Blocked error={loaded.error} />;
  return (
    <LoadState loaded={loaded}>
      {loaded.data && (loaded.data.questoes.length === 0 && empty ? (typeof empty === 'function' ? empty(loaded.data) : empty) : (
        <>
          <header className="session-head">
            <p className="eyebrow">{loaded.data.subtitulo}</p>
            <h1 className="page-title">{loaded.data.titulo}</h1>
            {header?.(loaded.data)}
          </header>
          <QuizSession key={loaded.data.titulo + deps.join()} session={loaded.data} exitTo={exitTo} timeLimitSec={timeLimitSec} nextLabel={nextLabel} onNext={onNext} />
        </>
      ))}
    </LoadState>
  );
}

export function Fase() {
  const { id = '' } = useParams();
  return <SessionScreen load={() => game.phase(id)} deps={[id]} exitTo="/jogar" />;
}

export function Praticar() {
  const { disciplina = '' } = useParams();
  return <SessionScreen load={() => game.practice(disciplina)} deps={[disciplina]} exitTo="/disciplinas" />;
}

export function Revisar() {
  return (
    <SessionScreen
      load={game.review} deps={[]} exitTo="/hoje"
      header={(session) => session.agenda && <AgendaLinha agenda={session.agenda} />}
      empty={(session) => (
        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">Revisar erros</p>
            {session.agenda && session.agenda.amanha + session.agenda.semana + session.agenda.depois > 0 ? (
              <>
                <h1 className="page-title">Nenhuma revisão para hoje</h1>
                <p>Cada questão que você erra volta para revisão hoje, amanhã, em 7 dias e em 30 dias. Assim ela não some da memória.</p>
                <AgendaLinha agenda={session.agenda} />
              </>
            ) : (
              <>
                <h1 className="page-title">Nenhum erro pendente. Mandou bem!</h1>
                <p>Quando você errar uma questão, ela aparece aqui para você acertar depois. Revisar não gasta vidas.</p>
              </>
            )}
            <Link to="/hoje" className="btn btn-primary trail-cta">Voltar para o plano de hoje</Link>
          </div>
          <Tico pose="joinha" />
        </section>
      )}
    />
  );
}

function AgendaLinha({ agenda }: { agenda: AgendaRevisao }) {
  const partes = [
    agenda.amanha > 0 && `amanhã ${agenda.amanha}`,
    agenda.semana > 0 && `nos próximos 7 dias ${agenda.semana}`,
    agenda.depois > 0 && `mais adiante ${agenda.depois}`,
  ].filter(Boolean);
  if (partes.length === 0) return null;
  return <p className="muted revisao-agenda">Próximas revisões: {partes.join(' · ')}</p>;
}
