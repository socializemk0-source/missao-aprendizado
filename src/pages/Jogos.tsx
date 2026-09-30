// Tela dos jogos: Desafio relâmpago e os jogos rápidos (Radar do Tico,
// Memória, Caça-palavras e Cruzadinha), com recorde e XP de hoje.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { JogoResumo } from '../../shared/game';
import { JOGOS } from '../../shared/game';
import { Tico } from '../components/Tico';
import { JOGO_INFO } from '../games/info';
import { game } from '../lib/game';
import { SessionScreen } from './Sessoes';

export function JogosHub() {
  const [resumo, setResumo] = useState<JogoResumo[] | null>(null);

  useEffect(() => {
    let ativo = true;
    // Sem o resumo (recordes, XP de hoje) os jogos continuam jogáveis.
    game.jogos().then((r) => ativo && setResumo(r.jogos)).catch(() => {});
    return () => { ativo = false; };
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Jogos</p>
          <h1 className="page-title">Aprenda brincando</h1>
          <p>Partidas rápidas para fixar o conteúdo. Cada jogo dá XP nas {resumo?.[0]?.rodadasComXp ?? 3} primeiras rodadas completas do dia e não gasta vidas.</p>
        </div>
        <Tico pose="estrela" />
      </section>

      <ul className="list-cards jogos-lista">
        <li>
          <Link to="/jogos/desafio" className="card jogo-card">
            <strong className="jogo-card-nome">Desafio relâmpago</strong>
            <span className="muted">10 questões das fases que você já concluiu, em 90 segundos.</span>
          </Link>
        </li>
        {JOGOS.map((tipo) => {
          const info = JOGO_INFO[tipo];
          const r = resumo?.find((x) => x.tipo === tipo);
          return (
            <li key={tipo}>
              <Link to={`/jogos/${info.slug}`} className="card jogo-card">
                <strong className="jogo-card-nome">{info.nome}</strong>
                <span className="muted">{info.descricao}</span>
                {r && (
                  <span className="jogo-card-meta">
                    <span>XP hoje: {Math.min(r.rodadasHoje, r.rodadasComXp)} de {r.rodadasComXp} rodadas</span>
                    {r.recorde !== null && <span>Recorde: {info.recorde(r.recorde)}</span>}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Desafio() {
  const [started, setStarted] = useState(0);
  if (started) {
    return <SessionScreen load={game.challenge} deps={[started]} exitTo="/jogos" timeLimitSec={90} nextLabel="Jogar de novo" onNext={() => setStarted((n) => n + 1)} />;
  }
  return (
    <section className="hero">
      <div className="hero-text">
        <p className="eyebrow">Jogos</p>
        <h1 className="page-title">Desafio relâmpago</h1>
        <p>10 questões das fases que você já concluiu, em 90 segundos. Treine a velocidade de prova. Não gasta vidas.</p>
        <div className="quiz-end-actions jogo-inicio-acoes">
          <button type="button" className="btn btn-primary" onClick={() => setStarted((n) => n + 1)}>Começar desafio</button>
          <Link to="/jogos" className="btn btn-secondary">Voltar aos jogos</Link>
        </div>
      </div>
      <Tico pose="estrela" />
    </section>
  );
}
