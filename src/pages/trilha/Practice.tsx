import { useState } from 'react';
import { api, SUBJECTS, type AnswerResult, type PublicQuestion, type SubjectId } from '../../lib/api';

const PER_ROUND = 5;

type State =
  | { step: 'idle' }
  | { step: 'loading'; subject: SubjectId }
  | { step: 'empty'; subject: SubjectId }
  | { step: 'playing'; subject: SubjectId; questions: PublicQuestion[]; index: number; hits: number }
  | { step: 'done'; subject: SubjectId; total: number; hits: number };

function labelOf(subject: SubjectId): string {
  return SUBJECTS.find((s) => s.id === subject)?.label ?? subject;
}

// Treino rápido por matéria: o aluno escolhe a matéria, responde e o
// servidor confere. A tela nunca sabe o gabarito antes de responder.
export function Practice() {
  const [state, setState] = useState<State>({ step: 'idle' });
  const [error, setError] = useState<string | null>(null);

  async function start(subject: SubjectId) {
    setError(null);
    setState({ step: 'loading', subject });
    try {
      const { questions } = await api<{ questions: PublicQuestion[] }>(`/api/questions?subject=${subject}&limit=${PER_ROUND}`);
      setState(questions.length ? { step: 'playing', subject, questions, index: 0, hits: 0 } : { step: 'empty', subject });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as questões.');
      setState({ step: 'idle' });
    }
  }

  const current = 'subject' in state ? state.subject : null;

  return (
    <section className="card practice" aria-labelledby="practice-title">
      <h2 id="practice-title" className="practice-title">Pratique agora</h2>
      <p className="practice-lead">Escolha uma matéria e responda. Toda questão vem com explicação.</p>
      <div className="practice-subjects" role="group" aria-label="Matérias">
        {SUBJECTS.map((s) => (
          <button
            key={s.id} type="button" aria-pressed={current === s.id}
            className={`practice-subject ${current === s.id ? 'is-active' : ''}`}
            disabled={state.step === 'loading'} onClick={() => void start(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {state.step === 'loading' && <p role="status">Carregando questões…</p>}
      {state.step === 'empty' && (
        <p role="status">
          As questões de {labelOf(state.subject)} estão em revisão pelos professores. Volte em breve!
        </p>
      )}
      {state.step === 'playing' && (
        <QuestionRound
          key={state.questions[state.index]!.id}
          question={state.questions[state.index]!}
          position={state.index + 1}
          total={state.questions.length}
          onNext={(correct) => {
            const hits = state.hits + (correct ? 1 : 0);
            const index = state.index + 1;
            setState(index < state.questions.length
              ? { ...state, index, hits }
              : { step: 'done', subject: state.subject, total: state.questions.length, hits });
          }}
        />
      )}
      {state.step === 'done' && (
        <div className="practice-done" role="status">
          <strong>Você acertou {state.hits} de {state.total}.</strong>
          <button type="button" className="btn btn-primary" onClick={() => void start(state.subject)}>Praticar de novo</button>
        </div>
      )}
    </section>
  );
}

function QuestionRound({ question, position, total, onNext }: {
  question: PublicQuestion; position: number; total: number; onNext: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    if (selected === null) return;
    setSending(true);
    setError(null);
    try {
      setResult(await api<AnswerResult>('/api/answer', {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id, choice: selected }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível conferir sua resposta.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="demo-question practice-question">
      <p className="eyebrow">Questão {position} de {total} · {question.topic}{question.style ? ` · estilo ${question.style}` : ''}</p>
      <h3>{question.statement}</h3>
      <div className="demo-options" role="radiogroup" aria-label="Alternativas">
        {question.options.map((option, i) => {
          const state = result
            ? (i === result.correctIndex ? 'is-correct' : i === selected ? 'is-wrong' : '')
            : i === selected ? 'is-selected' : '';
          return (
            <button
              key={option} type="button" role="radio" aria-checked={selected === i}
              className={`demo-option ${state}`} disabled={!!result || sending} onClick={() => setSelected(i)}
            >
              <span className="demo-letter">{String.fromCharCode(65 + i)}</span>{option}
            </button>
          );
        })}
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {!result ? (
        <button type="button" className="btn btn-primary btn-block" disabled={selected === null || sending} onClick={() => void check()}>
          {sending ? 'Conferindo…' : 'Conferir resposta'}
        </button>
      ) : (
        <div className={`demo-feedback ${result.correct ? 'is-right' : 'is-wrong'}`} role="status">
          <strong>{result.correct ? 'Acertou!' : `Não foi dessa vez. A resposta é a letra ${String.fromCharCode(65 + result.correctIndex)}.`}</strong>
          <p>{result.explanation}</p>
          {result.legalBasis && <p className="practice-basis">Base legal: {result.legalBasis}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={() => onNext(result.correct)}>
            {position < total ? 'Próxima questão' : 'Ver resultado'}
          </button>
        </div>
      )}
    </div>
  );
}
