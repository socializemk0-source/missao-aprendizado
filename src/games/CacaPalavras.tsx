// Caça-palavras: grade 10 × 10. Toque na primeira e na última letra da
// palavra (na mesma linha, coluna ou diagonal). A lista mostra as palavras
// e as dicas; o servidor confere cada palavra achada.

import { useState } from 'react';
import type { JogoRodada } from '../../shared/game';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';
import { play } from '../lib/sound';
import { tempo } from './info';
import { useCronometro } from './useCronometro';

type Rodada = Extract<JogoRodada, { tipo: 'caca' }>;
const k = (l: number, c: number) => `${l},${c}`;

export function CacaPalavras({ rodada, onFim }: { rodada: Rodada; onFim: () => void }) {
  const [inicio, setInicio] = useState<[number, number] | null>(null);
  const [achadas, setAchadas] = useState<string[]>([]);
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const segundos = useCronometro();

  async function tocar(l: number, c: number) {
    if (busy) return;
    if (!inicio) {
      setInicio([l, c]);
      return;
    }
    const [l0, c0] = inicio;
    setInicio(null);
    if (l0 === l && c0 === c) return;
    const [al, ac] = [Math.abs(l - l0), Math.abs(c - c0)];
    if (al !== 0 && ac !== 0 && al !== ac) {
      setMsg('Escolha letras na mesma linha, coluna ou diagonal.');
      return;
    }
    const [dl, dc] = [Math.sign(l - l0), Math.sign(c - c0)];
    const casas = Array.from({ length: Math.max(al, ac) + 1 }, (_, i) => [l0 + dl * i, c0 + dc * i] as const);
    const texto = casas.map(([a, b]) => rodada.grade[a]![b]).join('');
    const reverso = [...texto].reverse().join('');
    const palavra = rodada.palavras.find((p) => p.palavra === texto || p.palavra === reverso)?.palavra;
    if (!palavra) {
      setMsg(`${texto} não está na lista.`);
      play('erro');
      return;
    }
    if (achadas.includes(palavra)) {
      setMsg(`Você já achou ${palavra}.`);
      return;
    }
    setBusy(true);
    try {
      const r = await game.jogada(rodada.id, { palavra });
      if (r.tipo !== 'caca' || !r.valida) return;
      setAchadas((a) => [...a, palavra]);
      setMarcadas((m) => new Set([...m, ...casas.map(([a, b]) => k(a, b))]));
      setMsg(`Achou ${palavra}!`);
      play('acerto');
      if (r.encontradas === r.total) onFim();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Não deu para conferir. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="caca">
      <p className="muted jogo-info">Achadas: {achadas.length} de {rodada.palavras.length} · ⏱ {tempo(segundos)}</p>
      <div className="caca-esq">
        <div className="caca-grade" role="grid" aria-label="Grade do caça-palavras">
          {rodada.grade.map((linha, l) => (
            <div role="row" key={l} className="caca-linha">
              {[...linha].map((letra, c) => (
                <button
                  key={c} type="button" role="gridcell"
                  className={`caca-casa${marcadas.has(k(l, c)) ? ' is-achada' : ''}${inicio && inicio[0] === l && inicio[1] === c ? ' is-inicio' : ''}`}
                  aria-label={`Linha ${l + 1}, coluna ${c + 1}: ${letra}`}
                  onClick={() => void tocar(l, c)}
                >
                  {letra}
                </button>
              ))}
            </div>
          ))}
        </div>
        <p className="jogo-msg" role="status">{msg ?? (inicio ? 'Agora toque na última letra.' : 'Toque na primeira letra de uma palavra.')}</p>
      </div>
      <ul className="caca-lista" aria-label="Palavras para achar">
        {rodada.palavras.map((p) => (
          <li key={p.palavra} data-palavra={p.palavra} className={achadas.includes(p.palavra) ? 'is-found' : ''}>
            <strong>{p.palavra}</strong>
            <span>{p.dica}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
