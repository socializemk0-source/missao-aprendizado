// Radar do Tico: certo ou errado, uma afirmação por vez. O servidor confere
// cada resposta e devolve a explicação na hora.

import { useState } from 'react';
import type { JogadaResultado, JogoRodada } from '../../shared/game';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';
import { play } from '../lib/sound';

type Rodada = Extract<JogoRodada, { tipo: 'radar' }>;
type Resposta = Extract<JogadaResultado, { tipo: 'radar' }>;

export function Radar({ rodada, onFim }: { rodada: Rodada; onFim: () => void }) {
  const [idx, setIdx] = useState(0);
  const [res, setRes] = useState<Resposta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const item = rodada.itens[idx]!;
  const total = rodada.itens.length;
  const ultima = idx + 1 >= total;

  async function responder(resposta: boolean) {
    if (busy || res) return;
    setBusy(true);
    setError(null);
    try {
      const r = await game.jogada(rodada.id, { indice: idx, resposta });
      if (r.tipo !== 'radar') return;
      setRes(r);
      play(r.acertou ? 'acerto' : 'erro');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não deu para conferir. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function proxima() {
    if (ultima) return onFim();
    setIdx(idx + 1);
    setRes(null);
  }

  return (
    <div className="radar">
      <div className="radar-top">
        <span className="muted">{idx + 1} de {total}</span>
        <div className="bar" aria-hidden="true"><span style={{ width: `${((idx + (res ? 1 : 0)) / total) * 100}%` }} /></div>
      </div>
      <article className="card radar-card">
        <p className="eyebrow">Certo ou errado?</p>
        <p className="radar-texto" data-testid="radar-afirmacao">{item.texto}</p>
        <div className="radar-botoes">
          <button type="button" className={`btn radar-btn is-certo${res && res.certo ? ' is-gabarito' : ''}`} disabled={busy || Boolean(res)} onClick={() => void responder(true)}>Certo</button>
          <button type="button" className={`btn radar-btn is-errado${res && !res.certo ? ' is-gabarito' : ''}`} disabled={busy || Boolean(res)} onClick={() => void responder(false)}>Errado</button>
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </article>
      {res && (
        <div className={`quiz-footer ${res.acertou ? 'is-right' : 'is-wrong'}`}>
          <div className="quiz-feedback" role="status">
            <strong>{res.acertou ? 'Acertou!' : `Errou. O gabarito é ${res.certo ? 'Certo' : 'Errado'}.`}</strong>
            <p>{res.explicacao}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={proxima}>{ultima ? 'Ver resultado' : 'Próxima'}</button>
        </div>
      )}
    </div>
  );
}
