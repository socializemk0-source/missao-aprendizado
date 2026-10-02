// Memória do Tico: 12 cartas viradas; cada termo tem um par com a sua dica.
// Duas cartas do mesmo par ficam abertas; se não formam par, voltam.

import { useEffect, useRef, useState } from 'react';
import type { JogoRodada } from '../../shared/game';
import { play } from '../lib/sound';

type Rodada = Extract<JogoRodada, { tipo: 'memoria' }>;

export function Memoria({ rodada, onFim }: { rodada: Rodada; onFim: (jogadas: number) => void }) {
  const [abertas, setAbertas] = useState<string[]>([]);
  const [achadas, setAchadas] = useState<Set<string>>(() => new Set());
  const [jogadas, setJogadas] = useState(0);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPares = rodada.cartas.length / 2;

  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);

  function virar(id: string) {
    const carta = rodada.cartas.find((c) => c.id === id)!;
    if (espera.current || achadas.has(carta.par) || abertas.includes(id)) return;
    const novas = [...abertas, id];
    if (novas.length < 2) {
      setAbertas(novas);
      return;
    }
    const outra = rodada.cartas.find((c) => c.id === novas[0])!;
    const feitas = jogadas + 1;
    setJogadas(feitas);
    if (outra.par === carta.par) {
      const pares = new Set(achadas).add(carta.par);
      setAchadas(pares);
      setAbertas([]);
      play('acerto');
      if (pares.size === totalPares) onFim(feitas);
      return;
    }
    setAbertas(novas);
    espera.current = setTimeout(() => {
      espera.current = null;
      setAbertas([]);
    }, 900);
  }

  return (
    <div className="memoria">
      <p className="muted memoria-info">Pares: {achadas.size} de {totalPares} · Jogadas: {jogadas}</p>
      <div className="memoria-grade">
        {rodada.cartas.map((c, i) => {
          const aberta = achadas.has(c.par) || abertas.includes(c.id);
          return (
            <button
              key={c.id} type="button" data-par={c.par}
              className={`mem-carta${aberta ? ' is-aberta' : ''}${achadas.has(c.par) ? ' is-achada' : ''}${c.lado === 'termo' ? ' is-termo' : ' is-dica'}`}
              aria-label={aberta ? undefined : `Carta ${i + 1}, virada para baixo`}
              onClick={() => virar(c.id)}
            >
              {aberta ? <span>{c.texto}</span> : <span aria-hidden="true" className="mem-verso">?</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
