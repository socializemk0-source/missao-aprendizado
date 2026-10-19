import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthProvider';
import { Confetti } from '../../components/Confetti';
import { Icon } from '../../components/Icon';
import { Tico, type TicoPose } from '../../components/Tico';
import { ApiError } from '../../lib/api';
import {
  buscarDesafio, concluirDia, conferirResposta, lerProgresso, salvarProgresso,
  textoParaCompartilhar, type Desafio, type ProgressoDesafio,
} from '../../lib/desafio';
import { track } from '../../lib/marketing';
import { play } from '../../lib/sound';
import { useAoAparecer } from '../../lib/usar-visto';
import { DemoQuestion } from './DemoQuestion';

const letra = (i: number) => String.fromCharCode(65 + i);

// O que o Tico diz em cada momento do desafio (e a pose que acompanha).
function falaDoTico(atual: number, total: number, acertou: boolean | undefined): { texto: string; pose: TicoPose } {
  if (acertou === true) return { texto: 'Mandou bem! Uma a menos.', pose: 'joinha' };
  if (acertou === false) return { texto: 'Errar aqui é treino. Leia a explicação: é assim que fixa.', pose: 'apontando' };
  if (atual === 0) return { texto: 'Bora pro desafio? São 4 questões, uma de cada matéria.', pose: 'acenando' };
  return { texto: `Questão ${atual + 1} de ${total}. ${atual + 1 === total ? 'Última, capricha!' : 'Vamos lá!'}`, pose: 'acenando' };
}

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
  const [aviso, setAviso] = useState<string | null>(null);
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

  const texto = textoParaCompartilhar(desafio, progresso, window.location.origin);
  const compartilhado = (method: string) => track('at_daily_challenge_shared', { challenge: desafio.numero, method }, { proprio: true });

  // No celular, abre o "compartilhar" do aparelho; no computador, copia o texto.
  async function compartilhar() {
    setAviso(null);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: texto });
        compartilhado('share');
      } catch {
        // A pessoa fechou a janela de compartilhar: nada a fazer.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      setAviso('Copiado! Agora é só colar no WhatsApp ou no Instagram.');
      compartilhado('copiar');
    } catch {
      setAviso('Não deu para copiar. Use o botão do WhatsApp.');
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
        <div key={questao.id} className="desafio-pergunta">
          <Fala {...falaDoTico(atual, total, resposta?.acertou)} />
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
        </div>
      ) : (
        <div className="desafio-fim">
          {acertos >= 3 && <Confetti />}
          <Tico pose={acertos >= 3 ? 'comemorando' : 'joinha'} className="desafio-tico" alt="" />
          <h3>Você acertou {acertos} de {total}</h3>
          <p className="desafio-sequencia">
            <span className="desafio-chama" aria-hidden="true">🔥 </span>{progresso.sequencia === 1 ? '1 dia seguido' : `${progresso.sequencia} dias seguidos`}
          </p>
          <p className="muted">Amanhã tem desafio novo. Volte para não perder a sequência.</p>
          <div className="desafio-compartilhar">
            <button type="button" className="btn btn-secondary" onClick={() => void compartilhar()}>
              <Icon name="share" size={18} /> Compartilhar resultado
            </button>
            <a
              className="btn btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
              target="_blank" rel="noopener noreferrer" onClick={() => compartilhado('whatsapp')}
            >
              Mandar no WhatsApp
            </a>
          </div>
          {aviso && <p className="desafio-aviso" role="status">{aviso}</p>}
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

// Balão de fala do Tico. Muda a cada momento do desafio (o key refaz a animação).
function Fala({ texto, pose }: { texto: string; pose: TicoPose }) {
  return (
    <div className="desafio-fala" role="note" aria-label="Tico">
      <Tico pose={pose} className="desafio-fala-tico" alt="" loading="lazy" />
      <p key={texto} className="desafio-balao">{texto}</p>
    </div>
  );
}
