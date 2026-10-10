// Moldura de um jogo: escolher a matéria → jogar → resultado (XP e recorde
// decididos pelo servidor) → jogar de novo.

import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import type { DisciplinaId } from '../../content/types';
import type { JogoFim, JogoRodada, JogoTipo } from '../../shared/game';
import { JOGO_RODADAS_COM_XP } from '../../shared/game';
import { Confetti } from '../components/Confetti';
import { Icon } from '../components/Icon';
import { Tico } from '../components/Tico';
import { useProgress } from '../game/ProgressProvider';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';
import { play } from '../lib/sound';
import { CacaPalavras } from './CacaPalavras';
import { Cruzadinha } from './Cruzadinha';
import { JOGO_INFO, MATERIAS, TIPO_DO_SLUG, tempo } from './info';
import { Memoria } from './Memoria';
import { Radar } from './Radar';

export function JogoTela() {
  const { slug = '' } = useParams();
  const tipo = TIPO_DO_SLUG[slug];
  if (!tipo) return <Navigate to="/jogos" replace />;
  return <JogoFluxo key={tipo} tipo={tipo} />;
}

const erroTexto = (e: unknown) => (e instanceof ApiError ? e.message : 'Algo deu errado. Tente de novo.');

function JogoFluxo({ tipo }: { tipo: JogoTipo }) {
  const info = JOGO_INFO[tipo];
  const { setProgress } = useProgress();
  const [disciplina, setDisciplina] = useState<DisciplinaId | ''>('');
  const [rodada, setRodada] = useState<JogoRodada | null>(null);
  const [fim, setFim] = useState<JogoFim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function comecar() {
    setBusy(true);
    setError(null);
    try {
      const r = await game.startJogo(tipo, disciplina || null);
      setFim(null);
      setRodada(r);
    } catch (e) {
      setError(erroTexto(e));
    } finally {
      setBusy(false);
    }
  }

  async function terminar() {
    if (!rodada || busy) return;
    setBusy(true);
    setError(null);
    try {
      const f = await game.endJogo(rodada.id);
      setFim(f);
      setProgress(f.progress);
      if (f.completo) play(f.recorde ? 'fase' : 'fim');
    } catch (e) {
      setError(erroTexto(e));
    } finally {
      setBusy(false);
    }
  }

  if (rodada && fim) {
    return <Resultado tipo={tipo} fim={fim} busy={busy} onDeNovo={() => void comecar()} error={error} />;
  }

  if (rodada) {
    return (
      <>
        <header className="jogo-head">
          <div>
            <p className="eyebrow">Jogos{rodada.disciplina ? ` · ${MATERIAS.find((m) => m.id === rodada.disciplina)?.nome}` : ''}</p>
            <h1 className="page-title">{info.nome}</h1>
          </div>
          <button type="button" className="icon-btn" aria-label="Sair do jogo" title="Sair do jogo" disabled={busy} onClick={() => void terminar()}>
            <Icon name="close" size={20} />
          </button>
        </header>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {rodada.tipo === 'radar' && <Radar key={rodada.id} rodada={rodada} onFim={() => void terminar()} />}
        {rodada.tipo === 'memoria' && <Memoria key={rodada.id} rodada={rodada} onFim={() => void terminar()} />}
        {rodada.tipo === 'caca' && <CacaPalavras key={rodada.id} rodada={rodada} onFim={() => void terminar()} />}
        {rodada.tipo === 'cruzadinha' && <Cruzadinha key={rodada.id} rodada={rodada} onFim={() => void terminar()} />}
      </>
    );
  }

  return (
    <section className="hero jogo-inicio">
      <div className="hero-text">
        <p className="eyebrow">Jogos</p>
        <h1 className="page-title">{info.nome}</h1>
        <p>{info.descricao}</p>
        <div className="field jogo-materia">
          <label htmlFor="jogo-materia">Matéria</label>
          <select id="jogo-materia" value={disciplina} onChange={(e) => setDisciplina(e.target.value as DisciplinaId | '')}>
            <option value="">Todas as matérias</option>
            {MATERIAS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <div className="quiz-end-actions jogo-inicio-acoes">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void comecar()}>{busy ? 'Preparando…' : 'Começar'}</button>
          <Link to="/jogos" className="btn btn-secondary">Voltar aos jogos</Link>
        </div>
      </div>
      <Tico pose="estrela" />
    </section>
  );
}

function Resultado({ tipo, fim, busy, error, onDeNovo }: { tipo: JogoTipo; fim: JogoFim; busy: boolean; error: string | null; onDeNovo: () => void }) {
  const info = JOGO_INFO[tipo];
  const pontos = fim.pontos ?? 0;
  const texto = !fim.completo
    ? 'Rodada encerrada antes do fim. Que tal tentar de novo?'
    : tipo === 'radar' ? `Você acertou ${pontos} de 10.`
      : tipo === 'memoria' ? `Você achou os 6 pares em ${pontos} jogadas.`
        : tipo === 'caca' ? `Você achou todas as palavras em ${tempo(pontos)}.`
          : `Você completou a cruzadinha em ${tempo(pontos)}.`;
  return (
    <section className="quiz-end card jogo-fim" aria-label="Resultado">
      {fim.recorde && <Confetti />}
      <Tico pose={fim.completo ? 'comemorando' : 'joinha'} className="quiz-end-tico" />
      <h2>{fim.recorde ? 'Novo recorde!' : fim.completo ? 'Rodada completa!' : 'Rodada encerrada'}</h2>
      <p>{texto}</p>
      {fim.completo && (
        fim.xpGanho > 0
          ? <p className="jogo-xp"><strong>+{fim.xpGanho} XP</strong></p>
          : <p className="muted">Você já ganhou XP {JOGO_RODADAS_COM_XP} vezes hoje no {info.nome}. Amanhã tem mais! Pode continuar treinando.</p>
      )}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="quiz-end-actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onDeNovo}>Jogar de novo</button>
        <Link to="/jogos" className="btn btn-secondary">Voltar aos jogos</Link>
      </div>
    </section>
  );
}
