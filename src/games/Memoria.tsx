// Memória do Tico: 12 cartas viradas; cada termo tem um par com a sua dica.
// Duas cartas do mesmo par ficam abertas; se não formam par, voltam.
// Quem confere o par e conta as jogadas é o servidor (a tela não sabe os pares).

import { useEffect, useRef, useState } from 'react';
import type { JogoRodada } from '../../shared/game';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';
import { play } from '../lib/sound';

type Rodada = Extract<JogoRodada, { tipo: 'memoria' }>;

export function Memoria({ rodada, onFim }: { rodada: Rodada; onFim: () => void }) {
  const [abertas, setAbertas] = useState<string[]>([]);
  const [achadas, setAchadas] = useState<Set<string>>(() => new Set());
  const [jogadas, setJogadas] = useState(0);
  const [msg, setMsg] = useState('');
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conferindo = useRef(false);
  const totalPares = rodada.cartas.length / 2;

  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);

  async function virar(id: string) {
    if (espera.current || conferindo.current || achadas.has(id) || abertas.includes(id)) return;
    const novas = [...abertas, id];
    setAbertas(novas);
    if (novas.length < 2) return;
    conferindo.current = true;
    setMsg('');
    try {
      const r = await game.jogada(rodada.id, { cartas: novas });
      if (r.tipo !== 'memoria') return;
      setJogadas(r.jogadas);
      if (r.par) {
        setAchadas((a) => new Set([...a, ...novas]));
        setAbertas([]);
        play('acerto');
        if (r.achados === r.total) onFim();
        return;
      }
      espera.current = setTimeout(() => {
        espera.current = null;
        setAbertas([]);
      }, 900);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Não deu para conferir. Tente de novo.');
      setAbertas([]);
    } finally {
      conferindo.current = false;
    }
  }

  return (
    <div className="memoria">
      <p className="muted memoria-info">Pares: {achadas.size / 2} de {totalPares} · Jogadas: {jogadas}</p>
      {msg && <p className="alert alert-error" role="alert">{msg}</p>}
      <div className="memoria-grade">
        {rodada.cartas.map((c, i) => {
          const aberta = achadas.has(c.id) || abertas.includes(c.id);
          return (
            <button
              key={c.id} type="button"
              className={`mem-carta${aberta ? ' is-aberta' : ''}${achadas.has(c.id) ? ' is-achada' : ''}${c.lado === 'termo' ? ' is-termo' : ' is-dica'}`}
              aria-label={aberta ? undefined : `Carta ${i + 1}, virada para baixo`}
              onClick={() => void virar(c.id)}
            >
              {aberta ? <span>{c.texto}</span> : <span aria-hidden="true" className="mem-verso">?</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
