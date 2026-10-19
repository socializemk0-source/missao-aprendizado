import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthProvider';
import { Confetti } from '../../components/Confetti';
import { Tico } from '../../components/Tico';
import { ApiError } from '../../lib/api';
import {
  buscarDesafio, concluirDia, conferirResposta, lerProgresso, salvarProgresso,
  type Desafio, type ProgressoDesafio,
} from '../../lib/desafio';
import { track } from '../../lib/marketing';
import { play } from '../../lib/sound';
import { useAoAparecer } from '../../lib/usar-visto';
import { DemoQuestion } from './DemoQuestion';

const letra = (i: number) => String.fromCharCode(65 + i);

// Desafio do Tico: as 4 questões do dia, sem cadastro. Responde, confere com o
// servidor, lê a explicação e passa para a próxima. No fim, placar, sequência de
// dias e o convite para criar a conta. Se o servidor não responder, fica a
// questão de demonstração no lugar.
export function DesafioDoDia() {
  const { status } = useAuth();
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoDesafio | null>(null);
  const [atual, setAtual] = useState(0);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const visto = useAoAparecer('at_daily_challenge_viewed');

  useEffect(() => {
    let ativo = true;
    buscarDesafio()
      .then((d) => {
        if (!ativo) return;
        const p = lerProgresso(d.dia);
        setDesafio(d);
        setProgresso(p);
        // Volta na primeira que falta; se já respondeu todas, mostra o resultado.
        const falta = d.questoes.findIndex((q) => !p.respostas[q.id]);
        setAtual(falta === -1 ? d.questoes.length : falta);
      })
      .catch(() => ativo && setFalhou(true));
    return () => { ativo = false; };
  }, []);

  if (falhou) return <DemoQuestion />;
  if (!desafio || !progresso) {
    return <div className="desafio card desafio-carregando" aria-busy="true"><p className="muted">Carregando o desafio de hoje…</p></div>;
  }

  const total = desafio.questoes.length;
  const respondidas = desafio.questoes.filter((q) => progresso.respostas[q.id]).length;
  const acertos = desafio.questoes.filter((q) => progresso.respostas[q.id]?.acertou).length;
  const questao = desafio.questoes[atual];
  const resposta = questao ? progresso.respostas[questao.id] : undefined;

  async function conferir() {
    if (!questao || escolha === null || !progresso || !desafio) return;
    setEnviando(true);
    setErro(null);
    try {
      const c = await conferirResposta(questao.id, escolha);
      let p: ProgressoDesafio = { ...progresso, respostas: { ...progresso.respostas, [questao.id]: { ...c, escolha } } };
      const terminou = desafio.questoes.every((q) => p.respostas[q.id]);
      if (terminou) p = concluirDia(p);
      setProgresso(p);
      salvarProgresso(p);
      play(c.acertou ? 'acerto' : 'erro');
      track('at_daily_challenge_answered', {
        challenge: desafio.numero, question: atual + 1, discipline: questao.disciplina, correct: c.acertou,
      }, { proprio: true });
      if (terminou) {
        const score = desafio.questoes.filter((q) => p.respostas[q.id]!.acertou).length;
        track('at_daily_challenge_completed', { challenge: desafio.numero, score, streak: p.sequencia }, { proprio: true });
      }
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível conferir agora. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  function proxima() {
    setEscolha(null);
    setErro(null);
    setAtual((i) => i + 1);
    if (atual + 1 >= total) play('fim');
  }

  return (
    <div ref={visto} className="desafio card" aria-labelledby="desafio-titulo">
      <div className="desafio-topo">
        <p className="eyebrow" id="desafio-titulo">Desafio do Tico nº {desafio.numero}</p>
        <ol className="desafio-placar" aria-label="Seu placar de hoje">
          {desafio.questoes.map((q, i) => {
            const r = progresso.respostas[q.id];
            const estado = r ? (r.acertou ? 'acertou' : 'errou') : i === atual ? 'agora' : 'falta';
            return <li key={q.id} className={`is-${estado}`} aria-label={`Questão ${i + 1}: ${estado === 'agora' ? 'respondendo' : estado}`} />;
          })}
        </ol>
        <span className="desafio-conta">{respondidas} de {total}</span>
      </div>

      {questao ? (
        <>
          <p className="desafio-materia">{questao.disciplinaNome} · {questao.assunto}</p>
          <h3>{questao.enunciado}</h3>
          <div className="demo-options" role="radiogroup" aria-label="Alternativas">
            {questao.alternativas.map((alt, i) => {
              const marcada = resposta ? resposta.escolha : escolha;
              const classe = resposta
                ? (i === resposta.correta ? 'is-correct' : i === resposta.escolha ? 'is-wrong' : '')
                : i === marcada ? 'is-selected' : '';
              return (
                <button
                  key={`${questao.id}-${i}`} type="button" role="radio" aria-checked={marcada === i}
                  className={`demo-option ${classe}`} disabled={!!resposta || enviando} onClick={() => setEscolha(i)}
                >
                  <span className="demo-letter">{letra(i)}</span>{alt}
                </button>
              );
            })}
          </div>
          {erro && <p className="alert alert-error" role="alert">{erro}</p>}
          {!resposta ? (
            <button type="button" className="btn btn-primary btn-block" disabled={escolha === null || enviando} onClick={() => void conferir()}>
              {enviando ? 'Conferindo…' : 'Conferir resposta'}
            </button>
          ) : (
            <div className={`demo-feedback ${resposta.acertou ? 'is-right' : 'is-wrong'}`} role="status">
              <strong>{resposta.acertou ? 'Acertou!' : `Quase! A certa é a letra ${letra(resposta.correta)}.`}</strong>
              <p>{resposta.explicacao}</p>
              <button type="button" className="btn btn-primary btn-block" onClick={proxima}>
                {atual + 1 < total ? 'Próxima questão' : 'Ver meu resultado'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="desafio-fim">
          {acertos >= 3 && <Confetti />}
          <Tico pose={acertos >= 3 ? 'comemorando' : 'joinha'} className="desafio-tico" alt="" />
          <h3>Você acertou {acertos} de {total}</h3>
          <p className="desafio-sequencia">
            <span aria-hidden="true">🔥 </span>{progresso.sequencia === 1 ? '1 dia seguido' : `${progresso.sequencia} dias seguidos`}
          </p>
          <p className="muted">Amanhã tem desafio novo. Volte para não perder a sequência.</p>
          {status === 'signedIn' ? (
            <Link to="/hoje" className="btn btn-primary btn-block">Continuar estudando</Link>
          ) : (
            <>
              <Link to="/cadastro" className="btn btn-primary btn-block">Criar conta grátis e continuar</Link>
              <p className="desafio-nota muted">Com a conta, você abre a trilha completa e o Tico monta seu plano de estudos.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
