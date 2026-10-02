// Cruzadinha: a grade só tem as casas das palavras; as pistas são as dicas
// do glossário. Digitar uma letra passa para a próxima casa da palavra
// escolhida. "Conferir" manda as respostas ao servidor, que diz quais estão
// certas (a resposta nunca vem para o aparelho antes).

import { useRef, useState, type KeyboardEvent } from 'react';
import type { CruzPista, JogoRodada } from '../../shared/game';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';
import { play } from '../lib/sound';
import { soLetra, tempo } from './info';
import { useCronometro } from './useCronometro';

type Rodada = Extract<JogoRodada, { tipo: 'cruzadinha' }>;
const k = (l: number, c: number) => `${l},${c}`;
const chave = (p: CruzPista) => `${p.n}${p.direcao}`;
const casasDa = (p: CruzPista) =>
  Array.from({ length: p.tamanho }, (_, i) => k(p.linha + (p.direcao === 'V' ? i : 0), p.coluna + (p.direcao === 'H' ? i : 0)));

export function Cruzadinha({ rodada, onFim }: { rodada: Rodada; onFim: () => void }) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [ativa, setAtiva] = useState<string>(chave(rodada.pistas[0]!));
  const [corretas, setCorretas] = useState<Set<string>>(() => new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const segundos = useCronometro();

  const numeros = new Map<string, number>();
  const casas = new Set<string>();
  for (const p of rodada.pistas) {
    numeros.set(k(p.linha, p.coluna), p.n);
    for (const c of casasDa(p)) casas.add(c);
  }
  const pistaAtiva = rodada.pistas.find((p) => chave(p) === ativa)!;
  const casasAtivas = new Set(casasDa(pistaAtiva));
  const casasCertas = new Set(rodada.pistas.filter((p) => corretas.has(chave(p))).flatMap(casasDa));

  function focar(casa: string | undefined) {
    if (casa) inputs.current.get(casa)?.focus();
  }

  function aoFocar(casa: string) {
    if (casasAtivas.has(casa)) return;
    const p = rodada.pistas.find((x) => x.direcao === pistaAtiva.direcao && casasDa(x).includes(casa))
      ?? rodada.pistas.find((x) => casasDa(x).includes(casa));
    if (p) setAtiva(chave(p));
  }

  function digitar(casa: string, texto: string) {
    const letra = soLetra(texto).slice(-1);
    setValores((v) => ({ ...v, [casa]: letra }));
    if (!letra) return;
    const lista = casasDa(pistaAtiva);
    const i = lista.indexOf(casa);
    if (i >= 0) focar(lista[i + 1]);
  }

  function tecla(casa: string, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Backspace' || valores[casa]) return;
    const lista = casasDa(pistaAtiva);
    const i = lista.indexOf(casa);
    if (i > 0) {
      e.preventDefault();
      setValores((v) => ({ ...v, [lista[i - 1]!]: '' }));
      focar(lista[i - 1]);
    }
  }

  function escolher(p: CruzPista) {
    setAtiva(chave(p));
    focar(casasDa(p).find((c) => !valores[c]) ?? casasDa(p)[0]);
  }

  async function conferir() {
    if (busy) return;
    setBusy(true);
    try {
      const respostas = Object.fromEntries(rodada.pistas.map((p) => [chave(p), casasDa(p).map((c) => valores[c] || ' ').join('')]));
      const r = await game.jogada(rodada.id, { respostas });
      if (r.tipo !== 'cruzadinha') return;
      const novas = r.corretas.filter((x) => !corretas.has(x)).length;
      setCorretas(new Set(r.corretas));
      if (r.completa) {
        play('acerto');
        onFim();
        return;
      }
      if (novas > 0) play('acerto');
      setMsg(`${r.corretas.length} de ${rodada.pistas.length} certas. Continue!`);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Não deu para conferir. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  const grupo = (direcao: 'H' | 'V') => rodada.pistas.filter((p) => p.direcao === direcao);

  return (
    <div className="cruz">
      <p className="muted jogo-info">⏱ {tempo(segundos)} · Toque numa casa e digite. Toque de novo para trocar de direção.</p>
      <div className="cruz-grade" style={{ gridTemplateColumns: `repeat(${rodada.largura}, var(--cruz-casa))` }}>
        {Array.from({ length: rodada.altura }, (_, l) => Array.from({ length: rodada.largura }, (_, c) => {
          const casa = k(l, c);
          if (!casas.has(casa)) return <div key={casa} className="cruz-vazia" aria-hidden="true" />;
          return (
            <div key={casa} className={`cruz-casa${casasAtivas.has(casa) ? ' is-ativa' : ''}${casasCertas.has(casa) ? ' is-certa' : ''}`}>
              {numeros.has(casa) && <span className="cruz-num" aria-hidden="true">{numeros.get(casa)}</span>}
              <input
                ref={(el) => { if (el) inputs.current.set(casa, el); else inputs.current.delete(casa); }}
                aria-label={`Linha ${l + 1}, coluna ${c + 1}`}
                value={valores[casa] ?? ''} maxLength={2} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                onFocus={() => aoFocar(casa)}
                onClick={() => {
                  // Tocar de novo na casa ativa troca H ↔ V quando ela cruza duas palavras.
                  const outra = rodada.pistas.find((x) => x.direcao !== pistaAtiva.direcao && casasDa(x).includes(casa));
                  if (casasAtivas.has(casa) && outra) setAtiva(chave(outra));
                }}
                onChange={(e) => digitar(casa, e.target.value)}
                onKeyDown={(e) => tecla(casa, e)}
              />
            </div>
          );
        }))}
      </div>
      <p className="cruz-dica-ativa"><strong>{pistaAtiva.n} {pistaAtiva.direcao === 'H' ? 'horizontal' : 'vertical'}:</strong> {pistaAtiva.dica}</p>
      <div className="cruz-acoes">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void conferir()}>Conferir</button>
        <p className="jogo-msg" role="status">{msg ?? ''}</p>
      </div>
      <div className="cruz-pistas">
        {(['H', 'V'] as const).map((d) => (
          <section key={d}>
            <h3>{d === 'H' ? 'Horizontais' : 'Verticais'}</h3>
            <ol>
              {grupo(d).map((p) => (
                <li
                  key={chave(p)} data-testid="cruz-pista" data-dica={p.dica} data-linha={p.linha} data-coluna={p.coluna} data-direcao={p.direcao}
                  className={`${ativa === chave(p) ? 'is-ativa' : ''}${corretas.has(chave(p)) ? ' is-certa' : ''}`}
                >
                  <button type="button" onClick={() => escolher(p)}>
                    <strong>{p.n}.</strong> {p.dica} <span className="muted">({p.tamanho} letras)</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
