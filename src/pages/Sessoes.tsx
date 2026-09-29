// Telas que abrem uma sessão de questões: fase da trilha, revisão,
// prática por disciplina e desafio relâmpago.

import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
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

function SessionScreen({ load, deps, exitTo, timeLimitSec, empty, nextLabel, onNext }: {
  load: () => Promise<Session>; deps: unknown[]; exitTo: string; timeLimitSec?: number; empty?: ReactNode;
  nextLabel?: string; onNext?: () => void;
}) {
  const loaded = useLoad(load, deps);
  if (loaded.error && loaded.error instanceof ApiError && [403, 404].includes(loaded.error.status)) return <Blocked error={loaded.error} />;
  return (
    <LoadState loaded={loaded}>
      {loaded.data && (loaded.data.questoes.length === 0 && empty ? empty : (
        <>
          <header className="session-head">
            <p className="eyebrow">{loaded.data.subtitulo}</p>
            <h1 className="page-title">{loaded.data.titulo}</h1>
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
      load={game.review} deps={[]} exitTo="/jogar"
      empty={(
        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">Revisar erros</p>
            <h1 className="page-title">Nenhum erro pendente. Mandou bem!</h1>
            <p>Quando você errar uma questão, ela aparece aqui para você acertar depois. Revisar não gasta vidas.</p>
            <Link to="/jogar" className="btn btn-primary trail-cta">Voltar à trilha</Link>
          </div>
          <Tico pose="joinha" />
        </section>
      )}
    />
  );
}

export function Jogos() {
  const [started, setStarted] = useState(0);
  if (started) {
    return <SessionScreen load={game.challenge} deps={[started]} exitTo="/jogar" timeLimitSec={90} nextLabel="Jogar de novo" onNext={() => setStarted((n) => n + 1)} />;
  }
  return (
    <section className="hero">
      <div className="hero-text">
        <p className="eyebrow">Jogos</p>
        <h1 className="page-title">Desafio relâmpago</h1>
        <p>10 questões das fases que você já concluiu, em 90 segundos. Treine a velocidade de prova. Não gasta vidas.</p>
        <button type="button" className="btn btn-primary trail-cta" onClick={() => setStarted((n) => n + 1)}>Começar desafio</button>
      </div>
      <Tico pose="estrela" />
    </section>
  );
}
