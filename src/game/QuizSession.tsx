// O jogador de questões: o mesmo para trilha, revisão, prática e desafio.
// Escolher → Verificar (o servidor corrige) → explicação → Continuar.
// Na trilha e na revisão, o que errar volta para o fim da fila até acertar.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { AnswerResult, Session } from '../../shared/game';
import { Icon } from '../components/Icon';
import { Tico } from '../components/Tico';
import { ApiError } from '../lib/api';
import { fonteLabel, game, timeUntil } from '../lib/game';
import { useProgress } from './ProgressProvider';

interface Summary { answered: number; correct: number; xp: number; phaseDone: AnswerResult['faseConcluida'] }

export function QuizSession({ session, timeLimitSec, exitTo = '/jogar', nextLabel, onNext }: {
  session: Session;
  timeLimitSec?: number;
  exitTo?: string;
  nextLabel?: string;
  onNext?: () => void;
}) {
  const { progress, setProgress } = useProgress();
  const retries = session.mode === 'trilha' || session.mode === 'revisar';
  const [queue, setQueue] = useState(() => session.questoes.map((q) => q.id));
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noHearts, setNoHearts] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary>({ answered: 0, correct: 0, xp: 0, phaseDone: null });
  const [finished, setFinished] = useState(session.questoes.length === 0);
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSec ?? 0);
  const byId = useMemo(() => new Map(session.questoes.map((q) => [q.id, q])), [session]);
  const current = byId.get(queue[0] ?? '');
  const total = session.questoes.length;
  const doneCount = total - new Set(queue).size;

  // Desafio: relógio.
  useEffect(() => {
    if (!timeLimitSec || finished) return;
    const t = setInterval(() => setSecondsLeft((s) => (s <= 1 ? (setFinished(true), 0) : s - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLimitSec, finished]);

  async function check() {
    if (selected === null || !current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await game.answer(current.id, selected, session.mode);
      setResult(r);
      setProgress(r.progress);
      setSummary((s) => ({
        answered: s.answered + 1,
        correct: s.correct + (r.correct ? 1 : 0),
        xp: s.xp + r.xpGanho,
        phaseDone: r.faseConcluida ?? s.phaseDone,
      }));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SEM_VIDAS') {
        setNoHearts(typeof err.data.nextHeartAt === 'string' ? err.data.nextHeartAt : '');
        void game.progress().then(setProgress).catch(() => {});
      } else {
        setError(err instanceof Error ? err.message : 'Não foi possível conferir agora.');
      }
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (!result || !current) return;
    const rest = queue.slice(1);
    const nextQueue = !result.correct && retries ? [...rest, current.id] : rest;
    setQueue(nextQueue);
    setSelected(null);
    setResult(null);
    if (nextQueue.length === 0) setFinished(true);
  }

  // Teclado: 1–5 escolhe, Enter confere/continua.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (finished || noHearts !== null || !current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (result) next();
        else void check();
        return;
      }
      const n = Number(e.key);
      if (!result && n >= 1 && n <= current.alternativas.length) setSelected(n - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (noHearts !== null) {
    return (
      <div className="quiz-end card" role="alert">
        <Tico pose="apontando" className="quiz-end-tico" />
        <h2>Suas vidas acabaram</h2>
        <p className="muted">{noHearts ? `A próxima vida chega em ${timeUntil(noHearts)}.` : 'Elas recarregam sozinhas: 1 a cada 30 minutos.'} Enquanto isso, revisar seus erros não gasta vidas.</p>
        <div className="quiz-end-actions">
          <Link to="/revisar" className="btn btn-primary">Revisar erros</Link>
          <Link to="/planos" className="btn btn-secondary">Vidas ilimitadas com o PRO</Link>
        </div>
      </div>
    );
  }

  if (finished || !current) {
    const perfect = summary.answered > 0 && summary.correct === summary.answered;
    return (
      <div className="quiz-end card" role="status">
        <Tico pose={summary.phaseDone || perfect ? 'comemorando' : 'joinha'} className="quiz-end-tico" />
        <h2>{summary.phaseDone ? 'Fase concluída!' : timeLimitSec && secondsLeft === 0 ? 'Tempo esgotado!' : 'Sessão concluída!'}</h2>
        {summary.answered === 0 ? (
          <p className="muted">{session.subtitulo}</p>
        ) : (
          <ul className="quiz-stats">
            <li><strong>{summary.correct}</strong> acertos em <strong>{summary.answered}</strong> respostas</li>
            <li><strong>+{summary.xp} XP</strong>{summary.phaseDone ? ` (inclui +${summary.phaseDone.bonus} de bônus da fase)` : ''}</li>
          </ul>
        )}
        <div className="quiz-end-actions">
          {onNext && nextLabel && <button type="button" className="btn btn-primary" onClick={onNext}>{nextLabel}</button>}
          <Link to={exitTo} className={`btn ${onNext ? 'btn-secondary' : 'btn-primary'}`}>Voltar</Link>
        </div>
      </div>
    );
  }

  const state = (i: number) => {
    if (!result) return i === selected ? 'is-selected' : '';
    if (i === result.correta) return 'is-correct';
    return i === selected ? 'is-wrong' : '';
  };

  return (
    <div className="quiz">
      <div className="quiz-top">
        <Link to={exitTo} className="quiz-close" aria-label="Sair da sessão"><span aria-hidden="true">✕</span></Link>
        <div className="quiz-bar" role="progressbar" aria-label="Progresso da sessão" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount}>
          <span style={{ width: `${(doneCount / Math.max(1, total)) * 100}%` }} />
        </div>
        {timeLimitSec ? (
          <span className="quiz-timer" aria-live="off">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</span>
        ) : progress && progress.hearts !== null && session.mode === 'trilha' ? (
          <span className="quiz-hearts" title="Vidas">❤ {progress.hearts}</span>
        ) : null}
      </div>

      <article className="quiz-card card" aria-labelledby="quiz-q">
        <p className="eyebrow">{current.assunto} · {fonteLabel(current.fonte)}</p>
        <h2 id="quiz-q" className="quiz-question">{current.enunciado}</h2>
        <div className="demo-options" role="radiogroup" aria-label="Alternativas">
          {current.alternativas.map((alt, i) => (
            <button
              key={alt} type="button" role="radio" aria-checked={selected === i}
              className={`demo-option ${state(i)}`} disabled={Boolean(result) || busy} onClick={() => setSelected(i)}
            >
              <span className="demo-letter">{String.fromCharCode(65 + i)}</span>{alt}
            </button>
          ))}
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </article>

      <div className={`quiz-footer ${result ? (result.correct ? 'is-right' : 'is-wrong') : ''}`}>
        {result ? (
          <div className="quiz-feedback" role="status">
            <strong>{result.correct ? `Acertou!${result.xpGanho ? ` +${result.xpGanho} XP` : ''}` : `Resposta certa: ${String.fromCharCode(65 + result.correta)}`}</strong>
            <p>{result.explicacao}</p>
            {!result.correct && retries && <p className="quiz-hint"><Icon name="rotate" size={16} /> Esta questão volta no fim para você acertar.</p>}
          </div>
        ) : <span className="muted quiz-kbd">Dica: teclas 1–{current.alternativas.length} e Enter</span>}
        {result ? (
          <button type="button" className="btn btn-primary" onClick={next} autoFocus>Continuar</button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={selected === null || busy} onClick={() => void check()}>
            {busy ? 'Conferindo…' : 'Verificar'}
          </button>
        )}
      </div>
    </div>
  );
}
